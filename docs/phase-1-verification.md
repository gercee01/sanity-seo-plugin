# Phase 1 — correctness and verification

Completed locally on 2026-10-20. Scope: execution-plan Steps 1–5 only. Phase 2 has not started.

## Changes

1. Captured the current source/fixture identities, reproduced the heading-only false-green result, and preserved the distributed rc.1 archive and previous verification report under `.artifacts/phase1-baseline/`.
2. Fixed analysis eligibility: headings, blank paragraphs, and punctuation-only text cannot earn prose-readability passes. Fewer than three sentences now produces informational feedback for sentence-beginning comparison. Short genuine prose remains eligible; unsupported languages/content stay incomplete. Analyzer revision is now `0.2.1`; the package version remains rc.1 until the release-candidate phase.
3. Added a running/failed/passed verification lifecycle with atomic report replacement. Failed attempts invalidate earlier success. The release gate requires the current report format, passed checks, and the exact expected consumer identities.
4. Bound evidence to source/docs/scripts/tests/workflows/fixture hashes, named checks, run times, toolchain/installed versions, archive checksum, and packed-file hashes. Installed archive files must match the checkout. Changed source/docs/examples cannot reuse old evidence.
5. Added committed lockfiles for both consumer examples. Verification creates fresh directories, injects only package-under-test metadata, then uses `npm ci`; it cannot merge stale files from an earlier run. Existing versioned archives cannot be silently overwritten.

Runtime change: `src/core/analyze.ts`, `src/core/review.ts`. Tooling: `scripts/verification.mjs`, `verify-package.mjs`, `check-release.mjs`. Regression coverage: `tests/analysis-eligibility.test.mjs`, `tests/verification.test.mjs`. Fixture dependency graphs: both `examples/*/package-lock.json`. README/release guidance explains the stricter checks and the pending candidate.

## Checks performed

| Check | Result |
|---|---|
| Original heading-only reproduction | Confirmed original result was green/Ready with zero paragraphs |
| `npm run typecheck` | Passed |
| `npm test` | 57 passed, 0 failed |
| CLI syntax checks for all three verification scripts | Passed |
| Readability regression cases | Heading-only, empty, punctuation-only, and blank paragraphs unavailable; short prose eligible; repeated sentence beginnings assessed; coverage/language limits preserved |
| Evidence regressions | Running/failed report rejected; source/docs/fixture/lock changes rejected; wrong named consumers/archive/runtime rejected; actual release CLI checked in an isolated fixture |
| Fresh fixture behavior | Repeated preparation uses different directories; stale/deleted files and build outputs do not carry over; source identity stays unchanged |
| Real clean locked installs | Both consumers passed offline `npm ci`; both installed the same preserved rc.1 archive; installed framework versions recorded |
| Default archive-overwrite attempt | Intentionally rejected before packing; rc.1 checksum unchanged; active report marked failed |
| Standalone release check after that failed attempt | Intentionally rejected the failed run |
| Old installed archive against changed runtime | Correctly rejected as evidence for the current checkout |

Historical rc.1 SHA-512 remains:

```text
a8e93c48c3158317bb40ffa4788b76d9ee98cbc55557930aecc9cb97064569d11c2008931d11efe653e5a6087f0bf8199b5dc677d6abbced0cb82bd32d897555
```

Local evidence: `.artifacts/phase1-baseline/baseline.json`, `readiness-before.json`, `locked-installs.json`, and `cli-negative-check.json`. The old report is preserved there as historical evidence. The active `.artifacts/verification.json` records the deliberately failed overwrite attempt and is **not** release approval.

## Limits and next checkpoint

The clean installs prove lock/archive injection using the preserved rc.1 artifact; they do not claim its runtime contains these new fixes. The revised report/gate behavior is regression-tested, but full build/HTTP verification of a new artifact remains Step 10 after a unique candidate is finalized. No distributed archive was replaced, no registry/hosted-CI/live-CMS checks were performed, and no installed Studio/frontend dependency was changed.

Next: [Phase 2, Step 6 — share the scan session](EXECUTION-PLAN.md#phase-2--finish-the-existing-editor-loop). Continue only as the next separately handled phase.
