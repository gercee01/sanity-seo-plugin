# @gerald/seo

Implementation work follows the [step-by-step execution checklist](docs/EXECUTION-PLAN.md), starting with v0.2 stabilization and rc.2 verification.

A standalone SEO toolkit for **Sanity Studio 6 and Next.js App Router 16**. Install the same package in **both apps**, then configure each side.

| Install in | Import | What it activates |
|---|---|---|
| Sanity Studio | `@gerald/seo/sanity` | Central SEO tool, global settings, Health/Optimize/Workflow, document fields and previews. |
| Next.js frontend | `@gerald/seo/next` | Public metadata, JSON-LD, sitemap and robots output. |
| Both apps | `@gerald/seo/core` | The same configuration, defaults and content-analysis rules. |

Installing the dependency alone does not activate these features. Complete the registration and route steps below. Source repository: https://github.com/gercee01/sanity-seo-plugin. This package has not been published to npm.

Version **0.2.0-rc.3** implements the next Yoast-style Studio experience. Read the [0.1 upgrade guide](docs/upgrading-to-0.2.md), [v0.2 scope and remaining release gates](docs/v0.2-plan.md), and [release/update pipeline](docs/releases.md). This is a local release candidate; live CMS publication/cache behavior still needs project verification.

**Candidate checkpoint:** rc.3 includes the Phase 1 correctness/release-evidence fixes and Phase 2 shared scans, freshness and cancellation. The original rc.1 and verified rc.2 archives are preserved. Check `.artifacts/verification.json` for exact-archive results and `reports/phase-3-verification.md` for the workspace execution record; this packaged README alone is not verification evidence. Actual Studio/frontend upgrades remain Phase 4. See [Phase 2 verification](docs/phase-2-verification.md).

## Before you start

You need an existing Studio and Next App Router frontend. The local verification target is Windows x64 with Node 24.19.0/npm 11.17.0, Next 16.4.2, React 19.3.0, Sanity 6.19.0, Sanity UI 4.4.9, styled-components 6.6.0 and TypeScript 6.0.3. Consult the bound report for completed checks. Other accepted versions/OSes remain unverified; Node 22.12+ is an installation constraint, not a tested-support claim.

This quickstart uses a `page` document with `title`, `slug.current`, `isHomepage` and Portable Text `body`, served at `/` and `/{slug}`. If your project uses different fields, Posts, nested routes or reusable page sections, keep those and adapt the mapping in step 3. Do not replace an existing content model or renderer just to match this example.

## 1. Obtain the installable package

The current artifact is:

`C:\Users\Gerald\Side Projects\YOAST\.artifacts\gerald-seo-0.2.0-rc.3.tgz`

Install that candidate only after its verification report passes. After source changes, finalize a **new unique version** using the [release guide](docs/releases.md), then run these checks **in the plugin repository**, not in the Studio or frontend. Do not repack over the distributed rc.1 file:

```powershell
Set-Location "C:\Users\Gerald\Side Projects\YOAST"
npm ci
npm run test:package
node scripts/check-release.mjs
```

For another machine or CI, distribute the tarball and use its new path. A local absolute path in `package.json` is not portable: vendor the tarball at a repository-relative path or publish a versioned package before remote builds.

## 2. Install in Studio and frontend

Open a terminal in the **Studio folder containing its `package.json`**:

```powershell
Set-Location "C:\Users\Gerald\Projects\Sanity\sanity-studio"
npm install "C:\Users\Gerald\Side Projects\YOAST\.artifacts\gerald-seo-0.2.0-rc.3.tgz"
```

The Studio needs compatible React, Sanity, `@sanity/ui` and `styled-components`. If the latter two are missing, install the supported peers:

```powershell
npm install "@sanity/ui@4.4.9" "styled-components@6.6.0"
```

Then open a terminal in the **frontend folder containing its own `package.json`**:

```powershell
Set-Location "C:\Users\Gerald\Projects\Sanity\sanity-frontend"
npm install "C:\Users\Gerald\Side Projects\YOAST\.artifacts\gerald-seo-0.2.0-rc.3.tgz"
```

The complete loader/renderer example below uses these packages. Reuse your existing client and renderer if you already have them; otherwise install:

```powershell
npm install "@sanity/client@^8.9.0" "@portabletext/react@^8.0.1" server-only
```

