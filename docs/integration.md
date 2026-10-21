# Integration contract and API

## Core

`defineSeoConfig(config)` validates public site/type configuration. Required: `site.origin`, `site.name`, `types[type].getPath(document)`. Each document must have `_type`; IDs are optional for explicit synthetic/static content.

`resolveSeo(config, document, {preview?, site?, settings?})` returns resolved search/social values, normalized image/content, source indicators and sitemap eligibility. `site` replaces selected legacy site defaults for this call; normalized CMS `settings` then overrides applicable values with nested publisher merging. Inputs contain public values only. Missing CMS settings preserve code defaults.

`normalizeSeoSettings(raw, config?)` validates and maps a package settings document (or host-equivalent object) into `SeoSettings`. Pass the config's image resolver for stored Sanity assets. Inputs include `site`, `separator`, `contentTypes[]{type,titleTemplate,indexing}` (or normalized `types`), and `social{card,site}`. CMS production origins are rejected. Blank optional strings inherit; invalid enums, templates, media URLs, and duplicate type settings fail visibly. `SEO_SETTINGS_ID`, `SEO_SETTINGS_TYPE`, and `SEO_SETTINGS_PROJECTION` support host-owned queries.

Title templates allow `{title}`, `{siteName}`, and `{separator}`. A literal document title override takes precedence. Indexing precedence is document override, CMS type setting, adapter default, then index; preview/draft safeguards take priority. Document `social{title,description,image,card}` overrides fall back to resolved search/content/site values. JSON-LD keeps search/content values rather than using independent sharing text.

Document adapters can supply `getTitle`, `getDescription`, `getImage`, `getSeo`, `getContent`, `getAuthor`, `getPublishedAt`, `getModifiedAt` and `getBreadcrumbs`. Default title/image/SEO/date fields are `title`, `image`, `seo` (or configured `seoField`), `publishedAt` and `_updatedAt`. Default kind is page, default indexing is index. Return `null` from `getPath` for unroutable documents.

Callbacks receive the current document. Adapters must be deterministic and side-effect free. Resolve remote data before calling core. Dates must be parseable date strings; prefer ISO timestamps. `kind: 'article'` enables Article schema; real authors are `{name,url?}`. Breadcrumbs are `{name,path}[]`; more than one item enables BreadcrumbList.

SEO overrides: `title`, `description`, `image`, `canonicalUrl`, `indexing` (`inherit`, `index`, `noindex`), `focusKeyphrase`. Whitespace-only string overrides inherit. Description falls back to a mapped description, first analyzed paragraph, then site default. Title overrides are exact; content-title fallbacks get one ` | Site` suffix. The Next title is absolute so layout templates do not append another suffix.

Images normalize to `{url,alt?,width?,height?}`. Use `resolveImage` for raw Sanity images. The supplied `sanityImageResolver({projectId,dataset})` works without SDK dependencies, uses 1200×630 center crop and ignores stored crop/hotspot. Use the existing project's image URL builder for full crop handling. Local image paths must be converted to absolute HTTP(S) URLs.

`portableTextContent(value, sourcePath?)` returns `{nodes,issues}`. It preserves paragraph/heading text, link marks and array item keys. Resolve internal-link annotations to `href` before calling it. Custom block objects and inline objects are disclosed as unsupported. `mergeContent(...parts)` combines adapters. Do not feed every document string into analysis.

Content nodes are `paragraph {text}`, `heading {text,level}`, `link {text,href?}` and `image {alt?,decorative?}`, each with optional Sanity `path`. Image/link nodes are analyzed but do not double-count prose. The host must include actual renderer-generated headings. `analyzeSeo(resolved)` returns check IDs, categories, statuses, messages and optional source paths. Readability is calibrated for English; length targets are advisory approximations.

## Sanity context and references

`seoPlugin({config, loadContext?, settings?, loadDocuments?})` registers the `geraldSeo` object/input, central SEO tool, and by default a package-managed settings singleton. `seoField({name?,title?,description?,group?})` explicitly adds a field to your document. The configured SEO field name and schema field must agree. Existing documents need no bulk mutation. `settings: false` disables CMS settings loading/navigation; `{documentId,schemaType,field?}` uses an existing settings document. `seoSettingsField()` embeds the reusable settings object there. See the [upgrade guide](upgrading-to-0.2.md).

For existing settings/reference resolution, `loadContext(currentDocument, client, {signal})` may return `{document?,site?,settings?}` asynchronously. Existing callbacks accepting only the first two arguments still work. Forward the signal to reference fetches (`client.fetch(query, params, {signal})`) to cancel unnecessary work. It receives the unsaved document in the editor, not a freshly fetched published copy. Enrich that argument; do not overwrite edits with old fetched values. Returned `settings` replace the package-loaded settings for that call. The input aborts superseded requests and discards stale responses even if the callback ignores cancellation. Catch/recover errors in the loader only when a meaningful fallback is appropriate; otherwise the input displays an error while preserving editing. During dashboard scans the client uses the selected published/drafts perspective; do not hard-code an incompatible perspective in the callback.

Cache settings and reference requests in the host rather than querying on every keystroke. The same mapping/default values must reach Next loaders. Do not put server secrets into public configuration or expose write tokens in Studio configuration.

Source paths are exported with check results and linked through Studio edit intents. The central dashboard requires `loadDocuments({client,cursor,limit,perspective,signal}) => {documents,nextCursor?}`. The host owns projections/reference enrichment. Pages contain at most 25 documents with IDs/types and advance a stable cursor; omission of `nextCursor` marks completion. Include `_rev` in projections for explicit saved-revision identity; otherwise the scanned document's serialized values identify that snapshot.

