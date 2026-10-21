# Upgrade from 0.1, rc.1 or rc.2 to 0.2.0-rc.3

This release candidate adds the central SEO experience: Overview, Settings, Health, Optimize, and Workflow, plus grouped document fields, independent sharing overrides, title templates, and separate SEO/readability indicators. The goal remains the Yoast editorial experience on Sanity + Next.js. It is not a claim of full Yoast feature/scoring parity.

From rc.1 or rc.2, retain the existing schemas, configuration and authored SEO data. Replace the dependency archive and lockfile in both apps. rc.2 adds shared scan/freshness handling and fixes false green readability; the third `loadContext` argument is additive. Include `_rev` in host scan projections when available. A reconnecting content listener is required before scanning. See the [changelog](../CHANGELOG.md) and [release guide](releases.md).

## 1. Install the same candidate in both apps

The package maintainer verifies a newly versioned candidate in its repository. For an existing immutable candidate, pass its path explicitly; do not repack it:

```powershell
npm run test:package -- .artifacts/gerald-seo-0.2.0-rc.3.tgz
node scripts/check-release.mjs
```

Copy `.artifacts/gerald-seo-0.2.0-rc.3.tgz` into each consumer's `vendor` folder. Run this separately in Studio and the Next.js frontend:

```powershell
npm install --save-exact ./vendor/gerald-seo-0.2.0-rc.3.tgz
```

Commit the dependency path, tarball, and lockfile in the consumer project. Restart Studio and the frontend. Registry installation is not available until the package is published. No stored document migration is required for the additive fields in this candidate.

## 2. Choose a settings home

Existing registration continues to work:

```ts
seoPlugin({config: seoConfig, loadContext: loadSeoContext})
```

The default registration adds a top-level **SEO** tool and a native **Settings** singleton form, backed by document ID/type `geraldSeoSettings`. Saving/publishing happens through Sanity's controls. Startup never creates data. Document previews use draft settings; public frontend queries must use published settings. Missing settings preserve code defaults, while loading/validation failures are visible errors.

Keep production origin, routes, custom content semantics, and environment protection in `seo.config.ts`. Do not move private tokens into Studio configuration.

For an existing Site Settings document, add the package's reusable settings field to that schema:

```ts
import {seoSettingsField} from '@gerald/seo/sanity'

// Inside the existing Site Settings fields array:
seoSettingsField({name: 'seoDefaults', title: 'SEO defaults'})
```

Then register the existing document explicitly:

```ts
seoPlugin({
  config: seoConfig,
  loadContext: loadSeoContext,
  settings: {
    documentId: 'siteSettings', // use the actual published singleton ID
    schemaType: 'siteSettings',
    field: 'seoDefaults',
  },
})
```

This mode registers the reusable settings object, not a competing settings document. The Settings menu opens your existing document. Preserve your existing singleton configuration and native permissions. `settings: false` retains code-only defaults and omits the Settings menu.

If your project already maps differently shaped settings, `loadContext` may return normalized `settings` as well as `document` and `site`. Returned `settings` replace the package-loaded settings for that analysis call. Configure `settings: false` if the callback is the sole settings source. Keep the same mapping in Next.js. Existing `{document, site}` callbacks remain supported.

## 3. Enable content scans