Use your own application folders for future projects. Do not install Next inside Studio or Sanity Studio inside the frontend just for this plugin. Framework peers are optional at package-install time; an adapter still needs its own peers when imported.

## 3. Add the same public SEO configuration to both apps

Create `seo.config.ts` in the Studio root and `src/seo.config.ts` in the frontend with the same contents. You may share this module through your existing workspace/package setup instead.

Replace `projectId`, `dataset`, production `origin`, site name, description and publisher identity with your real values. Project ID and dataset are public configuration; API tokens do not belong in this file.

```ts
import {
  defineSeoConfig,
  mergeContent,
  portableTextContent,
  sanityImageResolver,
} from '@gerald/seo/core'

export const sanityProject = {
  projectId: 'yourproject',
  dataset: 'production',
}

export const seoConfig = defineSeoConfig({
  site: {
    origin: 'https://www.example.com',
    name: 'Example',
    description: 'A useful default description for your website.',
    publisher: {type: 'Organization', name: 'Example'},
  },
  resolveImage: sanityImageResolver(sanityProject),
  types: {
    page: {
      getPath: (document) => {
        const slug = (document.slug as {current?: string} | undefined)?.current
        return document.isHomepage ? '/' : slug ? '/' + slug : null
      },
      getContent: (document) => mergeContent(
        {
          nodes: [{
            type: 'heading',
            level: 1,
            text: String(document.title ?? ''),
            path: ['title'],
          }],
          issues: [],
        },
        portableTextContent(document.body, ['body']),
      ),
    },
  },
})
```

Add a public default sharing image as `site.image: {url: 'https://www.example.com/share.jpg', alt: 'Describe the image'}` if wanted.

The H1 in this adapter matches the renderer in step 6. For custom page sections, implement `getContent` for the headings, prose, links and images your existing renderer actually displays. See [the custom-sections example](examples/custom-sections/seo.config.mjs) in the source checkout. Do not count every string or invent headings to satisfy checks. The supplied image resolver uses a center crop; provide your project's image builder for stored crop/hotspot fidelity.

## 4. Activate the plugin in Sanity Studio

### Register it in `sanity.config.ts`

Add the import and `seoPlugin({config: seoConfig})` to your existing `plugins` array. Preserve your other plugins, workspaces and schema registration. A minimal configuration looks like:

```ts
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {seoPlugin} from '@gerald/seo/sanity'
import {schemaTypes} from './schemaTypes'
import {sanityProject, seoConfig} from './seo.config'

export default defineConfig({
  name: 'default',
  title: 'My website',
  ...sanityProject,
  plugins: [structureTool(), seoPlugin({config: seoConfig})],
  schema: {types: schemaTypes},
})
```

### Add `seoField()` to your document schema

For an existing Page schema, import `seoField` and append `seoField()` to its existing `fields` array. Keep its current fields.

For a new schema matching this quickstart, create `schemaTypes/pageType.ts`:

```ts
import {ALL_FIELDS_GROUP, defineArrayMember, defineField, defineType} from 'sanity'
import {seoField} from '@gerald/seo/sanity'

export const pageType = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'seo', title: 'SEO'},
    {...ALL_FIELDS_GROUP, hidden: true},
  ],
  fields: [
    defineField({
      name: 'title',
      group: 'content',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'slug', group: 'content', type: 'slug', options: {source: 'title'}}),
    defineField({
      name: 'isHomepage',
      group: 'content',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'body',
      group: 'content',
      type: 'array',
      of: [defineArrayMember({type: 'block'})],
    }),
    seoField({group: 'seo'}),
  ],
})
```

Ensure the Page type is registered in your existing schema index. A new `schemaTypes/index.ts` would be:

```ts
import {pageType} from './pageType'

export const schemaTypes = [pageType]
```

Register the plugin once per workspace; do not separately register another `geraldSeo` type. For a custom field name, use both `seoField: 'search'` in configuration and `seoField({name: 'search'})` in the schema.

### Start Studio and verify the field

Run the Studio's normal development command, usually `npm run dev`. Open the top-level **SEO** tool, then **Settings** to configure site identity, title templates, type indexing defaults, and social defaults. Save and publish when ready; startup never creates or publishes settings automatically. The production origin and route mappings remain in code.

