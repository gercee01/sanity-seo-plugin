# Phase 2 verification

Date: 2026-10-21. Scope: execution checklist Steps 6–8, the existing editor loop. Phase 3 has not started. Package version remains `0.2.0-rc.1`; its distributed archive and the actual apps have not been updated.

## Implemented behavior

- Overview, Health, Optimize and Workflow use one in-memory scan session per configured plugin, project/dataset and signed-in user. View changes retain rows, filters, perspective, pagination and progress. A Studio reload starts a new session; changing perspective clears rows.
- Rows record their document revision (serialized scanned values when `_rev` is absent), settings identity, analyzer version and adapter generation. Settings/mapping changes invalidate results. Saved dataset mutations conservatively invalidate all scanned rows because host context loaders may depend on arbitrary references; published scans ignore draft/release changes.
- Stale rows retain document links, hide previous checks/traffic lights and cannot contribute to Ready counts. Counts and scan-completion coverage are invalidated together. Refresh explicitly rechecks content; no content is rewritten or published.
- A listener connection is required before scanning. Disconnects, errors and monitoring gaps mark results stale and cancel pending requests. Pane replacement within one React commit keeps the listener/session; leaving for an editor retains rows but requires refresh after returning.
- `loadContext(document, client, {signal})` now receives cancellation in scans and unsaved editor analysis. Existing two-argument callbacks remain valid. Editor context uses the draft perspective; scans use the selected perspective. Loaders can forward the signal to fetches; ignored cancellation still cannot update the current result. Already-cancelled scans do not call the document loader.
- Both example scan projections now include `_rev`. Content/SEO root tabs, nested Search/Social/Advanced groups, stored field paths and validation remain compatible.

## Checks

| Check | Result / evidence |
|---|---|
| `npm run typecheck` | Passed |
| `npm test` | 64 passed, 0 failed; includes seven new scan-session regressions plus extended dashboard navigation/editor-return and unsaved-input cancellation checks |
| Dashboard component navigation | Keyed pane replacement across all four views preserved rows/filters without extra loader calls; issue field link → simulated editor → return retained rows with stale status; draft perspective persisted; refresh cleared stale status; disconnect disabled scanning |
| Session failure/race cases | Saved reference changes, settings/mapping identity changes, perspective switch, reconnect/error, cancellation/unmount and late loader/listener callbacks covered; sessions isolated by plugin/project/dataset/user |
| Both example source integrations | Fresh locked offline installs, current built-source overlay, schema group/path assertions, TypeScript (legacy two-argument and cancellable context callbacks) and Sanity schema extraction passed for `portable-text` and `custom-sections`; `.artifacts/phase2/source-fixtures.json` and per-fixture logs |
| Actual Studio typecheck | Passed using `tsc --noEmit --tsBuildInfoFile` pointed into this workspace |
| Actual Studio schema extraction | Passed; `.artifacts/phase2/actual-studio-schema.json`. CLI emitted Windows WMI access-denied diagnostics but completed with exit code 0 |
| Actual Studio browser layout | Observed existing Homepage and Test Post at `localhost:3333`: Content selected by default, separate SEO tab, functioning Search/Social/Advanced groups, original `seo.*` input paths. Existing stale Vite import error cleared after one page reload. No content/settings edits or publication performed |
| Preserved artifact | Source-fixture helper checked that rc.1 SHA-512 was unchanged; no new tarball produced |

The source fixture overlay is deliberately **not release-artifact verification**. Both fixture inputs were copied into fresh isolated directories; the old archive supplied locked dependencies, then the current `dist` was copied into the installed package for source integration checks. Phase 3 must verify an immutable newly versioned archive end to end.

## Limits and next step

The running Studio still uses its existing rc.1 package. Browser observations establish existing Page/Post grouping only; new shared-session/freshness behavior is validated through local component/client simulations until the coordinated Phase 4 installation. Hosted CI, public HTML/package HTTP checks, permissions and actual publish/cache lifecycle remain later gates.

Dataset invalidation is intentionally conservative and may require refresh after an unrelated eligible document changes. Changes in external host services/caches cannot be detected by the Sanity listener and still require manual refresh. No persistent scores, background scans, approvals, AI or dependency additions were introduced.

Listener event/options behavior was checked against the installed client types and [Sanity's query-listener documentation](https://www.sanity.io/docs/apis-and-sdks/js-client-realtime). Terminal stream completion also invalidates results.

Next: Phase 3 Step 9, finalize a unique `0.2.0-rc.2` source/version set, then run exact-archive gates before installing in both actual apps.
