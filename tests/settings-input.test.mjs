import {test, mock} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createElement, act} from 'react';
import {ThemeProvider} from '@sanity/ui';
import {buildTheme} from '@sanity/ui/theme';

test('document preview follows draft settings updates and exposes connection failures without losing inputs', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {url: 'https://studio.example', pretendToBeVisual: true});
  for (const key of ['window', 'document', 'HTMLElement', 'Node', 'Event', 'MutationObserver', 'getComputedStyle']) Object.defineProperty(globalThis, key, {configurable: true, value: dom.window[key]});
  dom.window.matchMedia = () => ({matches: false, addEventListener() {}, removeEventListener() {}});
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const document = {_id: 'drafts.page', _type: 'page', title: 'Unsaved title'};
  let settings = {_rev: 'draft-1', site: {name: 'Draft site'}};
  let listener;
  let fail = false;
  let unsubscribed = false;
  const client = {
    withConfig(options) {assert.equal(options.perspective, 'drafts'); return client;},
    async fetch() {if (fail) throw new Error('Settings unavailable'); return settings;},
    listen(query, params) {assert.equal(params.draftId, 'drafts.geraldSeoSettings'); return {subscribe(observer) {listener = observer; return {unsubscribe() {unsubscribed = true;}};}};},
  };
  mock.module('sanity', {exports: {useFormValue: () => document, useClient: () => client}});
  const {SeoInput} = await import('../dist/sanity/input.js');
  const {createRoot} = await import('react-dom/client');
  const root = createRoot(dom.window.document.getElementById('root'));
  const config = {site: {origin: 'https://example.com', name: 'Code site'}, types: {page: {getPath: () => '/'}}};
  const delay = () => new Promise((resolve) => setTimeout(resolve, 560));
  const body = () => dom.window.document.body.textContent;
  try {
    await act(async () => root.render(createElement(ThemeProvider, {theme: buildTheme()}, createElement(SeoInput, {config, renderDefault: () => createElement('input', {'aria-label': 'Normal input'})}))));
    await act(delay);
    assert.ok(body().includes('Unsaved title | Draft site'));
    settings = {_rev: 'draft-2', site: {name: 'Updated defaults'}};
    await act(async () => listener.next({}));
    await act(delay);
    assert.ok(body().includes('Unsaved title | Updated defaults'));
    fail = true;
    await act(async () => listener.next({}));
    await act(delay);
    assert.ok(body().includes('Settings unavailable'));
    assert.ok(dom.window.document.querySelector('input[aria-label="Normal input"]'));
    assert.ok(!body().includes('Unsaved title | Updated defaults'), 'Do not show stale preview as current after a settings failure.');
  } finally {
    await act(async () => root.unmount()); assert.equal(unsubscribed, true); dom.window.close(); mock.restoreAll(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