Overview, Health, Optimize and Workflow share an in-memory scan session, perspective, pagination and filters for the configured plugin/project/dataset/user. Navigating between them does not rescan. Returning from an editor retains rows; a monitoring gap marks them stale until **Refresh scan**. Reloading Studio starts a new session. Switching perspective clears rows to avoid mixing draft and published evidence.

Scans require an active content listener. Saved content/reference mutations, changed settings, changed mappings or a listener disconnect invalidate results, cancel pending work and remove stale rows from ready counts. Stale rows keep their document links but hide old traffic lights/checks; select the Stale status filter to find them. Because arbitrary host context loaders can depend on any document, eligible dataset mutations conservatively invalidate the whole scanned set. Published scans ignore draft/release mutations; draft scans include draft and published changes. Changes only in a host's external service/cache need a manual refresh. Scans are explicit and paginated, not stored editorial approvals. Open-document feedback follows unsaved edits.

`summarizeSeo(checks)` computes separate SEO/readability traffic lights plus advisory review state. Unavailable checks remain incomplete rather than passing; intentional noindex is informational. `reviewSeoDocument` analyzes intended published output and converts per-document failures into incomplete results without weakening public draft protections. `seoCheckPriority` orders problem/coverage/metadata/content/readability feedback. No score predicts rankings, and Ready to review is not human approval or a second publishing state.

`loadSeoSettings` from `/sanity` is a Studio integration helper with explicit perspective selection. Next server loaders should fetch using their own client and core normalization/projections, keeping Studio imports out of their runtime graph.

Uninstall: removing the dependency does not delete stored fields. Retain an equivalent object schema when removing the UI so editors can still manage existing data. Rename/move stored fields with an explicit migration; changing `seoField` does not migrate documents automatically.

## Next publication, routes and caching

`createMetadata(config, document, options?)` resolves and returns Next Metadata. `toMetadata(resolved)` adapts already resolved values. `buildJsonLd(resolved)` returns the graph; `serializeJsonLd(graph)` safely serializes it; `<SeoJsonLd seo={resolved}/>` renders a script. Render structured data from a Server Component with the same document/visibility rules as page content. No API fetch or secret is bundled by these helpers.

`createSitemap(config, documents, options?)` returns `MetadataRoute.Sitemap`. Unknown types, null routes, drafts/release versions, noindex and canonical aliases are excluded. Duplicate canonical URLs retain the latest provided timestamp. All documents must represent routes actually rendered by the host. Resolve historical slug collisions and redirects before supplying them; package deduplication cannot choose which document the route serves. Static routes can be represented by an explicit configured synthetic document type. Do not use only the first page of a listing query. The host must split inventories above 50,000 URLs using Next's sitemap-index conventions; this release does not paginate automatically.

Supply **published-only** documents to public machine endpoints. The package additionally excludes IDs beginning `drafts.` or `versions.` as a safeguard; IDs are not a substitute for authenticated access control. Scheduled publication semantics, protected documents and routability belong to the host loader. If a future-dated document is not yet publicly available, exclude it there.

`createRobots(origin,{preview?,disallow?})` returns `MetadataRoute.Robots`; preview blocks all and omits sitemap. Also pass `{preview:true}` to metadata resolution in preview/staging environments. The package never guesses environment from request hostnames.

Production canonical origin is validated and fixed. Routes are absolute pathnames without whitespace/query/fragment; trailing slash policy is supplied by the host. Canonical overrides are absolute HTTP(S) without credentials; core removes fragments and preserves explicit queries. Studio disallows fragments to keep authored URLs unambiguous. Canonical aliases stay out of the sitemap. Noindex omits canonical, following the selected documented policy.

Request metadata with `stega:false` (or clean it with the installed Sanity tooling) even when using draft/release perspective. The package does not strip arbitrary Unicode joiners from natural-language content. Never pass preview cookie perspectives into shared public sitemap caches.

Caching is owned by the consuming application. With the installed Next/next-sanity APIs, invalidate document route output plus sitemap on publish/unpublish/delete/slug change; invalidate all affected routes plus sitemap on site-default changes. Use your existing live-content/tag integration or a verified, authenticated webhook. Mounting a preview component does not prove sitemap invalidation. If using time-based cache revalidation instead, document its delay and test it. CMS failures must propagate/recover explicitly; do not catch them into an empty successful sitemap.

Missing documents stay `notFound()` in the host. Metadata must select the same Page/Post as the renderer, using the same collision precedence. Do not expose unpublished content because an analysis helper can resolve it.

## Compatibility and verification boundaries

Modern ESM only. Core imports require no framework packages. Other entry points require their documented optional peers. rc.3's local verification used Windows x64, Node 24.19.0/npm 11.17.0, React/React DOM 19.3.0, Sanity 6.19.0, Sanity UI 4.4.9, Next 16.4.2, styled-components 6.6.0 and TypeScript 6.0.3. [Hosted CI](https://github.com/gercee01/sanity-seo-plugin/actions/runs/39573895942) also passed the Windows/Linux matrix for candidate commit `67738e2`. Only completed checks in the bound reports constitute verified support. Manifest peer/engine ranges permit installation but do not claim tested support for their lower bounds or every accepted version. Node 22, React 19.2 and other version combinations remain unverified; see the [release guide](releases.md).

The examples use local fixture content and a demonstration Sanity project ID. Build/package/HTTP checks do not prove live CMS publication, authenticated editing, release-perspective cache isolation or production webhook behavior. Validate those on the real project before deployment. No remote Yoast service is called.
