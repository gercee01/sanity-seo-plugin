import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSeoSettings, resolveSeo, formatSeoTitle, summarizeSeo, reviewSeoDocument, SEO_SETTINGS_PROJECTION} from '../dist/core/index.js';
import {createMetadata, createSitemap, buildJsonLd} from '../dist/next/index.js';
import {loadSeoSettings} from '../dist/sanity/settings.js';
import {scanSeoPage} from '../dist/sanity/scan.js';

const config = {site: {origin: 'https://example.com', name: 'Code site', description: 'Code description', publisher: {name: 'Original publisher', type: 'Organization', logo: {url: 'https://example.com/logo.png'}}}, types: {page: {getPath: (doc) => '/' + (doc.slug ?? ''), getContent: () => ({nodes: [{type: 'heading', text: 'Main', level: 1}, {type: 'paragraph', text: 'A clear introduction for our readers.'}], issues: []})}}};
const document = {_id: 'one', _type: 'page', title: 'A guide', slug: 'guide'};
const snapshot = {exists: true, revision: 'r1', settings: {site: {name: 'CMS site'}}};

test('CMS settings merge nested publisher values and reach Next metadata/schema without changing the origin', () => {
  const settings = normalizeSeoSettings({site: {name: 'CMS name', publisher: {name: 'New publisher'}}, separator: '–', contentTypes: [{type: 'page', titleTemplate: '{title} {separator} {siteName}'}]});
  const seo = resolveSeo(config, document, {settings});
  assert.equal(seo.title, 'A guide – CMS name');
  assert.equal(seo.site.publisher.type, 'Organization');
  assert.equal(seo.site.publisher.logo.url, 'https://example.com/logo.png');
  assert.equal(seo.site.origin, config.site.origin);
  assert.equal(createMetadata(config, document, {settings}).title.absolute, seo.title);
  assert.equal(buildJsonLd(seo)['@graph'].find((node) => node['@type'] === 'Organization').name, 'New publisher');
});

test('missing, blank and partial settings retain defaults, and title overrides stay literal', () => {
  assert.deepEqual(normalizeSeoSettings(null), {});
  const settings = normalizeSeoSettings({site: {name: '  ', publisher: {name: ''}}, contentTypes: [{type: 'page', titleTemplate: ' '}]});
  assert.equal(resolveSeo(config, document, {settings}).title, 'A guide | Code site');
  assert.equal(resolveSeo(config, {...document, seo: {title: 'Exact'}}, {settings: {types: {page: {titleTemplate: '{siteName}: {title}'}}}}).title, 'Exact');
  assert.equal(formatSeoTitle('A guide | Code site', 'Code site'), 'A guide | Code site');
  assert.equal(formatSeoTitle(undefined, 'Code site', '–', '{title} {separator} {siteName}'), 'Code site');
  assert.equal(formatSeoTitle('Code site', 'Code site'), 'Code site');
  assert.equal(formatSeoTitle('A guide | Code site', 'Code site', '–'), 'A guide – Code site');
});

test('CMS indexing defaults apply to sitemap but cannot override draft/staging safeguards', () => {
  const settings = {types: {page: {indexing: 'noindex'}}};
  assert.equal(resolveSeo(config, document, {settings}).index, false);
  assert.deepEqual(createSitemap(config, [document], {settings}), []);
  const index = {...document, seo: {indexing: 'index'}};
  assert.equal(resolveSeo(config, index, {settings}).index, true);
  assert.equal(resolveSeo(config, index, {settings, preview: true}).index, false);
  assert.equal(resolveSeo(config, {...index, _id: 'drafts.one'}, {settings}).index, false);
});

test('independent sharing overrides and fallbacks reach OG/X without altering search or schema', () => {
  const doc = {...document, seo: {title: 'Search title', image: {url: 'https://example.com/content.png'}, social: {title: 'Sharing title', description: 'Sharing description', image: {url: 'https://example.com/share.png'}, card: 'summary'}}};
  const metadata = createMetadata(config, doc, {settings: {social: {site: '@example'}}});
  assert.equal(metadata.title.absolute, 'Search title');
  assert.equal(metadata.openGraph.title, 'Sharing title');
  assert.equal(metadata.twitter.description, 'Sharing description');
  assert.equal(metadata.twitter.card, 'summary');
  assert.equal(metadata.twitter.site, '@example');
  assert.equal(metadata.openGraph.images[0].url, 'https://example.com/share.png');
  assert.equal(resolveSeo(config, {...doc, seo: {...doc.seo, social: {title: ' '}}}).social.title, 'Search title');
  assert.equal(resolveSeo(config, doc).image.url, 'https://example.com/content.png');
});

