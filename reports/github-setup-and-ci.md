# Repository setup and Step 11 verification

Date: 2026-10-21. **Step 11 complete for local/vendor tarball delivery.** Phase 4 has not started.

## Source and hosted results

- Repository: [gercee01/sanity-seo-plugin](https://github.com/gercee01/sanity-seo-plugin), private visibility retained, branch `main`.
- Tested candidate: `@gerald/seo@0.2.0-rc.3`; [commit 67738e2ef5595db2b555f1fec14c6a6ee1ccae90](https://github.com/gercee01/sanity-seo-plugin/commit/67738e2ef5595db2b555f1fec14c6a6ee1ccae90).
- [Workflow run 39573895942](https://github.com/gercee01/sanity-seo-plugin/actions/runs/39573895942): **Success**, two successful jobs, two artifacts, total duration 8m 17s; observed in authenticated GitHub UI.
- [Linux job](https://github.com/gercee01/sanity-seo-plugin/actions/runs/39573895942/job/119134524536) and [Windows job](https://github.com/gercee01/sanity-seo-plugin/actions/runs/39573895942/job/119134524740) passed the workflow's package/release gates.
- Each job verifies typecheck/unit tests, framework-free core, package bytes/exports, fresh locked consumers, public types, schema extraction, Studio/Next builds and HTTP SEO output, then runs release validation and uploads its archive/report.

| Artifact | GitHub download | Artifact ZIP SHA-256 |
|---|---|---|
| `seo-package-ubuntu-latest` | [Artifact 12332799718](https://github.com/gercee01/sanity-seo-plugin/actions/runs/39573895942/artifacts/12332799718) | `f0b38f215df01866222f31efc8b0e042d8d2ec3cea28aa8e93eef30cb904c0f8` |
| `seo-package-windows-latest` | [Artifact 12332764656](https://github.com/gercee01/sanity-seo-plugin/actions/runs/39573895942/artifacts/12332764656) | `be67613811d5cd3d6386c40d470a3876ec6dc8e99bfc04630f54decb591bd1e4` |

These are GitHub artifact-container digests, not tarball checksums. Artifact downloads require repository access and are subject to GitHub retention. Use the contained verification report for each tested archive's SHA-512 and actual environment.

## Local candidate

`npm run typecheck`, all **64 tests**, `npm run test:package` and `node scripts/check-release.mjs` passed. Both `portable-text` and `custom-sections` passed all consumer gates. Local evidence is preserved in `.artifacts/rc3/verification.json`, `package-check.log` and `release-check.log` (workspace-only files).

- Archive: `.artifacts/gerald-seo-0.2.0-rc.3.tgz`.
- SHA-512: `336ce67410b5f8533782e191a4e829e23107708c2df14f48e14a4466173b80293da570a3c3c70f68009a4686a1c44dd8c2a79be489f15651ab6e9f0051303460`.
- Local report run ID: `1100b536-1e55-4a67-9cfd-76a59560096e`. The sandbox did not populate its optional Git commit field; source identity and the clean candidate checkout bind local inputs. The hosted run explicitly identifies the tested commit above.
- rc.1/rc.2 archives remain unchanged. Neither actual Studio/frontend project was upgraded; both still use rc.1.

## Repository hygiene and follow-up

The initial commit contains 83 reviewed project files. Extracted Yoast code (`plugins/`), machine-specific REA evidence, dependencies, generated bundles, tarballs, caches, environment files and agent tooling were excluded. Git line endings are normalized to LF. No registry credentials were added or npm package published.

The workflow succeeded with nonblocking GitHub action-runtime deprecation notices and an `ubuntu-latest` image migration notice. They do not represent failed package checks; action-version maintenance can be handled in a subsequent candidate.

The execution-plan and compatibility/release-guide status updates are a **post-verification documentation-only commit**. They do not alter the retained rc.3 artifact or claim a new verified build. CI is skipped for that status-only commit; the tested source remains commit `67738e2`. A later package build that includes these edits needs a new unique candidate version.

Next: Phase 4 Step 12, coordinated installation of the same selected verified archive in Studio and frontend, followed by real editor/permissions/publish/cache/lifecycle checks. npm publication and broader version compatibility remain separate work.
