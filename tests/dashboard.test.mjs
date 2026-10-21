import {test, mock} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createElement, act} from 'react';
import {ThemeProvider} from '@sanity/ui';
import {buildTheme} from '@sanity/ui/theme';

test('Health scans pages, filters issues, handles failures, and discards cancelled results', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {url: 'https://studio.example', pretendToBeVisual: true});
  for (const key of ['window', 'document', 'HTMLElement', 'Node', 'Event', 'MutationObserver', 'getComputedStyle']) Object.defineProperty(globalThis, key, {configurable: true, value: dom.window[key]});
  dom.window.matchMedia = () => ({matches: false, addEventListener() {}, removeEventListener() {}});
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let contentListener;
  let loadCount = 0;
  const client = {config: () => ({projectId: 'example', dataset: 'production'}), withConfig: () => client,
    listen: () => ({subscribe(observer) {contentListener = observer; queueMicrotask(() => observer.next({type: 'welcome'})); return {unsubscribe() {}};}})};
  let openEditor;
  mock.module('sanity', {exports: {useClient: () => client, useCurrentUser: () => ({id: 'editor'})}});
  mock.module('sanity/router', {exports: {IntentLink: ({children, params}) => createElement('a', {href: '/intent/' + params.id, 'data-path': params.path, onClick(event) {event.preventDefault(); openEditor?.(params);}}, children)}});
  const {SeoDashboard} = await import('../dist/sanity/dashboard.js');
  const {sourcePath} = await import('../dist/sanity/feedback.js');
  const {createRoot} = await import('react-dom/client');
  const root = createRoot(dom.window.document.getElementById('root'));
  const config = {site: {origin: 'https://production.example', name: 'Example'}, types: {page: {
    getPath: (doc) => '/' + doc._id,
    getContent: () => ({nodes: [{type: 'heading', level: 1, text: 'Page'}, {type: 'image', path: ['sections', {_key: 'item'}, 'image']}], issues: []}),
  }}};
  let fail = false;
  let finish;
  let defer = false;
  const options = {config, settings: false, loadDocuments: async ({cursor}) => {
    loadCount++;
    if (fail) throw new Error('Scan connection failed');
    if (defer) return new Promise((resolve) => {finish = resolve;});
    return {documents: [{_id: cursor ? 'two' : 'one', _type: 'page', title: cursor ? 'Second' : 'First'}], nextCursor: cursor ? undefined : 'one'};
  }};
  const text = () => dom.window.document.body.textContent;
  const theme = buildTheme();
  const render = async (view) => act(async () => root.render(createElement(ThemeProvider, {theme}, createElement(SeoDashboard, {key: view, options, view}))));
  const select = async (index, value) => act(async () => {
    const field = [...dom.window.document.querySelectorAll('select')][index];
    field.value = value; field.dispatchEvent(new dom.window.Event('change', {bubbles: true}));
  });
  const click = async (label) => {
    const button = [...dom.window.document.querySelectorAll('button')].find((item) => item.textContent === label);
    assert.ok(button, label);
    await act(async () => button.click());
  };
  try {
    await render('Health');
    assert.ok(text().includes('not scanned'));
    await click('Start scan');
    assert.ok(text().includes('1 scanned'));
    assert.ok(text().includes('1 incomplete'));
    assert.equal(dom.window.document.querySelector('a').dataset.path, 'seo');
    await select(1, 'page');
    for (const view of ['Overview', 'Optimize', 'Workflow', 'Health']) {
      await render(view);
      assert.ok(text().includes('1 scanned'));
      assert.equal(dom.window.document.querySelectorAll('select')[1].value, 'page');
      assert.ok(text().includes('0 stale'));
    }
    assert.equal(loadCount, 1, 'Changing views must not rescan.');
    await click('Scan next 25');
    assert.ok(text().includes('2 scanned'));
    assert.ok(text().includes('scan complete'));
    await select(2, 'ready');
    assert.ok(text().includes('No scanned documents match'));
    await render('Optimize');
    assert.equal(dom.window.document.querySelectorAll('select')[2].value, 'ready');
    await select(2, 'all');
    await act(async () => contentListener.next({type: 'mutation', documentId: 'one', resultRev: 'edited'}));
    assert.ok(text().includes('2 stale'));
    assert.ok(text().includes('Stale result:'));
    assert.ok(!text().includes('Readability:'), 'Old traffic lights must be hidden.');
    await click('Refresh scan');
    assert.ok(text().includes('0 stale'));
    openEditor = (params) => {
      assert.equal(params.id, 'one');
      assert.equal(params.path, 'sections[_key=="item"].image', 'Issue links must retain a keyed field path.');
      root.render(createElement('a', {href: '/editor/one'}, 'Editing document'));
    };
    const issueLink = [...dom.window.document.querySelectorAll('a')].find((link) => link.textContent === 'Edit field');
    assert.ok(issueLink);
    await act(async () => issueLink.click());
    await render('Health');
    assert.ok(text().includes('1 scanned'), 'Editor return retains results.');
    assert.ok(text().includes('1 stale'), 'A monitoring gap must not leave old rows fresh.');
    await click('Refresh scan');
    fail = true;
    await click('Refresh scan');
    assert.ok(text().includes('Scan connection failed'));
    fail = false; defer = true;
    await click('Start scan');
    await click('Cancel');
    await act(async () => finish({documents: [{_id: 'stale', _type: 'page', title: 'Stale result'}]}));
    assert.ok(!text().includes('Stale result'));
    defer = false;
    await select(0, 'drafts');
    await click('Start scan');
    await render('Workflow');
    assert.equal(dom.window.document.querySelector('select').value, 'drafts');
    await act(async () => contentListener.next({type: 'mutation', documentId: 'drafts.one'}));
    assert.ok(text().includes('1 stale'));
    await act(async () => contentListener.next({type: 'reconnect'}));
    assert.ok(text().includes('Content updates disconnected'));
    assert.equal([...dom.window.document.querySelectorAll('button')].find((item) => item.textContent === 'Refresh scan').disabled, true);
    await act(async () => contentListener.next({type: 'welcome'}));
    await click('Refresh scan');
    assert.ok(text().includes('0 stale'));
    assert.equal(sourcePath(['sections', {_key: 'a"b'}, 'heading']), 'sections[_key=="a\\"b"].heading');
  } finally {
    await act(async () => root.unmount()); dom.window.close(); mock.restoreAll(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
