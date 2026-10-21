# sanity-plugin-seo compared with @gerald/seo

Reviewed 2026-10-20. The other plugin offers a broader Studio interface. Our package has a more direct fit for the tested Sanity 6 + Next 16 setup because its Studio and frontend use the same resolver. Neither conclusion establishes overall production quality or search-ranking performance.

## Evidence boundary

- Requested listing: [Sanity SEO Plugin](https://www.sanity.io/plugins/sanity-seo-plugin), maintained by Bhargav Patel. Its npm package name is `sanity-plugin-seo`.
- Inspected public repository: [bhargav-bkpatel/sanity-plugin-seo](https://github.com/bhargav-bkpatel/sanity-plugin-seo), commit `d20f7e2d2851bceae29c2b1cfe9858fc72ae2039`, dated 2026-07-21. Its manifest identifies version **1.4.6**.
- Our inspected version: **@gerald/seo 0.1.0**, in this workspace. Source and recorded consumer-verification results were read; the full application test suite was not rerun for this comparison.
- The npm registry request was denied with EACCES, so repository code was not matched against the latest published tarball. Repository version is not asserted to be the current npm release.
- The third-party Studio, hosted licensing and AI services were not installed or exercised. Two inspected pure utilities, SEO scoring and readability, were invoked locally after reading their source. No paid service was called.
- Their source snapshot is retained under `.artifacts/research/sanity-plugin-seo`, outside our package's release allowlist. No plugin implementation was changed.

## Feature comparison

| Area | sanity-plugin-seo: inspected code/documentation | @gerald/seo: current implementation |
|---|---|---|
| Distribution | npm installation documented; ESM and CommonJS exports declared. | Local installable tarball; separate ESM `/core`, `/sanity`, `/next` exports. Not registry-published. |
| Sanity compatibility | Manifest accepts Sanity 3/4/5, UI 3 and React 18/19. Sanity 6 is outside the declared peer range. | Targets Sanity 6/UI 4 and React 19; recorded fixture checks used Sanity 6.19.0 and Next 16.4.2. |
| Editor organization | Basic, Social, Advanced and Schema groups, live indicators and visual scoring. | Standard inputs with inherited-source labels and a single preview/guidance panel. Less organized for larger feature sets. |
| Metadata | Authored search title/description, focus keyword and additional keyword fields. | Search title/description/keyphrase, central site/type/content defaults and optional overrides. |
| Social | Separate Open Graph and X fields; X/Facebook/LinkedIn/WhatsApp preview components. | One image override and generic social preview. OG/X output inherits resolved search metadata. No independent social title/description/account controls yet. |
| Robots | Additional directives such as nofollow, noarchive and nosnippet. | Inherit/index/noindex, preview protection and a frontend helper that currently always emits follow. |
| Canonical | No dedicated canonical field or shared canonical/sitemap policy found in the inspected `src` tree. Host integration still determines final output. | Validated canonical override, self-canonical resolution and alias/noindex sitemap rules. |
| International SEO | hreflang fields and meta-tag preview output. | Configurable language for analysis/schema; no hreflang/alternate-language feature. |
| SEO score | Weighted 0–100 metadata-completeness score. | Individual good/review/info/unavailable results; no numeric overall score. |
| Readability | Numeric Reading Ease implementation with heuristic syllable counting. Listing describes a grade-level score, which differs from the inspected formula. | English sentence/paragraph/subheading/repeated-start checks; no numeric grade. |
| Custom content | Convenient configurable body paths, including nested arrays, flattened into text. | Explicit semantic content adapters preserving heading/link/image roles and source paths. More integration work, but closer alignment with custom renderers. |
| Frontend integration | Framework recipes documented. Root exports inspected do not expose a dedicated Next Metadata/sitemap/robots adapter. | Actual typed Metadata, connected JSON-LD, sitemap and robots helpers share core resolution with Studio previews. Host still owns loading/caching. |
| Structured data | Schema wizard/JSON-LD preview code exists behind Pro checks; public documentation marks Pro coming soon. Availability unverified. | Limited WebSite/publisher/WebPage/Article/BreadcrumbList output, based on configured factual content; no schema wizard. |
| AI | Browser UI invokes OpenAI/Anthropic/Groq utilities with configured provider keys. | Not implemented; local advisory analysis does not need AI credentials. |
| Dashboard/bulk/workflow | Source exists with Pro gates and license integration. Public docs label these coming soon; not counted as generally available features. | Not implemented. |
| Verification | Bounded `test/` inventory contains two helper-test files; no comparative runtime verdict is inferred from this count. | Recorded 28 unit/component checks and two consumer Studio/Next builds plus HTTP checks; live CMS/production cache behavior remains unverified. |

Primary sources: [manifest](https://github.com/bhargav-bkpatel/sanity-plugin-seo/blob/d20f7e2d2851bceae29c2b1cfe9858fc72ae2039/package.json), [schema](https://github.com/bhargav-bkpatel/sanity-plugin-seo/blob/d20f7e2d2851bceae29c2b1cfe9858fc72ae2039/src/schemas/Schema.ts), [entry exports](https://github.com/bhargav-bkpatel/sanity-plugin-seo/blob/d20f7e2d2851bceae29c2b1cfe9858fc72ae2039/src/index.ts), [social preview components](https://github.com/bhargav-bkpatel/sanity-plugin-seo/blob/d20f7e2d2851bceae29c2b1cfe9858fc72ae2039/src/components/SocialPreviewCard.tsx), [body extraction](https://github.com/bhargav-bkpatel/sanity-plugin-seo/blob/d20f7e2d2851bceae29c2b1cfe9858fc72ae2039/src/utils/resolveBodyContent.ts).

Our corresponding files: `package.json`, `src/core/types.ts`, `src/core/resolve.ts`, `src/core/content.ts`, `src/core/analyze.ts`, `src/sanity/index.tsx`, `src/sanity/input.tsx`, `src/next/index.tsx`, `tests/`, `.artifacts/verification.json`.

## What their scoring actually establishes

`src/utils/seoScore.ts:17-199` awards points for title length (25), description length (25), keyword occurrence in those fields (20), configured Open Graph fields (20), and an X card type (10). Body content, headings, links, image alt, canonical/routability and actual frontend HTML do not enter this function.

A local pure-function probe reached 100 using those five conditions, without any body content, including when noindex was set. This is not itself a noindex defect: noindex can be intentional. It demonstrates that the number measures metadata conditions, not indexability, content quality or deployment correctness. Our checks are also heuristics; having more checks does not establish better rankings.

Their `src/utils/readability.ts:29` uses the Reading Ease formula beginning with 206.835, with an English-oriented syllable heuristic. It is not the Flesch-Kincaid grade-level calculation described by the listing. The inspected utility returned approximately 98.25 for a short, simple English sample. That verifies one code path, not linguistic accuracy.

Sources: [SEO score](https://github.com/bhargav-bkpatel/sanity-plugin-seo/blob/d20f7e2d2851bceae29c2b1cfe9858fc72ae2039/src/utils/seoScore.ts), [readability utility](https://github.com/bhargav-bkpatel/sanity-plugin-seo/blob/d20f7e2d2851bceae29c2b1cfe9858fc72ae2039/src/utils/readability.ts).

## Implementation cautions worth learning from

### AI credentials are browser-accessible in the documented design

The UI imports `generateSEOContent`; the utility issues direct provider fetches with the configured key. Anthropic requests explicitly enable direct browser access. The listing's `SANITY_STUDIO_` key configuration is consistent with a browser bundle. This supports the inference that a configured provider key is accessible to someone with access to that Studio client. It is not evidence that any particular deployed key has leaked or been abused.

If we add AI, keep credentials in an authenticated server-side endpoint, with explicit user application of suggestions and appropriate usage limits. Our lack of AI avoids this particular credential flow, but does not make our entire package more secure by default.

Sources: [UI caller](https://github.com/bhargav-bkpatel/sanity-plugin-seo/blob/d20f7e2d2851bceae29c2b1cfe9858fc72ae2039/src/components/AIGenerateButton.tsx), [provider requests, lines 77-132](https://github.com/bhargav-bkpatel/sanity-plugin-seo/blob/d20f7e2d2851bceae29c2b1cfe9858fc72ae2039/src/utils/aiGenerate.ts#L77).

### A GEO check does not inspect the website's structured data

`src/components/GEOChecklist.tsx:14-24` hard-codes the structured-data item to pass. It does not fetch or validate rendered JSON-LD. We should not copy that as a successful technical check, and should not present a simple checklist as measured AI-search visibility. Our Studio preview also cannot prove emitted HTML; the recorded HTTP fixture checks cover only their example deployments.

Source: [GEO checklist](https://github.com/bhargav-bkpatel/sanity-plugin-seo/blob/d20f7e2d2851bceae29c2b1cfe9858fc72ae2039/src/components/GEOChecklist.tsx#L14).

### Some inherited values are written into the edited document

The inspected title/description inputs query a hard-coded `homePage` type when their value is blank. The title effect then applies a field patch. That creates schema-specific coupling and can turn an inherited fallback into a persisted override. We should retain our configurable, non-writing fallback resolution instead of adopting this input behavior.

Source: [title input, lines 30-41](https://github.com/bhargav-bkpatel/sanity-plugin-seo/blob/d20f7e2d2851bceae29c2b1cfe9858fc72ae2039/src/components/SEOTitleFeedback.tsx#L30).

### Pro code is not proof of a released service

The repository registers dashboard tools by default, but their content uses Pro gates. Source presence and a successful hypothetical license state do not establish that purchases, entitlement validation, all schema forms or workflows currently work. Treat the public coming-soon label as the availability boundary until actual release/runtime verification.

Sources: [plugin registration](https://github.com/bhargav-bkpatel/sanity-plugin-seo/blob/d20f7e2d2851bceae29c2b1cfe9858fc72ae2039/src/plugin.ts), [dashboard gate](https://github.com/bhargav-bkpatel/sanity-plugin-seo/blob/d20f7e2d2851bceae29c2b1cfe9858fc72ae2039/src/components/pro/SEODashboardPane.tsx#L482).

## Recommended changes to ours

1. **Organize the editor panel.** Basic/Social/Advanced groups, concise category summaries and clearer optional/inherited states. Preserve standard Sanity inputs and accessibility. This gives the clearest immediate authoring improvement.
2. **Add independent social overrides.** Optional social title/description and X site/creator/card settings, falling back through the existing resolver. This must reach schemas/types, resolver, preview, Next adapter and backward-compatibility fixtures together.
3. **Offer conventional content-adapter presets.** Make ordinary Portable Text setup easier while preserving semantic extraction and explicit custom-section coverage. Keep route mapping configurable. Their body-path convenience is useful; flattening alone cannot replace our block adapters.
4. **Expand robots/hreflang only for a real consumer requirement.** Inherit/index/noindex already covers the initial need. A multilingual project would justify validated alternate-language mappings and matching Next output; labels alone are insufficient.
5. **Make distribution reproducible.** Keep the two-consumer gate, choose/confirm the package scope and publish a version when authorized, or vendor a relative tarball. Our current registry and version support are narrower than their advertised install path.
6. **Defer large optional systems.** AI, bulk editing, workflow dashboards and dozens of schema types add credentials, persistence, permissions and maintenance. Add the particular feature a real project needs after the core/editor improvements.

A numeric completeness score can be optional later. It should explain its inputs, distinguish incomplete analysis from passing checks, and never claim ranking or AI-citation prediction.

## Recommendation

Keep our shared-core/Next integration for the current Sanity 6 + Next 16 projects and use this competitor as a reference for editor organization and social controls. Their broader interface is a real advantage; our first version has substantially less authoring polish and fewer fields.

Switching to their plugin is not a drop-in change: the stored field names/policies differ, their declared peers exclude Sanity 6, and their current root exports do not replace our Next helpers. A migration or wrapper would need deliberate mapping and runtime verification. Neither source inspection nor this comparison justifies claiming that ours produces better search performance.

Skipped full third-party installation, live Studio interaction, hosted AI/licensing calls and latest-npm-tarball verification. The main risks in a replacement decision are compatibility, stored-data migration and confusing previews/completeness scores with actual frontend correctness.
