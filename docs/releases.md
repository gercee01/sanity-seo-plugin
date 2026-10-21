# Releases and updates

Follow the [execution checklist](EXECUTION-PLAN.md) for the implementation and verification order. Phase 1 correctness/evidence fixes and Phase 2 editor-loop fixes are incorporated in the rc.2 source; see the [audit](yoast-gap-audit-2026-10-20.md) for the original findings.

The source targets `0.2.0-rc.3`, using local tarball distribution. The standalone repository is https://github.com/gercee01/sanity-seo-plugin, with `main` as the initial branch. [Windows/Linux CI run 39573895942](https://github.com/gercee01/sanity-seo-plugin/actions/runs/39573895942) passed for candidate commit `67738e2`; [repository/CI evidence](../reports/github-setup-and-ci.md) records the local verification and artifact links. npm authentication/ownership/trusted publishing remain unproven. The earlier unauthenticated public registry lookup returned 404; that does not establish scope ownership or private visibility. No registry publication or consumer deployment is implied.

## Local verification and artifacts

Finalize source, package/lock/version constant, both example dependency entries, release notes and packaged documentation before verification. Preserve rc.1 as rollback material. For a new unique version, run:

```sh
npm ci
npm run test:package
node scripts/check-release.mjs
```

`test:package` runs typecheck/unit checks, builds/packs once, inspects the allowlist and compares installed archive files against the checkout. It installs the exact archive without framework peers for core, then installs it into two fresh Studio/Next fixture directories using committed locks and `npm ci`. Only the package-under-test lock entry is injected; other dependency resolutions remain locked. It typechecks public imports, extracts schemas, builds both apps, and checks HTTP metadata/social defaults, schema presence, noindex/canonical rules, sitemap, robots, and 404s.

The committed example locks name the current candidate but omit its not-yet-computed integrity value. The verifier injects the completed archive's integrity into fresh transient locks before installation; all other dependency resolutions remain unchanged. Never retain a prior candidate's digest under a new version or edit source locks after verification just to insert the new digest.

The active `.artifacts/verification.json` is replaced with a running marker before fallible work and an atomic passed/failed result afterward. Version 2 reports include the run ID/times, source-file and fixture hashes, optional Git commit, OS/Node/npm/installed peer versions, named checks/consumers, exact archive checksum, and packed file hashes. The release gate rejects old report formats, failed/in-progress runs, changed inputs/docs/runtime, or mismatched consumers/archives. Finalize the checkout before verification; editing packaged docs or examples afterward requires new evidence.

To verify an already packed archive instead of repacking:

```sh
npm run test:package -- .artifacts/gerald-seo-0.2.0-rc.3.tgz
```

The verifier installs and checks the supplied archive; its packaged files must match the current built checkout. It does not certify an old archive against changed source/docs. `check-release.mjs` additionally checks version agreement and release notes. CI evidence must correspond to the finalized checkout used for release. The active report is invalidated even when the requested verification fails; preserve historical evidence separately.

Once packing starts, freeze the inputs, including this documentation and the packaged execution checklist. Record final outcomes in the generated `.artifacts/verification.json` and the separate workspace record `reports/phase-3-verification.md`; derived reports are outside the package/input manifest. The packaged checklist is a pre-verification snapshot. Update its completed boxes when preparing a later source version, rather than changing verified bytes. If a failed run needs code/docs changes, retain the failed archive and use a new candidate version; do not overwrite it. Rechecking unchanged bytes uses the explicit-archive command above.

After preserving a completed archive and its bound report, keep the workspace execution checklist current. Such documentation edits do not alter the existing archive, but they make the current checkout differ from the verified inputs: release validation must reject that mismatch. Preserve the historical evidence under `.artifacts/phase3/`; use a new candidate version before packing changed workspace files. The archive's packaged checklist remains its original snapshot.

## Compatibility evidence

The candidate is verified only to the extent recorded by its successful bound report, targeting this installed combination:

| Component | Verification target |
|---|---|
| OS / architecture | Windows / x64 |
| Node / npm | 24.19.0 / 11.17.0 |
| React / React DOM | 19.3.0 / 19.3.0 |
| Sanity / Sanity UI | 6.19.0 / 4.4.9 |
| Next.js | 16.4.2 |
| styled-components / TypeScript | 6.6.0 / 6.0.3 |

Peer/engine ranges are installation constraints, not evidence that all accepted versions work. Node 22, React 19.2, styled-components 6.1 and other untested combinations remain unverified. The hosted Windows/Linux matrix for the candidate commit has passed; use its bound reports for actual runner/toolchain details. Expanded version coverage requires new checks.

## CI and registry setup

`.github/workflows/ci.yml` runs typechecks, tests, package builds/HTTP checks, and release consistency on Windows and Linux. `.github/workflows/release.yml` repeats those gates on Linux and uploads the tested archive/report. Its default manual mode only prepares artifacts.

Before enabling publication, establish the repository/remote, confirm the npm scope and package ownership, choose public visibility, add real repository metadata, and configure an npm trusted publisher for `release.yml`. Initial package creation may require a separate authenticated bootstrap before a package-level trusted publisher can be configured. Configure the `npm-release` environment as appropriate and set `NPM_PUBLISH_ENABLED=true` only after this setup. The workflow's publish input defaults to false and publishing requires the matching version tag.

Trusted publishing uses OIDC rather than long-lived write tokens. Current npm requirements include Node 22.14+ and npm 11.5.1+; our workflow pins Node 24.19.0. Eligible packages receive provenance automatically. Verify those requirements again when configuring the registry. [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)

## Candidate and stable release procedure

1. Implement/review changes, update README/API/upgrade/release notes, and update `package.json`, root lockfile metadata, `SEO_PACKAGE_VERSION`, and both example manifests/lock entries together. Check docs/links/workflows before freezing inputs.
2. Use a unique candidate version such as `0.2.0-rc.3`; never overwrite an archive/version already distributed.
3. Run all gates and install the same exact archive in Studio and frontend staging.
4. Record real CMS edit/publish/cache checks separately from fixture evidence.
5. For stable release, change the version and release notes, rebuild, and verify the final archive again.
6. Commit/tag the matching source (`v<package version>`). Run the release workflow from that tag; only select publish after registry setup. It publishes the verified `.tgz` with `--ignore-scripts`, using `next` for prereleases and `latest` for stable versions.
7. Distribute release notes, the verification report, and the archive/checksum. Until registry distribution exists, vendor the archive in consumer repositories.

The workflows prepare/upload artifacts; they do not create Git tags, merge consumer changes, or deploy sites. Require actual successful run links for the matching candidate commit before claiming hosted verification.

## Consumer update and rollback

Use the [upgrade guide](upgrading-to-0.2.md). Update exact package versions and lockfiles in both apps through coordinated changes. Keep a short inventory of consuming projects and installed versions in the owning team's existing tooling; no separate update server is needed.

Check each host's schema/projections/generated types, settings mapping, preview policy, caches, and deployed public output. Dependency automation may open upgrade changes; project checks still gate merges/deployment. Installing an npm package does not update a deployed Studio or Next.js site by itself.

Keep the prior package/archive, app deployment, configuration, and relevant settings snapshot. Roll back both applications and restore settings only when necessary. Fix a bad published release with a new version; registry versions cannot be reused. [npm publication rules](https://docs.npmjs.com/cli/commands/npm-publish/)