test('settings trust boundary rejects malformed configuration and unsafe media', () => {
  for (const input of [[], 3, {origin: 'https://evil.example'}, {site: {origin: 'https://evil.example'}}, {site: {language: 'not a language'}}, {site: {name: 42}}, {site: {publisher: {type: 'Business'}}}, {separator: '\n'}, {separator: '{}'}, {contentTypes: [{type: 'page', titleTemplate: '{execute}'}]}, {contentTypes: [{type: 'page'}, {type: 'page'}]}, {types: {page: {indexing: 'maybe'}}}, {social: {card: 'player'}}, {social: {site: 'invalid account'}}, {site: {image: {url: 'javascript:alert(1)'}}}, {site: {image: {asset: {_ref: 'unresolved'}}}}, {site: {image: {url: 'https://example.com/x', width: -1}}}]) {
    assert.throws(() => normalizeSeoSettings(input), undefined, JSON.stringify(input));
  }
  assert.match(SEO_SETTINGS_PROJECTION, /contentTypes/);
});

test('settings media can be mapped from Sanity references', () => {
  const settings = normalizeSeoSettings({site: {image: {asset: {_ref: 'image-a'}}}}, {resolveImage: () => ({url: 'https://cdn.sanity.io/example.png'})});
  assert.equal(settings.site.image.url, 'https://cdn.sanity.io/example.png');
});

test('traffic lights separate SEO/readability and never mark incomplete analysis ready', () => {
  const good = [{id: 'title', category: 'metadata', status: 'good'}, {id: 'sentence-length', category: 'readability', status: 'good'}];
  assert.equal(summarizeSeo(good).state, 'ready');
  assert.equal(summarizeSeo([...good, {id: 'description', category: 'metadata', status: 'warning'}]).seo, 'problem');
  assert.equal(summarizeSeo([...good, {id: 'paragraph', category: 'readability', status: 'warning'}]).readability, 'improvement');
  const partial = summarizeSeo([...good, {id: 'coverage', category: 'content', status: 'unavailable'}]);
  assert.equal(partial.seo, 'unavailable');
  assert.equal(partial.state, 'incomplete');
  assert.equal(summarizeSeo([]).state, 'incomplete');
  assert.equal(reviewSeoDocument(config, {...document, _type: 'unsupported'}).summary.state, 'incomplete');
});

test('settings loader separates missing documents, fetch failure and draft/published perspectives', async () => {
  let perspective;
  let fail = false;
  let row = {_rev: 'published-revision', seoDefaults: {site: {name: 'Published name'}}};
  const client = {withConfig: (options) => {perspective = options.perspective; return client;}, fetch: async (query, params) => {assert.ok(query.includes('seoDefaults{')); assert.equal(params.id, 'settings'); if (fail) throw new Error('Offline'); return row;}};
  const options = {settings: {documentId: 'settings', schemaType: 'settings', field: 'seoDefaults'}};
  const found = await loadSeoSettings(client, config, options);
  assert.equal(perspective, 'published');
  assert.equal(found.settings.site.name, 'Published name');
  await loadSeoSettings(client, config, options, 'drafts');
  assert.equal(perspective, 'drafts');
  row = null;
  assert.equal((await loadSeoSettings(client, config, options)).exists, false);
  fail = true;
  await assert.rejects(loadSeoSettings(client, config, options), /Offline/);
  assert.deepEqual(await loadSeoSettings({}, config, {settings: false}), {settings: {}, exists: false});
});

test('paginated scan bounds work, preserves per-document failures, and respects cancellation', async () => {
  const client = {withConfig: () => client};
  const request = {client, perspective: 'published', signal: new AbortController().signal};
  const options = {config, loadDocuments: async ({limit, perspective}) => {assert.equal(limit, 25); assert.equal(perspective, 'published'); return {documents: [document, {...document, _id: 'bad', _type: 'unsupported'}], nextCursor: 'next'};}};
  const result = await scanSeoPage(options, request, snapshot);
  assert.equal(result.nextCursor, 'next');
  assert.equal(result.reviews[0].seo.title, 'A guide | CMS site');
  assert.match(result.reviews[1].error, /No SEO adapter/);
  await assert.rejects(scanSeoPage({...options, loadDocuments: async () => ({documents: [], nextCursor: 'same'})}, {...request, cursor: 'same'}, snapshot), /repeated cursor/);
  await assert.rejects(scanSeoPage({...options, loadDocuments: async () => ({documents: Array(26).fill(document)})}, request, snapshot), /at most 25/);
  await assert.rejects(scanSeoPage(options, {...request, signal: AbortSignal.abort()}, snapshot), {name: 'AbortError'});
  const failedContext = await scanSeoPage({...options, loadContext: async () => {throw new Error('Reference missing');}}, request, snapshot);
  assert.equal(failedContext.reviews[0].summary.state, 'incomplete');
  assert.match(failedContext.reviews[0].error, /Reference missing/);
});