Pages open on the **Content** tab. Switch to the separate **SEO** tab for Search, Social, and Advanced overrides, approximate desktop/mobile search and OG/X previews, separate SEO/readability traffic lights, and field-linked feedback. Blank overrides inherit values without copying defaults into the document. Apply the same document groups and `seoField({group: 'seo'})` to Posts and other opted-in types; assign all regular fields to Content. This is a Studio layout change and does not alter stored document paths. [Sanity field groups](https://www.sanity.io/docs/studio/field-groups)

Health, Optimize, and Workflow require a host-owned paginated `loadDocuments` callback because the package cannot infer arbitrary content queries or reference mappings. See the [upgrade guide](docs/upgrading-to-0.2.md) for a complete loader and existing Site Settings integration.

Create or choose exactly one homepage, enable `isHomepage`, and publish it. Publish another Page with a slug such as `about`. Existing content does not need a bulk migration: blank SEO overrides use fallbacks. Source content still needs publishing before the production frontend can read it.

## 5. Load SEO content in the frontend

If your frontend already loads Sanity content, extend its projections with `seo{${SEO_PROJECTION}}`, reuse its route selection and preserve its preview/cache integration. Metadata and the renderer must select the same document. The complete example below is an alternative for the simple Page model above.

Create **`src/lib/seo-data.ts`**:

```ts
import 'server-only'
import {createClient} from '@sanity/client'
import {cache} from 'react'
import {draftMode} from 'next/headers'
import {permanentRedirect} from 'next/navigation'
import {SEO_PROJECTION, SEO_SETTINGS_ID, SEO_SETTINGS_PROJECTION, normalizeSeoSettings, type SeoDocument} from '@gerald/seo/core'
import {sanityProject, seoConfig} from '../seo.config'

const client = createClient({
  ...sanityProject,
  apiVersion: '2026-10-01',
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN,
})

const projection = `{
  _id, _type, _updatedAt, title, slug, isHomepage, body,
  image{asset, alt, crop, hotspot},
  seo{${SEO_PROJECTION}}
}`

const publishedOptions = {
  perspective: 'published' as const,
  stega: false,
  cache: 'no-store' as const,
}

// Fail closed: only explicitly marked production deployments permit indexing.
export const nonProduction = process.env.SEO_DEPLOYMENT_ENV !== 'production'

export async function metadataOptions() {
  return {preview: nonProduction || (await draftMode()).isEnabled, settings: await getPublishedSeoSettings()}
}

export const getPublishedSeoSettings = cache(async () => {
  const raw = await client.fetch(
    `*[_id == $id][0]{${SEO_SETTINGS_PROJECTION}}`,
    {id: SEO_SETTINGS_ID},
    publishedOptions,
  )
  return normalizeSeoSettings(raw, seoConfig)
})

export const getHomepage = cache(async () => client.fetch<SeoDocument | null>(
  `*[_type == "page" && isHomepage == true]
    | order(_updatedAt desc)[0]${projection}`,
  {},
  publishedOptions,
))

export const getPageBySlug = cache(async (slug: string) => {
  const page = await client.fetch<SeoDocument | null>(
    `*[_type == "page" && slug.current == $slug][0]${projection}`,
    {slug},
    publishedOptions,
  )
  if (page?.isHomepage) permanentRedirect('/')
  return page
})

export async function getPublishedPages() {
  return client.fetch<SeoDocument[]>(
    `*[_type == "page" && (isHomepage == true || defined(slug.current))]${projection}`,
    {},
    publishedOptions,
  )
}
```

This loader reads published content and SEO settings only, disables stega in metadata inputs and uses `no-store` to avoid introducing a stale content cache in the quickstart. React `cache` reuses each loader result within the server render. Missing settings preserve code defaults; fetch errors propagate. If your app uses Cache Components or its own live-content caching, integrate with that established approach and test settings/document invalidation instead of transplanting this loader unchanged. Existing Site Settings integrations must query the same document/field as Studio; see the upgrade guide.

In the frontend's **`.env.local`**, use:

```dotenv
SEO_DEPLOYMENT_ENV=preview
```

Set `SEO_DEPLOYMENT_ENV=production` **only on the production deployment**. An unset value stays noindex, and nonproduction sitemap output is empty. Keep the production canonical origin in `seo.config.ts` even for local preview.

For a private dataset, supply a read-only `SANITY_API_READ_TOKEN` in the frontend's server environment. Do not prefix that variable with `NEXT_PUBLIC_` or put it in Studio/shared configuration. A public dataset can omit it.

This example does not display unpublished drafts even when Draft Mode is enabled; it only marks that response noindex. To show drafts/releases, retain your existing authenticated preview loader, fetch metadata with `stega:false`, and pass `{preview:true}`. Public machine endpoints must continue using published-only data.

## 6. Connect metadata and structured data to your pages

If these routes already exist, merge the package calls into them and keep your existing layout and renderer. The following complete files are for the basic Page example.

Create **`src/components/seo-page.tsx`**:

```tsx
import {PortableText} from '@portabletext/react'
import {SeoJsonLd} from '@gerald/seo/next'
import {resolveSeo, type SeoDocument} from '@gerald/seo/core'
import {seoConfig} from '../seo.config'
import {metadataOptions} from '../lib/seo-data'

export async function SeoPage({page}: {page: SeoDocument}) {
  const seo = resolveSeo(seoConfig, page, await metadataOptions())

  return (
    <main>
      <SeoJsonLd seo={seo} />
      <h1>{String(page.title ?? '')}</h1>
      {Array.isArray(page.body) && <PortableText value={page.body} />}
    </main>
  )
}
```

Create or update **`src/app/page.tsx`** for the homepage:

```tsx
import {notFound} from 'next/navigation'
import {createMetadata} from '@gerald/seo/next'
import {seoConfig} from '../seo.config'
import {getHomepage, metadataOptions} from '../lib/seo-data'
import {SeoPage} from '../components/seo-page'

export async function generateMetadata() {
  const page = await getHomepage()
  if (!page) notFound()
  return createMetadata(seoConfig, page, await metadataOptions())
}

export default async function HomePage() {
  const page = await getHomepage()
  if (!page) notFound()
  return <SeoPage page={page} />
}
```

Create or update **`src/app/[slug]/page.tsx`** for ordinary pages:

```tsx
import {notFound} from 'next/navigation'
import {createMetadata} from '@gerald/seo/next'
import {seoConfig} from '../../seo.config'
import {getPageBySlug, metadataOptions} from '../../lib/seo-data'
import {SeoPage} from '../../components/seo-page'

type Props = {params: Promise<{slug: string}>}

export async function generateMetadata({params}: Props) {
  const {slug} = await params
  const page = await getPageBySlug(slug)
  if (!page) notFound()
  return createMetadata(seoConfig, page, await metadataOptions())
}

export default async function ContentPage({params}: Props) {
  const {slug} = await params
  const page = await getPageBySlug(slug)
  if (!page) notFound()
  return <SeoPage page={page} />
}
```

Keep your existing root `layout.tsx`. Avoid defining a second page-specific title, canonical or JSON-LD script elsewhere for the same route. For projects without `src/`, place the same files under `app/`, `lib/` and `components/` and adjust imports.

## 7. Add sitemap and robots routes

Create **`src/app/sitemap.ts`**:

```ts
import {createSitemap} from '@gerald/seo/next'
import {seoConfig} from '../seo.config'
import {getPublishedPages, getPublishedSeoSettings, nonProduction} from '../lib/seo-data'

export default async function sitemap() {
  if (nonProduction) return []
  return createSitemap(seoConfig, await getPublishedPages(), {settings: await getPublishedSeoSettings()})
}
```

Create **`src/app/robots.ts`**:

```ts
import {createRobots} from '@gerald/seo/next'
import {seoConfig} from '../seo.config'
import {nonProduction} from '../lib/seo-data'

export default function robots() {
  return createRobots(seoConfig.site.origin, {preview: nonProduction})
}
```

Merge or replace an existing implementation deliberately; do not leave conflicting static `public/robots.txt` or `public/sitemap.xml` files for these paths.

Sitemap input must include all actual public routes, not just one page of a listing. Noindex documents, drafts/releases and canonical aliases are excluded. Add other document types/static routes through your configured adapters. A local canonical override never authorizes publishing another host's URL in your sitemap.

## 8. Verify the installation

Restart both development servers after configuration/environment changes. Start each app in its own terminal using its existing development script, commonly:

```sh
npm run dev
```

Separately, run each app's production build script, commonly:

```sh
npm run build
```

The exact Studio build script may differ from the frontend's.

| Check | Expected result |
|---|---|
| Studio Page → SEO | Editable fields, inherited-source indicators and preview/check results after an unsaved edit. |
| Published homepage `/` | Correct title/description, production canonical when indexable, and one JSON-LD graph. |
| Published Page `/about` | Its own resolved metadata and content; a missing slug returns 404. |
| Homepage's slug URL | Redirects to `/` in the example loader. |
| Local/preview response | `noindex`, no canonical; `/sitemap.xml` has no URLs and robots blocks crawling. |
| Production `/sitemap.xml` | Eligible local canonical URLs only, including the homepage. |
| Production `/robots.txt` | Sitemap URL uses the configured production origin. |
| Publish a Page with indexing set to Noindex | Public response emits noindex and the URL leaves the production sitemap. |

On a production-like test deployment, verify emitted HTML as well as Studio previews. Search engines and social platforms can display different snippets; an editor card or green check does not prove the actual output. With a cached host loader, verify updates after publish, unpublish, delete, slug changes and site-default changes.

The package has already passed its local unit/component tests and packed-consumer builds/HTTP checks. Those checks use fixture content and do not prove live authenticated CMS editing, production webhook behavior or your site's cache policy.

## Troubleshooting

| Symptom | Check |
|---|---|
| Package installed, but no SEO field | Register `seoPlugin`, add `seoField()` to the document, then restart Studio. |
| Studio preview works, website title does not change | Install/configure the frontend too; include SEO fields in the query and call `createMetadata`. |
| No SEO adapter for a document type | Add that exact `_type` to `seoConfig.types`. |
| Unavailable content checks | Supply the correct `getContent` adapter; Portable Text alone cannot describe arbitrary custom sections. |
| Image is unresolved | Confirm project/dataset, `resolveImage`, image projection and asset reference. |
| Missing module or peer-version error | Install the adapter's supported peers in that app; inspect `npm ls`. |
| Everything is noindex or sitemap is empty | Check `SEO_DEPLOYMENT_ENV`, document indexing policy, published content and routable slugs. Only the live deployment should enable indexing. |
| Existing content is missing from sitemap | Include its configured type in the host query and use the same route selection as the renderer. |
| Old metadata after publishing | Check host cache invalidation. Installing the plugin does not add a webhook. |
| Deployment cannot find the tarball | Replace a machine-specific absolute file dependency with a vendored relative tarball or published version. |

## Developing this package

Run these in the plugin repository:

```sh
npm test
npm run test:package
```

The package check also runs typecheck/unit checks, then builds/packs the release, compares archive contents to the checkout, verifies core without frameworks, and installs into two fresh locked consumers using `npm ci`. It checks public TypeScript imports, extracts schemas, builds both Studios and Next apps, then checks HTTP output for browsers/crawlers, noindex, sitemap exclusions, JSON-LD and 404s. Reports identify source/fixture hashes, toolchain versions, named checks, and the exact artifact; running/failed or outdated evidence cannot pass the release gate. Component tests simulate Studio form hooks for unsaved changes, stale context and error recovery.

Default package verification refuses to overwrite an existing versioned archive. To recheck one unchanged archive, explicitly pass its path: `npm run test:package -- .artifacts/gerald-seo-0.2.0-rc.3.tgz`. Changed source/docs require a newly versioned release candidate; rc.1 remains the preserved rollback artifact.

Artifacts and verification results are under `.artifacts/`. [Portable Text](examples/portable-text) and [custom sections](examples/custom-sections) are complete examples in the source checkout, excluded from the installable tarball; their sample documents and demonstration project ID are fixtures. After packing, run `npm install` inside an example, then its `build`, `start` or `build:studio` script. Replace the demonstration project ID before connecting a real Studio.

## API and scope

See [integration and API details](docs/integration.md) for adapter callbacks, async settings/reference context, cache/preview boundaries, schema naming, compatibility and uninstall guidance. The [Yoast experience checklist](docs/yoast-parity.md) tracks implemented, partial, and deferred behavior.

Version 0.2 RC adds a central SEO tool, editor-managed defaults, title templates, social overrides, separate SEO/readability indicators, and Health/Optimize/Workflow views. Scans use host-supplied pagination and are advisory. It retains metadata, canonical/indexing rules, linked schema, sitemap/robots helpers, and Portable Text/custom adapters. It does not include identical Yoast scoring, AI, redirect management, a multilingual language engine, approval assignments, or ranking guarantees.

The package is independently implemented and MIT licensed. The supplied WordPress reference tree retains its original licensing and is excluded from distribution.
