# Changelog

## 0.2.0-rc.3

- Connect the standalone package to `gercee01/sanity-seo-plugin` with repository metadata and the existing Windows/Linux verification workflows.
- Preserve rc.1/rc.2 and use a new candidate for post-verification documentation changes.
- Normalize Git checkout line endings and exclude the extracted Yoast reference, caches, credentials and local agent tooling from source control.
- Keep npm publication opt-in and separate from CI and consumer installation. No editor/runtime features changed from rc.2.

Candidate verification and hosted CI outcomes are recorded separately from this immutable release description.

## 0.2.0-rc.2

- Heading-only, empty and punctuation-only content now reports unavailable readability rather than becoming Ready through empty assessments; short genuine prose remains eligible.
- Overview, Health, Optimize and Workflow share scan results, filters, perspective and pagination within the current Studio session.
- Saved content/reference changes, settings/mapping changes and listener interruptions mark results stale, remove old ready counts and require refresh.
- Context loaders receive a third `{signal}` argument for cancellation; existing two-argument callbacks remain compatible. Unsaved editor context uses the draft perspective.
- Content/SEO document-tab examples retain Search/Social/Advanced groups and existing field paths; scan projections include `_rev`.
- Verification invalidates earlier success before work, binds evidence to source/docs/fixtures and exact archive bytes, and uses fresh locked consumers. Existing versioned archives cannot be overwritten.
- Updated candidate installation, compatibility, immutable verification and coordinated upgrade/rollback instructions. CI delegates type/unit/build/package gates to the verifier without duplicate runs.

Local candidate only. Consult the generated verification report for completed checks. Hosted CI, registry publication and real-project adoption/publish/cache verification are separate gates; rc.1 remains preserved.

## 0.2.0-rc.1

- Central SEO tool with Overview, Settings, Health, Optimize, and advisory Workflow views.
- Package-managed global settings singleton or reusable fields for an existing settings document; live draft-settings updates in editor previews.
- Shared validated settings merge, content-type title templates/indexing defaults, publisher identity, and social defaults across Studio/Next output.
- Search/Social/Advanced editor groups, approximate desktop/mobile and OG/X previews, independent sharing overrides, and separate SEO/readability indicators.
- Host-owned bounded content scans, publication-perspective filters, incomplete coverage labels, field links, cancellation, and per-document errors.
- Settings-aware consumer fixtures, exact-archive verification/checksum reporting, prepared CI/release workflows, and upgrade/rollback documentation.

Local release candidate. No live CMS publication/cache verification, registry publication, hosted CI execution, or consumer deployment is implied. Existing fields/defaults remain compatible; editor-managed settings require matching frontend loading before activation.

## 0.1.0

- Shared typed SEO configuration and resolution with project-specific document/route adapters.
- Portable Text extraction, custom content semantics and advisory SEO/English readability checks.
- Sanity metadata field with standard inputs, fallback indicators and reactive search/social previews.
- Next Metadata, linked JSON-LD, sitemap and robots helpers.
- Separate framework exports and two packaged consumer examples.

Initial local release; not published to a registry.
