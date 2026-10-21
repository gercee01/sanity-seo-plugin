import {test, mock} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createElement, act} from 'react';
import {ThemeProvider} from '@sanity/ui';
import {buildTheme} from '@sanity/ui/theme';

test('editorial preview follows unsaved values, preserves inputs on failure and ignores stale context', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {url: 'https://studio.example', pretendToBeVisual: true});
  for (const key of ['window', 'document', 'HTMLElement', 'Node', 'Event', 'MutationObserver', 'getComputedStyle']) {
    Object.defineProperty(globalThis, key, {configurable: true, value: dom.window[key]});
  }
  dom.window.matchMedia = () => ({matches: false, addEventListener() {}, removeEventListener() {}});
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let document = {_id: 'drafts.page', _type: 'page', title: 'Unsaved first title', seo: {}};
  const client = {withConfig(options) {assert.equal(options.perspective, 'drafts'); return client;}};
  mock.module('sanity', {exports: {useFormValue: () => document, useClient: () => client}});
  const {SeoInput} = await import('../dist/sanity/input.js');
  const {createRoot} = await import('react-dom/client');
  const root = createRoot(dom.window.document.getElementById('root'));
  const config = {site: {origin: 'https://production.example', name: 'Example'}, types: {page: {getPath: () => '/page'}}};
  const theme = buildTheme();
  const delay = () => new Promise((resolve) => setTimeout(resolve, 560));
  const renderDefault = () => createElement('input', {'aria-label': 'Search title', defaultValue: 'Editable input'});
  const render = async (loadContext) => act(async () => root.render(createElement(ThemeProvider, {theme}, createElement(SeoInput, {config, settings: false, loadContext, renderDefault}))));
  try {
    await render();
    await act(delay);
    const body = () => dom.window.document.body.textContent;
    assert.ok(body().includes('Unsaved first title | Example'));
    assert.ok(body().includes('This page allows indexing.'), 'Draft editing must show intended publication indexing.');
    assert.ok(dom.window.document.querySelector('input[aria-label="Search title"]'));

    document = {...document, seo: {title: 'Override from an unsaved edit'}};
    await render();
    await act(delay);
    assert.ok(body().includes('Override from an unsaved edit'));

    document = {...document, title: 'Old request', seo: {}};
    let finishOld;
    let oldSignal;
    const loader = (doc, client, {signal}) => {
      if (doc.title === 'Old request') oldSignal = signal;
      return doc.title === 'Old request'
      ? new Promise((resolve) => {finishOld = resolve;})
      : Promise.resolve({site: {name: 'New defaults'}});
    };
    await render(loader);
    await act(delay);
    assert.equal(typeof finishOld, 'function');
    document = {...document, title: 'Latest edit'};
    await render(loader);
    assert.equal(oldSignal.aborted, true, 'A later edit cancels reference work.');
    await act(delay);
    assert.ok(body().includes('Latest edit | New defaults'));
    await act(async () => finishOld({site: {name: 'Stale defaults'}}));
    assert.ok(!body().includes('Stale defaults'));

    await render(async () => {throw new Error('Context unavailable');});
    await act(delay);
    assert.ok(body().includes('Context unavailable'));
    assert.ok(dom.window.document.querySelector('input[aria-label="Search title"]'), 'Analysis failure must not remove the normal editor.');
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    mock.restoreAll();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
