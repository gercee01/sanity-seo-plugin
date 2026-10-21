# Phase 3 execution record

Follow-up: repository setup and Step 11 are now complete for rc.3, with successful Windows/Linux CI. See [repository/CI evidence](github-setup-and-ci.md) and the current [execution checklist](../docs/EXECUTION-PLAN.md). The rc.2 verification record below remains historical evidence for its unchanged archive.

Date: 2026-10-21. Candidate: `@gerald/seo@0.2.0-rc.2`. **Local candidate verified; hosted Step 11 remains pending.** This workspace record supplements the frozen, pre-verification [execution checklist](../docs/EXECUTION-PLAN.md) without changing packaged bytes.

- [x] **9. Finalize source/docs.** Root manifest/lock, public version constant, both example manifests/lock entries, changelog, README, API/upgrade/release guidance and CI commands agree. Version/lock/workflow/link checks passed. Other fixture dependency resolutions are unchanged. Existing rc.1 is preserved. The local archive inventory contains one rc.2 file: the candidate produced by this run. Public unauthenticated npm lookup returned 404; this does not establish scope ownership or private visibility.
- [x] **10. Verify the exact candidate.** `npm run test:package` and `node scripts/check-release.mjs` passed. The verifier ran root typecheck, build and all 64 tests, compared packed bytes with the checkout, checked framework-free core, and installed the same immutable archive into two fresh locked consumers. Both passed public TypeScript imports, schema extraction, Studio and Next production builds, and HTTP checks for browser/Googlebot/Twitterbot metadata, canonical/noindex, social defaults, JSON-LD presence, sitemap exclusions, robots and 404s.
- [ ] **11. Hosted CI / compatibility.** Verified claims are limited to Windows x64, Node 24.19.0/npm 11.17.0, React/React DOM 19.3.0, Sanity 6.19.0, UI 4.4.9, Next 16.4.2, styled-components 6.6.0 and TypeScript 6.0.3. No Git repository/remote exists, so hosted Windows/Linux workflows cannot run. `npm whoami` returned ENEEDAUTH; registry ownership/trusted publishing is unproven. Workflow YAML parsing is local preparation only. Lower-bound versions and Linux remain unverified.

## Artifact and evidence

- [Installable rc.2 archive](../.artifacts/gerald-seo-0.2.0-rc.2.tgz) (121974 bytes; 93 packed files).
- [SHA-512 checksum](../.artifacts/gerald-seo-0.2.0-rc.2.tgz.sha512).
- [Bound verification snapshot](../.artifacts/phase3/verification.json), [package log](../.artifacts/phase3/package-check.log), [release check](../.artifacts/phase3/release-check.log) and [phase summary](../.artifacts/phase3/result.json).
- Run ID: `3ebcbe1f-d346-49da-845b-d15ee1915a3a`. Started `2026-10-21T06:55:31.196Z`; finished `2026-10-21T06:58:25.689Z`.
- Source/input SHA-256: `a621212f4066c5ffb473dc34ba76c33e9a150fb8e7b9ef94087808aeb871110b`. Final input identity still matches the frozen manifest.

```text
SHA-512: f091bee60d9b3d3975688e2d91f60aacce5fe2c50ac85182f990533effc7dfbd24186f60d23359a677fa60f6171973325361efae56112a897b18137491efaf7e
```

The active `.artifacts/verification.json` and preserved phase snapshot cover the same archive. Generated outcomes are stored outside package inputs so logging completion does not invalidate the evidence. Do not edit/repack the candidate under the same version.

## Next phase and remaining limits

Checklist follow-up: `docs/EXECUTION-PLAN.md` now directly marks Step 10 complete and leaves Step 11 pending, with the remaining CI actions listed there. This and the corresponding release-guide clarification are post-verification documentation changes. The rc.2 archive and preserved verification snapshot are unchanged; current-checkout release validation is expected to reject the documentation mismatch until a newly versioned candidate is verified.

**Phase 4 has not started.** Both actual projects still use rc.1; no external project source/dependency files, content/settings, registry or deployments were changed by this phase. Next, prepare the coordinated Studio/frontend rc.2 upgrade and validate the real editor/publish/cache/permissions/lifecycle behavior. Fixture HTTP success is not live CMS or deployment evidence. The local vendor-tarball channel can be used without claiming hosted CI or npm publication.
