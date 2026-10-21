import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {beginVerification, CONSUMERS, fileHash, inputIdentity, prepareConsumer, saveVerification, validateVerification, verifyArchiveContents} from '../scripts/verification.mjs';

function put(root, name, value) {
  mkdirSync(path.dirname(path.join(root, name)), {recursive: true});
  writeFileSync(path.join(root, name), typeof value === 'string' ? value : JSON.stringify(value));
}
function fixtureRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'seo-verification-test-'));
  put(root, 'package.json', {type: 'module', version: '0.2.0-rc.2'});
  put(root, 'package-lock.json', {version: '0.2.0-rc.2', packages: {'': {version: '0.2.0-rc.2'}}});
  put(root, 'README.md', 'Verified instructions');
  put(root, 'CHANGELOG.md', '## 0.2.0-rc.2');
  put(root, 'src/core.ts', 'export const source = true;');
  put(root, 'docs/usage.md', 'Use the shared resolver.');
  put(root, 'dist/core/index.js', "export const SEO_PACKAGE_VERSION = '0.2.0-rc.2';");
  for (const name of CONSUMERS) {
    const dependencies = {'@gerald/seo': 'file:../../.artifacts/old.tgz', react: '19.3.0'};
    put(root, `examples/${name}/package.json`, {type: 'module', dependencies});
    put(root, `examples/${name}/package-lock.json`, {lockfileVersion: 3, packages: {'': {dependencies}, 'node_modules/@gerald/seo': {version: 'old', resolved: dependencies['@gerald/seo'], integrity: 'old'}, 'node_modules/react': {version: '19.3.0', integrity: 'locked-react'}}});
    put(root, `examples/${name}/sanity.config.ts`, `export const name = '${name}';`);
  }
  return root;
}
function passed(root) {
  const report = beginVerification(root);
  put(root, '.artifacts/gerald-seo-0.2.0-rc.2.tgz', 'verified archive bytes');
  Object.assign(report, {status: 'passed', version: '0.2.0-rc.2', finishedAt: new Date().toISOString(), tarball: 'gerald-seo-0.2.0-rc.2.tgz', sha512: fileHash(path.join(root, '.artifacts/gerald-seo-0.2.0-rc.2.tgz'), 'sha512'), inputs: inputIdentity(root), environment: {node: process.version, npm: '11.17.0', platform: process.platform}, checks: {typecheck: true, unitTests: true, archiveContents: true, coreWithoutFrameworks: true}, unitTests: {passed: true, count: 1}, packedFiles: ['README.md', 'dist/core/index.js'].map((file) => ({path: file, sha256: fileHash(path.join(root, file))}))});
  report.consumers = CONSUMERS.map((name) => ({name, fixtureSha256: report.inputs.fixtures.find((fixture) => fixture.name === name).sha256, artifactSha512: report.sha512, versions: {sanity: '6.19.0', next: '16.4.2', react: '19.3.0'}, lockedInstall: true, types: true, schema: true, studioBuild: true, nextBuild: true, http: true}));
  return report;
}

test('a new or failed verification invalidates an earlier success', () => {
  const root = fixtureRoot();
  const previous = passed(root);
  saveVerification(root, previous);
  validateVerification(root, previous);
  const current = beginVerification(root);
  assert.notEqual(current.runId, previous.runId);
  const active = JSON.parse(readFileSync(path.join(root, '.artifacts/verification.json'), 'utf8'));
  assert.equal(active.status, 'running');
  assert.throws(() => validateVerification(root, active), /did not pass/);
  current.status = 'failed'; current.finishedAt = new Date().toISOString(); current.error = 'Build failed before pack';
  saveVerification(root, current);
  assert.throws(() => validateVerification(root, JSON.parse(readFileSync(path.join(root, '.artifacts/verification.json'), 'utf8'))), /did not pass/);
});

for (const file of ['src/core.ts', 'docs/usage.md', 'README.md', 'examples/portable-text/sanity.config.ts', 'examples/custom-sections/package-lock.json']) {
  test(`verification rejects changed input ${file}`, () => {
    const root = fixtureRoot(); const report = passed(root);
    put(root, file, 'Changed after verification');
    assert.throws(() => validateVerification(root, report), /inputs changed/);
  });
}

