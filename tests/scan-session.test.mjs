import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createScanSession, getScanSession} from '../dist/sanity/scan-session.js';
import {scanSeoPage} from '../dist/sanity/scan.js';

function fixture() {
  let observer;
  let unsubscribed = 0;
  const client = {config: () => ({projectId: 'example', dataset: 'production'}), withConfig: () => client,
    listen(query, params, options) {
      assert.equal(query, '*'); assert.equal(options.includeAllVersions, true); assert.equal(options.includeResult, false);
      return {subscribe(value) {observer = value; queueMicrotask(() => observer.next({type: 'welcome'})); return {unsubscribe() {unsubscribed++;}};}};
    }};
  const config = {site: {origin: 'https://example.com', name: 'Example'}, types: {page: {getPath: () => '/page'}}};
  const options = {config, settings: false, loadDocuments: async () => ({documents: [{_id: 'one', _type: 'page', _rev: 'rev1', title: 'Page'}]})};
  const snapshot = {settings: {}, exists: false};
  const session = createScanSession();
  session.syncInputs(options, snapshot);
  return {client, options, snapshot, session, event: (value) => observer.next(value), error: () => observer.error(new Error('Offline')), complete: () => observer.complete(), unsubscribed: () => unsubscribed};
}

test('session identity includes revision/settings/analyzer/adapter and invalidates changed inputs', async () => {
  const f = fixture(); const disconnect = f.session.connect(f.client); await Promise.resolve();
  try {
    await f.session.scan(f.options, f.client, f.snapshot, true);
    const initial = f.session.getSnapshot().reviews[0];
    assert.equal(initial.identity.document, 'rev1');
    assert.equal(initial.identity.analyzer, '0.2.1');
    f.snapshot = {...f.snapshot, settings: {site: {name: 'Changed settings'}}, revision: 'settings2'};
    f.session.syncInputs(f.options, f.snapshot);
    assert.match(f.session.getSnapshot().reviews[0].stale, /settings changed/);
    await f.session.scan(f.options, f.client, f.snapshot, true);
    f.options.config.types.page.getPath = () => '/changed';
    f.session.syncInputs(f.options, f.snapshot);
    assert.match(f.session.getSnapshot().reviews[0].stale, /mapping or analyzer changed/);
    await f.session.scan(f.options, f.client, f.snapshot, true);
    assert.equal(f.session.getSnapshot().reviews[0].identity.adapter, 1);
    assert.equal(f.session.getSnapshot().reviews[0].stale, undefined);
  } finally {disconnect(); await Promise.resolve();}
});

test('published/draft/reference changes, listener failure and returning from an editor invalidate safely', async () => {
  const f = fixture(); let disconnect = f.session.connect(f.client); await Promise.resolve();
  await f.session.scan(f.options, f.client, f.snapshot, true);
  f.event({type: 'mutation', documentId: 'drafts.one'});
  f.event({type: 'mutation', documentId: 'versions.release.one'});
  assert.equal(f.session.getSnapshot().reviews[0].stale, undefined);
  f.event({type: 'mutation', documentId: 'author-reference'});
  assert.match(f.session.getSnapshot().reviews[0].stale, /referenced document changed/);
  assert.equal(f.session.getSnapshot().complete, false);
  await f.session.scan(f.options, f.client, f.snapshot, true);
  f.error();
  assert.equal(f.session.getSnapshot().monitoring, false);
  assert.match(f.session.getSnapshot().monitorError, /unavailable/);
  const old = f.session.getSnapshot().reviews;
  await f.session.scan(f.options, f.client, f.snapshot, true);
  assert.equal(f.session.getSnapshot().reviews, old, 'Disconnected scans must not replace evidence.');
  disconnect(); await Promise.resolve();
  assert.equal(f.unsubscribed(), 1);
  disconnect = f.session.connect(f.client); await Promise.resolve();
  assert.match(f.session.getSnapshot().reviews[0].stale, /connected/);
  f.session.setPerspective('drafts');
  assert.equal(f.session.getSnapshot().reviews.length, 0);
  await f.session.scan(f.options, f.client, f.snapshot, true);
  f.event({type: 'mutation', documentId: 'drafts.one'});
  assert.ok(f.session.getSnapshot().reviews[0].stale);
  disconnect(); await Promise.resolve();
});

test('settings or document changes abort in-flight context, including callbacks that ignore abort', async () => {
  const f = fixture(); const disconnect = f.session.connect(f.client); await Promise.resolve();
  let finish; let signal;
  f.options.loadContext = async (document, client, context) => {
    signal = context.signal;
    return new Promise((resolve) => {finish = resolve;});
  };
  const run = f.session.scan(f.options, f.client, f.snapshot, true);
  await Promise.resolve();
  f.event({type: 'mutation', documentId: 'one'});
  assert.equal(signal.aborted, true);
  finish({site: {name: 'Old result'}}); await run;
  assert.equal(f.session.getSnapshot().reviews.length, 0);
  assert.equal(f.session.getSnapshot().busy, false);

  const run2 = f.session.scan(f.options, f.client, f.snapshot, true); await Promise.resolve();
  f.session.syncInputs(f.options, {...f.snapshot, revision: 'settings2'});
  assert.equal(signal.aborted, true);
  finish({}); await run2;
  assert.equal(f.session.getSnapshot().reviews.length, 0);
  disconnect(); await Promise.resolve();
});

test('leaving the dashboard aborts work and ignores late listener events', async () => {
  const f = fixture(); const disconnect = f.session.connect(f.client); await Promise.resolve();
  let finish; let signal;
  f.options.loadDocuments = ({signal: value}) => {signal = value; return new Promise((resolve) => {finish = resolve;});};
  const run = f.session.scan(f.options, f.client, f.snapshot, true);
  disconnect(); await Promise.resolve();
  assert.equal(signal.aborted, true);
  const before = f.session.getSnapshot();
  f.event({type: 'welcome'});
  assert.equal(f.session.getSnapshot(), before);
  finish({documents: [{_id: 'late', _type: 'page'}]}); await run;
  assert.equal(f.session.getSnapshot().reviews.length, 0);
});

test('sessions are shared only within the configured plugin and project/dataset', () => {
  const f = fixture();
  assert.equal(getScanSession(f.options, f.client), getScanSession(f.options, f.client));
  const otherDataset = {...f.client, config: () => ({projectId: 'example', dataset: 'staging'})};
  assert.notEqual(getScanSession(f.options, f.client), getScanSession(f.options, otherDataset));
  assert.notEqual(getScanSession(f.options, f.client), getScanSession({...f.options}, f.client));
  assert.notEqual(getScanSession(f.options, f.client, 'editor'), getScanSession(f.options, f.client, 'viewer'));
});

test('pre-cancelled scans never call the host document loader', async () => {
  const f = fixture(); let called = false;
  f.options.loadDocuments = async () => {called = true; return {documents: []};};
  await assert.rejects(scanSeoPage(f.options, {client: f.client, perspective: 'published', signal: AbortSignal.abort()}, f.snapshot), {name: 'AbortError'});
  assert.equal(called, false);
});

test('a completed content stream cannot leave old results fresh', async () => {
  const f = fixture(); const disconnect = f.session.connect(f.client); await Promise.resolve();
  await f.session.scan(f.options, f.client, f.snapshot, true);
  f.complete();
  assert.equal(f.session.getSnapshot().monitoring, false);
  assert.ok(f.session.getSnapshot().reviews[0].stale);
  disconnect(); await Promise.resolve();
});
