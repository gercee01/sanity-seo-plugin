import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defineSeoConfig, resolveSeo, portableTextContent, mergeContent, sanityImageResolver, analyzeSeo, routeUrl} from '../dist/core/index.js';

const body = [{_type: 'block', _key: 'intro', style: 'normal', children: [{_type: 'span', text: 'Useful SEO guidance for editors.', marks: []}]}];
const config = defineSeoConfig({
  site: {origin: 'https://example.com', name: 'Example', description: 'Site description', image: {url: 'https://example.com/share.png'}},
  types: {page: {getPath: (doc) => doc.home ? '/' : doc.slug ? `/${doc.slug}` : null, getContent: (doc) => mergeContent({nodes: [{type: 'heading', level: 1, text: String(doc.title)}], issues: []}, portableTextContent(doc.body, ['body']))}},
});
const page = {_id: 'page-1', _type: 'page', slug: 'guidance', title: 'SEO guidance', body};

test('defaults and whitespace-only overrides agree with their sources', () => {
  const resolved = resolveSeo(config, {...page, seo: {title: ' ', description: '\n'}});
  assert.equal(resolved.title, 'SEO guidance | Example');
  assert.equal(resolved.description, 'Useful SEO guidance for editors.');
  assert.equal(resolved.sources.image, 'site');
  assert.equal(resolved.url, 'https://example.com/guidance');
  assert.equal(resolveSeo(config, {...page, title: 'Example'}).title, 'Example');
  assert.equal(resolveSeo(config, {...page, title: 'SEO guidance | Example'}).title, 'SEO guidance | Example');
  assert.equal(resolveSeo(config, {...page, seo: {title: 'Exact title'}}).title, 'Exact title');
});

test('missing content and old documents work without a schema migration', () => {
  const resolved = resolveSeo(config, {_type: 'page', home: true});
  assert.equal(resolved.title, 'Example');
  assert.equal(resolved.description, 'Site description');
  assert.equal(resolved.routeUrl, 'https://example.com/');
});

for (const [label, patch, options] of [
  ['noindex', {seo: {indexing: 'noindex'}}, {}], ['draft', {_id: 'drafts.page-1'}, {}],
  ['release', {_id: 'versions.launch.page-1'}, {}], ['preview', {}, {preview: true}],
]) test(`${label} cannot enter a public sitemap or emit an indexing canonical`, () => {
  const result = resolveSeo(config, {...page, ...patch}, options);
  assert.equal(result.index, false);
  assert.equal(result.canonical, undefined);
  assert.equal(result.sitemapEligible, false);
});

test('type defaults can be explicitly overridden', () => {
  const local = {...config, types: {page: {...config.types.page, indexing: 'noindex'}}};
  assert.equal(resolveSeo(local, page).index, false);
  assert.equal(resolveSeo(local, {...page, seo: {indexing: 'inherit'}}).index, false);
  assert.equal(resolveSeo(local, {...page, seo: {indexing: 'index'}}).index, true);
});

test('same-site and cross-site canonical aliases stay out of the sitemap', () => {
  for (const url of ['https://example.com/original', 'https://other.example/original']) {
    const result = resolveSeo(config, {...page, seo: {canonicalUrl: url}});
    assert.equal(result.url, url);
    assert.equal(result.sitemapEligible, false);
  }
});

test('trust boundaries reject unsafe URLs, dates and indexing values', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'https://user:pass@example.com']) {
    assert.throws(() => resolveSeo(config, {...page, seo: {canonicalUrl: url}}));
    assert.throws(() => resolveSeo(config, {...page, image: {url}}));
  }
  assert.throws(() => resolveSeo(config, {...page, seo: {indexing: 'maybe'}}));
  assert.throws(() => resolveSeo(config, {...page, publishedAt: 'not-a-date'}));
  assert.throws(() => resolveSeo(config, {...page, image: {url: 'https://example.com/a', width: -1}}));
  assert.throws(() => defineSeoConfig({...config, site: {...config.site, origin: 'https://example.com/path'}}));
  assert.throws(() => defineSeoConfig({...config, types: {}}));
  assert.throws(() => resolveSeo(config, {...page, _type: 'toString'}));
  assert.throws(() => resolveSeo(config, {...page, slug: undefined}));
});

test('path normalization stays on the configured host', () => {
  assert.equal(routeUrl('https://example.com', '/articles/some%20title/'), 'https://example.com/articles/some%20title/');
  for (const value of ['//evil.example', '/\\evil.example', 'relative', '/hello?x=1', '/hello#x', '/\n/evil']) assert.throws(() => routeUrl('https://example.com', value));
});

