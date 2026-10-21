import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {constants, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {beginVerification, CONSUMERS, fileHash, inputIdentity, installedVersions, prepareConsumer, saveVerification, validateVerification, verificationEnvironment, verifyArchiveContents} from './verification.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const report = beginVerification(root);
try {
const npm = process.env.npm_execpath;
assert.ok(npm && existsSync(npm), 'Run this check with npm run test:package.');
const env = {...process.env, npm_config_cache: path.join(root, '.npm-cache'), NEXT_TELEMETRY_DISABLED: '1', SANITY_TELEMETRY_DISABLED: '1', CI: '1'};
function run(args, cwd = root) {
  console.log(`Checking: npm ${args.join(' ')} (${path.relative(root, cwd) || '.'})`);
  const result = spawnSync(process.execPath, [npm, ...args], {cwd, env, encoding: 'utf8', timeout: 300_000, maxBuffer: 12 * 1024 * 1024, windowsHide: true});
  if (result.error || result.status !== 0) throw new Error(`${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

const artifacts = path.join(root, '.artifacts');
mkdirSync(artifacts, {recursive: true});
report.inputs = inputIdentity(root);
report.environment = verificationEnvironment(root);
report.environment.versions = installedVersions(root);
assert.ok(report.environment.npm, 'Run through npm so its version can be recorded.');
const sourceManifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const supplied = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
if (supplied) assert.ok(existsSync(supplied), 'Supplied tarball does not exist.');
else assert.ok(!existsSync(path.join(artifacts, `gerald-seo-${sourceManifest.version}.tgz`)), 'Archive already exists. Supply it explicitly to reverify, or use a new version; never overwrite a distributed archive.');
run(['run', 'typecheck']);
report.checks.typecheck = true;
const unitOutput = run(['test']);
report.checks.unitTests = true;
report.unitTests = {passed: true, count: Number(unitOutput.match(/^(?:#|ℹ) tests (\d+)/m)?.[1]) || null};
const [packed] = JSON.parse(run(supplied
  ? ['pack', supplied, '--dry-run', '--json', '--ignore-scripts']
  : ['pack', '--json', '--ignore-scripts', '--pack-destination', artifacts]));
assert.equal(packed.name, '@gerald/seo');
assert.equal(packed.version, sourceManifest.version, 'Archive version differs from the checkout.');
for (const file of packed.files) {
  assert.ok(/^(dist\/|docs\/|package\.json$|README\.md$|LICENSE$|CHANGELOG\.md$)/.test(file.path), `Unexpected packed file ${file.path}`);
  assert.ok(!file.path.includes('node_modules'), 'Dependencies must not be bundled.');
}
assert.ok(packed.files.some((file) => file.path === 'dist/sanity/input.js'));
const tarball = path.join(artifacts, packed.filename);
const original = supplied ?? path.join(artifacts, packed.filename);
if (path.resolve(original) !== path.resolve(tarball)) {
  if (existsSync(tarball)) assert.equal(fileHash(original, 'sha512'), fileHash(tarball, 'sha512'), 'A different archive already uses this version.');
  else copyFileSync(original, tarball, constants.COPYFILE_EXCL);
}
Object.assign(report, {version: packed.version, tarball: packed.filename, sha512: fileHash(tarball, 'sha512'), integrity: packed.integrity, files: packed.files.length});

const coreDirectory = mkdtempSync(path.join(tmpdir(), 'gerald-seo-core-'));
writeFileSync(path.join(coreDirectory, 'package.json'), JSON.stringify({private: true, type: 'module', dependencies: {'@gerald/seo': `file:${tarball.replaceAll('\\', '/')}`}}));
run(['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline', '--fetch-retries=0'], coreDirectory);
const installedRoot = path.join(coreDirectory, 'node_modules/@gerald/seo');
report.packedFiles = verifyArchiveContents(root, installedRoot, packed.files);
report.checks.archiveContents = true;
const installedManifest = JSON.parse(readFileSync(path.join(installedRoot, 'package.json'), 'utf8'));
assert.ok(readFileSync(path.join(installedRoot, 'dist/sanity/input.js'), 'utf8').startsWith("'use client'"));
assert.ok(readFileSync(path.join(installedRoot, 'dist/sanity/dashboard.js'), 'utf8').startsWith("'use client'"));
const coreCheck = spawnSync(process.execPath, ['--input-type=module', '-e', `
  import assert from 'node:assert/strict';
  import {resolveSeo} from '@gerald/seo/core';
  for (const peer of ['react', 'sanity', 'next']) await assert.rejects(import(peer), {code: 'ERR_MODULE_NOT_FOUND'});
  const config = {site: {origin: 'https://example.com', name: 'Core only'}, types: {page: {getPath: () => '/'}}};
  assert.equal(resolveSeo(config, {_type: 'page'}).title, 'Core only');
`], {cwd: coreDirectory, env, encoding: 'utf8', windowsHide: true});
assert.equal(coreCheck.status, 0, coreCheck.stderr);
report.checks.coreWithoutFrameworks = true;

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  const {port} = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

for (const name of CONSUMERS) {
  const cwd = prepareConsumer(root, name, {path: tarball, integrity: packed.integrity, manifest: installedManifest});
  run(['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline', '--fetch-retries=0'], cwd);
  assert.ok(existsSync(path.join(cwd, 'node_modules/@gerald/seo/dist/core/index.js')), 'Package must be installed in the consumer.');
  run(['exec', '--', 'tsc', '--ignoreConfig', '--strict', '--noEmit', '--skipLibCheck', '--module', 'NodeNext', '--target', 'ES2022', 'consumer-types.ts'], cwd);
  run(['exec', '--', 'sanity', 'schema', 'extract', '--path', 'schema-check.json', '--force'], cwd);
  run(['run', 'build:studio'], cwd);
  run(['run', 'build'], cwd);

  const {expected} = await import(new URL(`${path.relative(root, cwd).replaceAll('\\', '/')}/seo.config.mjs`, new URL('../', import.meta.url)));
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(cwd, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {cwd, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true});
  let logs = '';
  child.stdout.on('data', (chunk) => {logs += chunk;});
  child.stderr.on('data', (chunk) => {logs += chunk;});
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error(`Next exited early: ${logs}`);
      try {const response = await fetch(base, {signal: AbortSignal.timeout(1000)}); if (response.ok) {ready = true; break;}} catch {}
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.ok(ready, `Next did not start: ${logs}`);
    for (const userAgent of ['Mozilla/5.0', 'Googlebot', 'Twitterbot']) {
      const response = await fetch(base + expected.path, {headers: {'user-agent': userAgent}});
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(`<title>${expected.title}</title>`), 'Resolved title must reach HTTP output.');
      assert.ok(html.includes(`href="${expected.origin}${expected.path}"`), 'Production canonical missing.');
      assert.ok(html.includes('application/ld+json'), 'JSON-LD missing.');
      assert.ok(html.includes(`property="og:title" content="${expected.socialTitle}"`), 'Resolved sharing title must reach Open Graph.');
      assert.ok(html.includes(`name="twitter:title" content="${expected.socialTitle}"`), 'Resolved sharing title must reach X.');
      assert.ok(html.includes(`property="og:image" content="${expected.image}"`), 'Settings image must reach social output.');
      assert.ok(!html.includes('Private draft'), 'Draft data leaked.');
    }
    const sitemap = await (await fetch(base + '/sitemap.xml')).text();
    assert.ok(sitemap.includes(`<loc>${expected.origin}${expected.path}</loc>`));
    assert.ok(!/<loc>[^<]*(?:draft|hidden|alias)/.test(sitemap), 'Sitemap contains excluded content.');
    const robots = await (await fetch(base + '/robots.txt')).text();
    assert.ok(robots.includes(`Sitemap: ${expected.origin}/sitemap.xml`));
    const hiddenPath = name === 'portable-text' ? '/hidden' : '/articles/hidden';
    const hidden = await (await fetch(base + hiddenPath)).text();
    assert.match(hidden, /name="robots" content="noindex, follow"/);
    assert.ok(!/<link rel="canonical"/.test(hidden));
    assert.equal((await fetch(base + '/missing-route')).status, 404);
    report.consumers.push({name, directory: path.relative(root, cwd), fixtureSha256: report.inputs.fixtures.find((fixture) => fixture.name === name).sha256, artifactSha512: report.sha512, versions: installedVersions(cwd), lockedInstall: true, types: true, schema: true, studioBuild: true, nextBuild: true, http: true});
  } finally {
    child.kill();
    await new Promise((resolve) => {if (child.exitCode !== null) resolve(); else child.once('exit', resolve);});
  }
}
report.status = 'passed';
report.finishedAt = new Date().toISOString();
validateVerification(root, report);
saveVerification(root, report);
console.log(JSON.stringify({status: report.status, runId: report.runId, version: report.version, tarball: report.tarball, sha512: report.sha512, consumers: report.consumers.map((consumer) => consumer.name), report: '.artifacts/verification.json'}, null, 2));
} catch (error) {
  report.status = 'failed';
  report.finishedAt = new Date().toISOString();
  report.error = error instanceof Error ? error.message.split('\n')[0] : 'Verification failed.';
  saveVerification(root, report);
  throw error;
}
