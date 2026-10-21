# Yoast experience checklist

For the current detailed inventory and revised priorities, use the [2026-10-20 feature-gap and pipeline audit](yoast-gap-audit-2026-10-20.md). The short checklist below describes the initial RC surfaces; it must not be read as complete Yoast parity.

Product target: reproduce Yoast's useful WordPress authoring experience in a standalone Sanity + Next.js package. Reference evidence is recorded in the repository's `YOAST-ANALYSIS.md`; this is an implementation checklist, not a claim that every Yoast feature or Free/Premium entitlement was verified.

| Experience / behavior | 0.2.0-rc.1 | Implementation and evidence |
|---|---|---|
| Central SEO home and setup | Implemented | SEO Structure tool, Overview checklist; plugin registration and consumer Studio builds |
| Editor-managed site defaults | Implemented | Namespaced singleton or existing settings field, core normalization; settings and input tests |
| Per-type search appearance | Implemented, bounded | Title templates and indexing defaults; settings tests; public fixture HTTP output |
| Search snippet editing | Implemented, approximate | Literal overrides, inherited-value labels, desktop/mobile cards; input tests |
| Social editing and previews | Implemented, bounded | Independent sharing overrides, OG/X output and approximate cards; core/Next and HTTP checks |
| Separate SEO/readability lights | Implemented, own rules | Shared summary with textual states and coverage warnings; settings tests |
| Find and fix content issues | Implemented, bounded | Paginated Health/Optimize, field links, errors/cancellation; scan/dashboard tests |
| Review before native publish | Implemented, advisory | Workflow filtered views/checklist; derived states, no assignments or publish blockers |
| Canonical, indexing, sitemap and robots | Implemented, bounded | Shared core/Next helpers; unit and fixture HTTP checks; arbitrary extra directives deferred |
| Connected structured data | Partial | WebSite, publisher, WebPage, applicable Article/BreadcrumbList; Next tests; larger schema controls deferred |
| Full linguistic/scoring parity | Deferred | Existing English heuristics only; no Yoast-equivalent numeric score or exact title-width measurement |
| Cornerstone and internal-link guidance | Planned 0.3 | Needs cross-document coverage/link semantics |
| Redirect/slug-change manager | Planned 0.4 | Requires activated frontend/runtime behavior and cache validation |
| Reusable updates across projects | Prepared locally | Versioned archive, package verification, CI/release files; registry/hosted execution not configured |

Studio analysis does not establish live indexation, rankings, deployed HTML correctness, or production cache freshness. Real CMS/settings publication, permission behavior, and deployment checks remain a consumer rollout requirement. See [upgrade steps](upgrading-to-0.2.md) and [release procedure](releases.md).
