import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {release} from 'node:os';

export const CONSUMERS = ['portable-text', 'custom-sections'];
const outputs = new Set(['node_modules', '.next', 'studio-dist', '.git']);
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
export const fileHash = (file, algorithm = 'sha256') => createHash(algorithm).update(readFileSync(file)).digest('hex');
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function inputFiles(root, directory) {
  const files = [];
  if (!existsSync(path.join(root, directory))) return files;
  for (const entry of readdirSync(path.join(root, directory), {withFileTypes: true})) {
    if (outputs.has(entry.name)) continue;
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...inputFiles(root, relative));
    else {
      assert.ok(entry.isFile(), `Verification inputs cannot contain symlinks: ${relative}`);
      files.push({path: relative, sha256: fileHash(path.join(root, relative))});
    }
  }
  return files;
}

export function inputIdentity(root) {
  const files = ['src', 'scripts', 'tests', 'examples', 'docs', '.github'].flatMap((directory) => inputFiles(root, directory));
  for (const name of ['package.json', 'package-lock.json', 'tsconfig.json', 'README.md', 'LICENSE', 'CHANGELOG.md']) {
    if (existsSync(path.join(root, name))) files.push({path: name, sha256: fileHash(path.join(root, name))});
  }
  files.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const fixtures = CONSUMERS.map((name) => ({name, sha256: digest(files.filter((file) => file.path.startsWith(`examples/${name}/`)))}));
  return {sha256: digest(files), files, fixtures};
}

export function saveVerification(root, report) {
  const target = path.join(root, '.artifacts/verification.json');
  mkdirSync(path.dirname(target), {recursive: true});
  const temporary = `${target}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  renameSync(temporary, target);
}

export function beginVerification(root) {
  const report = {schemaVersion: 2, status: 'running', runId: randomUUID(), startedAt: new Date().toISOString(), checks: {}, consumers: []};
  // Invalidate success before reading inputs or starting any fallible build/install work.
  saveVerification(root, report);
  return report;
}

export function verificationEnvironment(root) {
  const git = existsSync(path.join(root, '.git')) ? spawnSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8', windowsHide: true}) : undefined;
  return {gitCommit: git?.status === 0 ? git.stdout.trim() : null, platform: process.platform, osRelease: release(), arch: process.arch, node: process.version, npm: process.env.npm_config_user_agent?.match(/^npm\/(\S+)/)?.[1] ?? null};
}

export function installedVersions(directory) {
  return Object.fromEntries(['react', 'react-dom', 'sanity', '@sanity/ui', 'next', 'styled-components', 'typescript'].map((name) => [name, json(path.join(directory, 'node_modules', name, 'package.json')).version]));
}

export function prepareConsumer(root, name, artifact) {
  assert.ok(CONSUMERS.includes(name), 'Unknown consumer.');
  const parent = path.join(root, '.test-consumers');
  mkdirSync(parent, {recursive: true});
  const directory = mkdtempSync(path.join(parent, `${name}-`));
  cpSync(path.join(root, 'examples', name), directory, {recursive: true, filter: (source) => !outputs.has(path.basename(source))});
  const manifest = json(path.join(directory, 'package.json'));
  const lock = json(path.join(directory, 'package-lock.json'));
  assert.equal(lock.lockfileVersion, 3, 'Commit an npm v3 fixture lockfile.');
  assert.ok(lock.packages['node_modules/@gerald/seo'], 'Fixture lock must include the package under test.');
  const specifier = `file:${artifact.path.replaceAll('\\', '/')}`;
  manifest.dependencies['@gerald/seo'] = specifier;
  lock.packages[''].dependencies['@gerald/seo'] = specifier;
  const dependency = lock.packages['node_modules/@gerald/seo'];
  Object.assign(dependency, {version: artifact.manifest.version, resolved: specifier, integrity: artifact.integrity});
  for (const key of ['license', 'engines', 'dependencies', 'optionalDependencies', 'peerDependencies', 'peerDependenciesMeta']) {
    if (artifact.manifest[key] === undefined) delete dependency[key];
    else dependency[key] = artifact.manifest[key];
  }
  writeFileSync(path.join(directory, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(path.join(directory, 'package-lock.json'), JSON.stringify(lock, null, 2) + '\n');
  return directory;
}

export function verifyArchiveContents(root, installedRoot, files) {
  return files.map(({path: relative}) => {
    assert.ok(/^(dist\/|docs\/|package\.json$|README\.md$|LICENSE$|CHANGELOG\.md$)/.test(relative), `Unexpected archive file ${relative}`);
    assert.ok(!relative.split('/').some((segment) => ['..', 'node_modules'].includes(segment)), `Unsafe archive path ${relative}`);
    const sha256 = fileHash(path.join(installedRoot, relative));
    assert.equal(sha256, fileHash(path.join(root, relative)), `Archive differs from current checkout: ${relative}`);
    return {path: relative, sha256};
  });
}

export function validateVerification(root, report) {
  assert.equal(report.schemaVersion, 2, 'Old verification format: run the current verifier.');
  assert.equal(report.status, 'passed', 'Current verification did not pass.');
  assert.ok(report.runId && Number.isFinite(Date.parse(report.startedAt)) && Number.isFinite(Date.parse(report.finishedAt)), 'Missing verification run identity/time.');
  assert.ok(report.environment?.node && report.environment?.npm && report.environment?.platform, 'Missing verification toolchain.');
  for (const check of ['typecheck', 'unitTests', 'archiveContents', 'coreWithoutFrameworks']) assert.equal(report.checks?.[check], true, `Missing check: ${check}`);
  const current = inputIdentity(root);
  assert.equal(report.inputs?.sha256, current.sha256, 'Verification inputs changed; verify the finalized checkout.');
  assert.deepEqual(report.inputs.files, current.files, 'Verification input manifest changed.');
  assert.deepEqual(report.inputs.fixtures, current.fixtures, 'Verification fixture identity changed.');
  assert.deepEqual(report.consumers.map((consumer) => consumer.name).sort(), [...CONSUMERS].sort(), 'Expected both named consumers exactly once.');
  for (const consumer of report.consumers) {
    for (const check of ['lockedInstall', 'types', 'schema', 'studioBuild', 'nextBuild', 'http']) assert.equal(consumer[check], true, `${consumer.name}: missing ${check}`);
    assert.equal(consumer.fixtureSha256, current.fixtures.find((fixture) => fixture.name === consumer.name).sha256, 'Wrong consumer input identity.');
    assert.equal(consumer.artifactSha512, report.sha512, 'Consumers must test the same archive.');
    assert.ok(consumer.versions?.sanity && consumer.versions?.next && consumer.versions?.react, 'Missing installed consumer versions.');
  }
  assert.equal(path.basename(report.tarball), report.tarball, 'Archive must be inside .artifacts.');
  assert.equal(fileHash(path.join(root, '.artifacts', report.tarball), 'sha512'), report.sha512, 'Release archive changed after verification.');
  assert.ok(report.packedFiles?.length, 'Missing verified archive file identity.');
  for (const file of report.packedFiles) assert.equal(fileHash(path.join(root, file.path)), file.sha256, `Packed checkout file changed: ${file.path}`);
}