test('alternate schemas and routes require only an adapter', () => {
  const other = defineSeoConfig({site: {origin: 'https://journal.example', name: 'Journal'}, seoField: 'search', types: {story: {
    getPath: (doc) => `/journal/${doc.handle}`, getTitle: (doc) => doc.headline,
    getContent: (doc) => portableTextContent(doc.copy), getSeo: (doc) => doc.search, kind: 'article',
  }}});
  const resolved = resolveSeo(other, {_type: 'story', handle: 'hello', headline: 'Hello', copy: body, search: {description: 'Custom description'}});
  assert.equal(resolved.url, 'https://journal.example/journal/hello');
  assert.equal(resolved.title, 'Hello | Journal');
  assert.equal(resolved.description, 'Custom description');
  assert.equal(resolved.kind, 'article');
});

test('Portable Text preserves semantics, text spans and source keys', () => {
  const extracted = portableTextContent([{_type: 'block', _key: 'h', style: 'h2', children: [
    {_type: 'span', text: 'A ', marks: []}, {_type: 'span', text: 'link', marks: ['a']},
  ], markDefs: [{_type: 'link', _key: 'a', href: '/destination'}]}], ['copy']);
  assert.deepEqual(extracted.nodes[0], {type: 'heading', text: 'A link', level: 2, path: ['copy', {_key: 'h'}]});
  assert.equal(extracted.nodes[1].href, '/destination');
  assert.equal(extracted.nodes[1].text, 'link');
  assert.deepEqual(extracted.issues, []);
});

test('custom blocks, inline objects and unresolved links disclose coverage limits', () => {
  const extracted = portableTextContent([{_type: 'hero'}, {_type: 'block', children: [{_type: 'widget'}, {_type: 'span', text: 'Target', marks: ['x']}], markDefs: [{_key: 'x', _type: 'internalLink', reference: {_ref: 'id'}}]}]);
  assert.equal(extracted.issues.length, 3);
  assert.equal(extracted.nodes.find((node) => node.type === 'link').href, undefined);
});

test('image references resolve without requiring a framework', () => {
  const image = sanityImageResolver({projectId: 'demo1234', dataset: 'production'});
  assert.match(image({asset: {_ref: 'image-abc123-800x600-jpg'}, alt: 'A useful image'}).url, /^https:\/\/cdn.sanity.io\/images\/demo1234\/production\/abc123-800x600.jpg\?/);
  assert.equal(image({asset: {_ref: 'file-abc'}}), undefined);
  assert.throws(() => sanityImageResolver({projectId: '../unsafe', dataset: 'production'}));
});

test('resolution does not mutate the host document or extracted content', () => {
  const content = {nodes: [], issues: []};
  Object.freeze(content.issues); Object.freeze(content.nodes); Object.freeze(content);
  const local = {...config, types: {page: {...config.types.page, getContent: () => content}}};
  const doc = Object.freeze({...page, seo: Object.freeze({image: {asset: {_ref: 'unresolved'}}})});
  const resolved = resolveSeo(local, doc);
  assert.equal(resolved.content.issues.length, 1);
  assert.equal(content.issues.length, 0);
});

test('analysis is advisory and respects keyphrase word boundaries', () => {
  const result = analyzeSeo(resolveSeo(config, {...page, seo: {focusKeyphrase: 'SEO'}}));
  assert.equal(result.find((check) => check.id === 'keyphrase-title').status, 'good');
  assert.equal(result.find((check) => check.id === 'h1').status, 'good');
  const boundary = analyzeSeo(resolveSeo(config, {...page, title: 'Seoul travel', seo: {focusKeyphrase: 'SEO'}}));
  assert.equal(boundary.find((check) => check.id === 'keyphrase-title').status, 'warning');
});

test('unsupported language and content are not reported as passing', () => {
  const result = analyzeSeo(resolveSeo(config, page, {site: {language: 'fr'}}));
  assert.equal(result.find((check) => check.id === 'readability-language').status, 'unavailable');
  const empty = resolveSeo({...config, types: {page: {getPath: () => '/'}}}, page);
  assert.equal(analyzeSeo(empty).find((check) => check.id === 'content').status, 'unavailable');
});

test('heading jumps, missing alt, generic links and lengthy paragraphs produce feedback', () => {
  const local = {...config, types: {page: {...config.types.page, getContent: () => ({nodes: [
    {type: 'heading', level: 3, text: 'Jump'}, {type: 'image'},
    {type: 'image', decorative: true}, {type: 'link', text: 'Click here', href: 'javascript:alert(1)'},
    {type: 'paragraph', text: 'Word '.repeat(180)},
  ], issues: []})}}};
  const checks = analyzeSeo(resolveSeo(local, page));
  for (const id of ['heading-order', 'image-alt-1', 'link-text-3', 'link-target-3', 'paragraph-0']) assert.equal(checks.find((check) => check.id === id).status, 'warning', id);
  assert.equal(checks.find((check) => check.id === 'image-alt-2').status, 'good');
});
