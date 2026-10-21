# SEO plugin execution checklist

Updated: 2026-10-21. This is the ordered checklist for the implementing agent to follow and update. Product goal: reproduce the useful **Yoast WordPress experience** as a standalone plugin for future Sanity + Next.js projects.

**Current checkpoint (2026-10-21):** **Steps 1–11 are complete for local/vendor tarball delivery.** The standalone plugin is on [GitHub](https://github.com/gercee01/sanity-seo-plugin). rc.3 passed local exact-archive gates and [hosted Windows/Linux CI](https://github.com/gercee01/sanity-seo-plugin/actions/runs/39573895942) for commit `67738e2ef5595db2b555f1fec14c6a6ee1ccae90`; rc.1/rc.2 are preserved. **Next: Phase 4, Step 12**, the coordinated Studio/frontend upgrade. Both actual apps still use rc.1. npm publication is optional and has not been performed. See [repository/CI evidence](../reports/github-setup-and-ci.md), the [Phase 3 record](../reports/phase-3-verification.md), [Phase 1 verification](phase-1-verification.md) and [Phase 2 verification](phase-2-verification.md).

This workspace checklist was updated after rc.2 verification. The copy inside the existing tarball remains its original pre-verification snapshot. The preserved `.artifacts/phase3/verification.json` certifies that archive and its recorded inputs; it does not certify subsequent workspace documentation changes. Follow the [release/evidence rules](releases.md) before producing another candidate.

The extracted [`plugins/`](../plugins/) folder is the primary behavior reference. The [feature-gap audit](yoast-gap-audit-2026-10-20.md) explains findings R01–R06 and the [84-entry backlog](../reports/yoast-feature-gaps-2026-10-20.json) records missing, partial, and conditional capabilities.

## How to use this checklist

- Work in order. Finish the current phase's checks before advancing to its release gate.
- Check a box only after implementation and its stated validation pass. Record commands/results, relevant paths, and evidence in the log below.
- Keep this workspace checklist current. Preserve verified archives/reports unchanged; later checklist edits belong to subsequent source work and must not be repacked under an already-used version.
- Preserve existing consumer changes and distributed archives. Recheck current source/runtime before editing; do not assume the audit snapshot remains current.
- If a check cannot run, record the exact limitation and leave the step unchecked. Fixture tests, live CMS checks, hosted CI, registry publication, and deployment are different evidence.
- Keep the core engine reusable. Consumer-specific routes, content mappings, clients, credentials, and caches stay in the consumer integration.

## Phase 1 — fix correctness and verification

- [x] **1. Establish the current baseline.** Read the current package/version, applicable instructions, working changes, source, archive, and verification report. Preserve rc.1 and capture archive/source/fixture identities before editing. Reproduce the audit's heading-only readiness case. **Done when:** current facts, reproduction, and intended changes are recorded; unrelated work and old artifacts remain intact.

- [x] **2. Fix false green readability/readiness — R01 / A20.** Start in `src/core/analyze.ts` and review `review.ts` callers. Require sufficient relevant text for each assessment: zero paragraphs/sentences cannot earn prose-based passes. Add regression cases for heading-only, empty/unsupported content, and genuine analyzable prose; retain language/coverage warnings. Do not require long body copy on every page. **Done when:** heading-only content reports unavailable readability and cannot be Ready through empty assessments; valid existing cases still pass.

- [x] **3. Invalidate stale release evidence — R03.** Update `scripts/verify-package.mjs` and `check-release.mjs`. Invalidate prior success at run start; write successful evidence atomically after all required checks. Cover a failed run following a successful one. **Done when:** standalone release validation rejects the failed/current run rather than accepting an old report; successful runs still validate their exact archive.

- [x] **4. Bind verification to its actual inputs — R02.** Record UTC time, source identity, package version, archive checksum, fixture/input hashes, expected fixture names, OS, toolchain/installed peers, and named check outcomes. Source identity must cover intended changes when no Git commit exists. **Done when:** changes to runtime source, packaged docs, or fixture inputs make old evidence ineligible for the current release. Distinguish archive integrity from agreement with the current checkout.

- [x] **5. Make consumer checks reproducible.** Replace merged/reused fixture input trees with clean isolated fixtures; use locked dependencies and a deliberate exact-archive installation method. Preserve the two different content models. **Done when:** deleted fixture files cannot survive into a later run, installed versions are recorded, and both consumers test the same immutable archive.

**Phase exit:** targeted regressions, typecheck, and unit/component checks pass. No stable-release claim yet.

## Phase 2 — finish the existing editor loop

- [x] **6. Share the scan session — R05 / B12.** Give Overview, Health, Optimize, and Workflow one scan state, perspective, progress, and result set. Keep navigation and filters usable without rescanning the same content separately. **Done when:** scan → change view → open issue → return preserves the appropriate result set, with a meaningful navigation/component check.

- [x] **7. Detect stale content results — R06 / B16.** Qualify results by document/settings/analyzer/adapter identity. Detect affected saved edits and recheck or visibly mark the row stale. Keep incomplete coverage distinct from passing. **Done when:** editing a scanned document cannot leave an old row presented as freshly verified; unsaved editor feedback and asynchronous stale-result protection still work.

- [x] **8. Review cancellation and existing layout.** Ensure canceled work cannot update the current session; where needed add an optional signal context without breaking existing `loadContext` callbacks. Verify Content/SEO document tabs and nested Search/Social/Advanced groups in both example schemas and the actual Studio. **Done when:** cancellation and navigation checks pass, and validation/field paths remain compatible.

**Phase exit:** the existing Health → field → edit → return/recheck flow works. New AI, approvals, and unrelated dashboards stay out of stabilization.

## Phase 3 — produce a new release candidate

- [x] **9. Finalize `0.2.0-rc.2` source and documentation.** First confirm that version has not already been distributed. Update package/lock/version constant, changelog, README, integration/upgrade guides, release guide, and both examples together. Incorporate the revised pipeline into `docs/releases.md`. **Done when:** version references agree, instructions match actual APIs, links/code examples are checked, and rc.1 has not been overwritten.

- [x] **10. Run the final local package gates.** Run `npm run typecheck`, `npm test`, `npm run test:package`, and `node scripts/check-release.mjs` using the revised verifier. Pack once and test that exact archive. Check framework-free core, exports/types, schema extraction, Studio/Next builds, public metadata/social/schema, canonical/noindex, sitemap/robots, and 404 behavior. **Done when:** both named consumers pass and the report is tied to finalized source, fixture inputs, and the candidate checksum. **Result:** rc.2 passed all gates; evidence is preserved in `.artifacts/phase3/verification.json` and the Phase 3 completion record.

- [x] **11. Validate hosted CI and compatibility claims.** Check the repository/remote and publisher state rather than assuming setup exists. Run the revised Windows/Linux workflows once a repository is available; test a supported lower-bound combination or narrow claims. Record hosted evidence separately from local checks. **Done when:** the declared support/release channel has matching evidence. Registry setup may remain unavailable while a clearly identified local candidate is distributed; hosted checks remain unchecked until actually run. **Result:** [CI run 39573895942](https://github.com/gercee01/sanity-seo-plugin/actions/runs/39573895942) succeeded on both `ubuntu-latest` and `windows-latest` for rc.3 commit `67738e2`; each job uploaded its verified archive/report. Compatibility remains limited to the tested combination. npm ownership/publication is not claimed.

**Step 11 completion record:**

1. Connected and pushed the standalone source to the private `gercee01/sanity-seo-plugin` repository on `main`. Extracted Yoast files, caches, secrets and agent tooling remain excluded.
2. Used rc.3 for the repository/documentation update and preserved prior archives. Local typecheck, 64 tests, both consumer builds/HTTP checks and release validation passed.
3. Observed successful [Linux](https://github.com/gercee01/sanity-seo-plugin/actions/runs/39573895942/job/119134524536) and [Windows](https://github.com/gercee01/sanity-seo-plugin/actions/runs/39573895942/job/119134524740) jobs for the exact candidate commit. Both produced verification artifacts.
4. Retained the tested version limits; lower-bound combinations remain unverified. npm publication setup remains optional for the selected local/vendor channel.

**Phase exit:** a new uniquely versioned RC is available with truthful evidence. Do not rename/reuse rc.1 or infer live CMS behavior from the fixture builds.

## Phase 4 — validate the actual paired project

- [ ] **12. Prepare the paired upgrade.** Read the current Studio schema and frontend renderer/query contract. Record installed versions/configuration and rollback artifacts. Install the same RC in both apps; update projections/generated types/settings loading/cache hooks where required. **Done when:** both apps typecheck/build and the same package version/settings source reaches both sides.

- [ ] **13. Verify editor and permission behavior.** Check Page/Post Content and SEO tabs, unsaved previews, field links, inherited values, clearing overrides, incomplete analysis, and the Health/Optimize/Workflow loop. Test read-only and authorized editing roles using the project's available permission setup. **Done when:** checks are observed in the real Studio, with results recorded rather than inferred from mocks.

- [ ] **14. Verify settings publication and preview isolation — R04.** In a suitable staging/test context, change draft defaults and confirm public output still uses published settings. Publish an authorized test change and verify matching title/description/social/schema and affected sitemap policy. Restore test values appropriately. **Done when:** actual draft isolation and public refresh are observed, including the host's cache behavior. Do not use unapproved live content changes merely to complete the checklist.

- [ ] **15. Verify content lifecycle and rollback.** Exercise publish, unpublish/delete, and old/new slug handling on authorized test content; check route responses, sitemap updates, and preview noindex. Rehearse paired dependency/configuration rollback without deleting authored SEO data. **Done when:** real outcomes and rollback limits are documented. These checks cannot be replaced by a successful local build.

**Phase exit:** the real edit → analyze → fix → publish → correct public output loop is signed off. Unavailable credentials, roles, test content, or deployment access leave the affected checks pending; they do not count as success.

## Phase 5 — stable v0.2 delivery

- [ ] **16. Prepare and verify the final `0.2.0` artifact.** After the prior gates, finalize versioned release notes/source and build the stable-version archive. Repeat automated package gates and a staged smoke check on this final artifact. **Done when:** the final-version checksum and evidence correspond to what will actually be distributed, not just the earlier RC.

- [ ] **17. Release through the configured channel and update consumers.** Follow the current release guide. Registry publication requires actual ownership/bootstrap/trusted-publisher setup and release authorization; otherwise deliver the verified archive through the documented local/vendor channel. Coordinate exact Studio/frontend dependency changes and retain previous deployments/artifacts/settings evidence. **Done when:** the selected delivery action and consumer upgrade status are confirmed. Preparing a tarball or workflow file is not registry publication or deployment.

**Stable exit:** all applicable stable-release checks above pass, remaining channel limitations are explicit, and the upgrade/rollback instructions are usable by another project.

## Phase 6 — next feature milestones after stabilization

These are ordered follow-on scopes, not completed functionality. Before implementation, split the selected milestone into small changes with acceptance checks and update the audit backlog IDs.

- [ ] **18. Daily Yoast editor experience.** Complete snippet/token/title-width editing, separate Problems/Improvements/Good groups, meaningful keyphrase readiness, stronger default keyphrase/link/image rules, passive/transition guidance, text highlighting, and separate OG/X overrides. Add type-description templates, essential identity/verification and supported directives as coordinated UI/core/Next changes. **Done when:** representative editor and HTTP checks prove the newly implemented behavior; unsupported assessments remain explicit. Primary backlog: A01–A14, A16–A19, A21–A22, B01–B02, C03–C05, C10–C11, D01.

- [ ] **19. Site structure and useful tasks.** Add native list indicators, cornerstone flag/profile, duplicate phrases, incoming/outgoing links, tasks/alerts, and resumable analysis using one shared identity/coverage model. **Done when:** cross-document results are revision-qualified and incomplete scans cannot imply complete-site success. Primary backlog: A15, B04–B06, B10–B16; selected C01–C02/C12 as needed.

- [ ] **20. Content maintenance, richer output, and migration.** Build link suggestions/workouts only after graph coverage is measurable. Add safe bulk edits, portable settings, Yoast migration mappings, applicable archive/pagination policies, breadcrumbs/schema choices/extensions, and sitemap scale/image improvements. Implement redirects with real runtime activation; move this earlier for an active URL migration. **Done when:** selected features work in actual host routes/output and have explicit migration/rollback behavior. Primary backlog: B07–B09/B17, C06–C09/C13–C15, D03–D10, E07.

- [ ] **21. Advanced and optional integrations.** Evaluate additional languages, Insights/inclusive analysis, synonyms/related phrases/distribution/complexity, optional AI/research/metrics, discovery endpoints, and real Local/News/Video/Product needs. Verify paid/service and language applicability rather than treating bundled exports as active Free features. **Done when:** each selected extension has a concrete consumer requirement, tested applicability, and a complete integration contract. Primary backlog: A23–A29, B03, D02/D11–D16, E01–E06 and the audit's adjacent-target table.

- [ ] **22. Re-evaluate the 1.0 gate.** Review the maintained parity catalog, supported versions, public/stored contracts, real-project evidence, reusable installation, and paired upgrades/rollback. **Done when:** the supported product is dependable and limitations are clear. A reliable 1.0 does not require every commercial Yoast add-on.

## Execution log

After each completed step, add the result and evidence here. Keep secrets and private content out of logs.

| Step | Status | Changed paths / evidence | Checks and result | Remaining limitation |
|---|---|---|---|---|
| Audit baseline | Complete | [Feature-gap audit](yoast-gap-audit-2026-10-20.md), [JSON backlog](../reports/yoast-feature-gaps-2026-10-20.json) | Static/code/archive review and bounded probes recorded in the audit | Not live WordPress/CMS/hosted CI evidence |
| 1–5 | Complete locally | [Phase 1 verification](phase-1-verification.md); baseline/evidence under `.artifacts/phase1-baseline/` | Typecheck and 57 tests passed; two real clean locked installs passed; negative CLI gates rejected stale/overwrite evidence | New release artifact/full package gates remain Phase 3; installed apps unchanged |
| 6–8 | Complete locally | [Phase 2 verification](phase-2-verification.md); `src/sanity/scan-session.ts`, dashboard/input/context API, tests, example projections and guides | 64 tests and root typecheck passed; both current-source fixtures passed types/grouping/extraction; actual Studio types/extraction and Page/Post browser grouping passed | Installed rc.1 unchanged; new dashboard behavior tested with component/client simulations, not yet installed/live-CMS verified |
| 9 | Complete locally before packing | Package/version constant, root/example locks, changelog and guides | Version/lock/fixture metadata, workflow parsing and documentation links/fences passed before packing | rc.1 preserved; actual apps unchanged |
| 10 | Complete locally | [Phase 3 completion record](../reports/phase-3-verification.md); preserved `.artifacts/phase3/verification.json` | rc.2 passed 64 tests, framework-free core, both locked consumers, types/schema/Studio/Next builds, HTTP checks and release validation | Current workspace checklist edits are later documentation changes; archive/report remain unchanged |
| 11 | Complete for local/vendor delivery | [CI evidence](../reports/github-setup-and-ci.md); [successful run](https://github.com/gercee01/sanity-seo-plugin/actions/runs/39573895942), candidate commit `67738e2` | Both hosted OS jobs passed package/release gates and uploaded artifacts; local rc.3 gates passed; actual apps unchanged | npm publication, other version combinations and real-project adoption remain separate gates |
| 12–22 | Not started | — | No later-phase work performed | Actual app installation remains Phase 4 |