test('release checks require exact named consumers, archive bytes, and packed runtime', () => {
  const root = fixtureRoot(); const report = passed(root);
  const duplicate = structuredClone(report); duplicate.consumers[1].name = duplicate.consumers[0].name;
  assert.throws(() => validateVerification(root, duplicate), /named consumers/);
  const wrongArchive = structuredClone(report); wrongArchive.consumers[0].artifactSha512 = 'another archive';
  assert.throws(() => validateVerification(root, wrongArchive), /same archive/);
  const missingCheck = structuredClone(report); missingCheck.checks.unitTests = false;
  assert.throws(() => validateVerification(root, missingCheck), /unitTests/);
  put(root, 'dist/core/index.js', 'changed runtime');
  assert.throws(() => validateVerification(root, report), /Packed checkout file changed/);
  put(root, 'dist/core/index.js', "export const SEO_PACKAGE_VERSION = '0.2.0-rc.2';\n");
  put(root, '.artifacts/gerald-seo-0.2.0-rc.2.tgz', 'different archive');
  assert.throws(() => validateVerification(root, report), /archive changed/);
});

test('archive-content verification catches outdated docs and rejects unsafe paths', () => {
  const root = fixtureRoot(); const installed = mkdtempSync(path.join(tmpdir(), 'seo-installed-test-'));
  put(installed, 'README.md', 'Verified instructions');
  assert.equal(verifyArchiveContents(root, installed, [{path: 'README.md'}]).length, 1);
  put(installed, 'README.md', 'Old instructions');
  assert.throws(() => verifyArchiveContents(root, installed, [{path: 'README.md'}]), /differs from current checkout/);
  assert.throws(() => verifyArchiveContents(root, installed, [{path: 'docs/../../outside'}]), /Unsafe archive path/);
});

test('each consumer is fresh and only its package-under-test lock entry changes', () => {
  const root = fixtureRoot();
  put(root, '.test-consumers/portable-text/obsolete-route.js', 'must not leak');
  put(root, 'examples/portable-text/.next/stale-output', 'must not copy');
  const before = inputIdentity(root);
  const artifact = {path: path.join(root, '.artifacts/new.tgz'), integrity: 'sha512-new', manifest: {version: '0.2.0-rc.2', license: 'MIT', peerDependencies: {react: '>=19 <20'}}};
  const first = prepareConsumer(root, 'portable-text', artifact);
  put(first, 'deleted-between-runs.js', 'must not survive');
  const second = prepareConsumer(root, 'portable-text', artifact);
  assert.notEqual(first, second);
  assert.throws(() => readFileSync(path.join(second, 'obsolete-route.js')), {code: 'ENOENT'});
  assert.throws(() => readFileSync(path.join(second, 'deleted-between-runs.js')), {code: 'ENOENT'});
  assert.throws(() => readFileSync(path.join(second, '.next/stale-output')), {code: 'ENOENT'});
  const lock = JSON.parse(readFileSync(path.join(second, 'package-lock.json'), 'utf8'));
  assert.deepEqual(lock.packages['node_modules/react'], {version: '19.3.0', integrity: 'locked-react'});
  assert.equal(lock.packages['node_modules/@gerald/seo'].integrity, artifact.integrity);
  assert.equal(lock.packages['node_modules/@gerald/seo'].version, artifact.manifest.version);
  assert.deepEqual(inputIdentity(root), before, 'Generated outputs do not change source identity.');
});

test('the actual release CLI accepts current evidence and rejects changed source', () => {
  const root = fixtureRoot();
  for (const name of ['verification.mjs', 'check-release.mjs']) put(root, `scripts/${name}`, readFileSync(new URL(`../scripts/${name}`, import.meta.url), 'utf8'));
  saveVerification(root, passed(root));
  const run = () => spawnSync(process.execPath, [path.join(root, 'scripts/check-release.mjs')], {encoding: 'utf8', env: {...process.env, GITHUB_REF: ''}, windowsHide: true});
  assert.equal(run().status, 0, run().stderr);
  put(root, 'docs/usage.md', 'New unchecked instructions');
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /inputs changed/);
});