For a separate document SEO tab, declare Content (default) and SEO groups on Page/Post, hide the combined All fields group, assign regular fields to Content, and use `seoField({group: 'seo'})`. The [README schema example](../README.md#4-activate-the-plugin-in-sanity-studio) shows the layout. This changes only Studio organization; existing `seo` paths and frontend queries stay the same.

The package cannot infer every custom schema/query. Supply a bounded, stable loader. This complete example assumes Page/Post with `title`, `slug`, `isHomepage`, `body`, `sections`, and `seo`; select only the source fields your adapter needs, and resolve internal references as your renderer does.

```ts
import {seoPlugin, SEO_PROJECTION, type SeoPluginOptions} from '@gerald/seo/sanity'

const loadDocuments: NonNullable<SeoPluginOptions['loadDocuments']> = async ({
  client, cursor, perspective, signal,
}) => {
  const documents = await client.withConfig({perspective}).fetch(
    `*[_type in ["page", "post"] && (!defined($cursor) || _id > $cursor)]
      | order(_id asc)[0...25]{
        _id, _type, _updatedAt, title, slug, isHomepage, body, sections,
        seo{${SEO_PROJECTION}}
      }`,
    {cursor: cursor ?? null},
    {signal},
  )
  return {
    documents,
    nextCursor: documents.length === 25 ? documents.at(-1)?._id : undefined,
  }
}

// Preserve your existing loadContext and optional settings configuration.
seoPlugin({config: seoConfig, loadContext: loadSeoContext, loadDocuments})
```

The request includes `limit: 25`; loaders must return at most that many documents. Return no `nextCursor` after the last page. An exact-size last page may require one final empty fetch to establish completion. Avoid offset pagination or unstable ordering. A synthetic configured type without stored documents needs an explicit host representation if you want it scanned.

Review perspective is selected in the tool: Published uses published content/settings; Draft uses the draft perspective, which includes published fallback. The tool labels the perspective rather than claiming every returned row has an unpublished draft. `loadContext` receives a client with the selected perspective during scans; a callback must not hard-code a conflicting perspective. Open-document previews still receive the current unsaved form value.

Scans are explicit and paginated, with cancellation and per-document errors. In rc.3, Overview/Health/Optimize/Workflow share results, filters, perspective and progress. Counts cover scanned records until completion. Saved content/reference or settings changes mark results **Stale** and require **Refresh scan**; stale rows cannot count as ready. An active content listener is required to scan. Returning from an editor retains rows but marks them stale if monitoring paused; reloading Studio clears the in-memory session. Health finds issues, Optimize links to fields, and Workflow filters Needs attention / Incomplete / Ready to review / Stale. No second publication status or automatic content rewriting is introduced. Optional third-argument `{signal}` support in `loadContext` lets reference fetches cancel promptly; existing two-argument callbacks remain compatible.

## 4. Read the same published settings in Next.js

Use **core** helpers in server loaders; do not import the Studio entry point into the frontend. Retain your existing client and cache policy. A package-managed settings loader can look like:

```ts
import 'server-only'
import {cache} from 'react'
import {SEO_SETTINGS_ID, SEO_SETTINGS_PROJECTION, normalizeSeoSettings} from '@gerald/seo/core'
import {client} from './sanity-client'
import {seoConfig} from '../seo.config'

export const getPublishedSeoSettings = cache(async () => {
  const raw = await client.fetch(
    `*[_id == $id][0]{${SEO_SETTINGS_PROJECTION}}`,
    {id: SEO_SETTINGS_ID},
    {perspective: 'published', stega: false, cache: 'no-store'},
  )
  return normalizeSeoSettings(raw, seoConfig)
})
```

For the existing Site Settings example, query its actual ID with:

```groq
*[_id == $id][0].seoDefaults{
  site{name, description, language, image{asset, alt, crop, hotspot},
    publisher{name, type, logo{asset, alt, crop, hotspot}}},
  separator, contentTypes[]{type, titleTemplate, indexing}, social{card, site}
}
```

Use the same settings for every output that depends on them:

```ts
const settings = await getPublishedSeoSettings()
const options = {settings, preview: isPreviewDeployment || isDraftMode}

createMetadata(seoConfig, document, options)
resolveSeo(seoConfig, document, options) // pass the result to SeoJsonLd
createSitemap(seoConfig, publishedDocuments, {settings, preview: isPreviewDeployment})
```

Keep the existing published-only sitemap loader. Include the expanded `SEO_PROJECTION` in page/post queries so `social` overrides reach public output. Regenerate host types if applicable. Core deep-merges partial publisher settings, validates CMS values, and prevents CMS settings from replacing the production origin.

The quickstart's `no-store` avoids persistent stale settings. With persistent caching, refresh affected routes and sitemap on content changes and all affected route/settings caches on global settings changes. Test publish, unpublish/delete, and old/new slug paths. The plugin cannot invalidate arbitrary host caches for you. See [integration details](integration.md).

## 5. Verify and roll out

1. Build/typecheck both apps with the candidate, preserving existing renderer/routing behavior.
2. Open SEO → Settings and a Page/Post SEO panel. Check keyboard editing and inherited values.
3. Change a draft setting and verify its draft preview; the public frontend must still use published values.
4. Publish a harmless setting and verify matching public title/social/schema output and cache refresh.
5. Scan content, filter issues, follow a source link, edit, recheck, and publish with native controls.
6. Verify sitemap/indexing, preview noindex, unpublish/delete and slug changes.

Deploy frontend support before activating new editor-managed settings, then deploy Studio. Keep both dependencies at the same exact candidate. This repository's fixtures simulate content; they do not prove your live CMS or production cache behavior.

For rollback, revert both dependency/configuration changes and restore the previous app deployments. Restore settings only if changed values caused the regression. Older code ignores additive fields but older Studio schemas may report unknown fields; retain additive definitions or document that limitation while rolling back. Do not delete authored SEO content to uninstall the UI.
