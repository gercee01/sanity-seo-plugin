import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {defineSeoConfig, resolveSeo} from '../dist/core/index.js';
import {createMetadata, toMetadata, createSitemap, createRobots, buildJsonLd, serializeJsonLd, SeoJsonLd} from '../dist/next/index.js';

const config = defineSeoConfig({site: {origin: 'https://example.com', name: 'Example', publisher: {type: 'Organization', name: 'Example Co'}}, types: {
  page: {getPath: (doc) => doc.slug ? `/${doc.slug}` : null},
  story: {getPath: (doc) => `/articles/${doc.slug}`, kind: 'article', getAuthor: () => ({name: 'Real Author', url: 'https://example.com/author'}), getBreadcrumbs: () => [{name: 'Home', path: '/'}, {name: 'Article', path: '/articles/a'}]},
}});
const page = {_id: 'one', _type: 'page', slug: 'a', title: 'A title'};

test('pre-0.2 resolved objects remain accepted by the public Metadata adapter', () => {
  const legacy = resolveSeo(config, page);
  delete legacy.social;
  assert.equal(toMetadata(legacy).openGraph.title, legacy.title);
  assert.equal(toMetadata(legacy).twitter.card, 'summary');
});

test('Next metadata uses absolute titles and suppresses inherited canonical on noindex', () => {
  assert.deepEqual(createMetadata(config, page).title, {absolute: 'A title | Example'});
  const noindex = createMetadata(config, {...page, seo: {indexing: 'noindex'}});
  assert.equal(noindex.alternates.canonical, null);
  assert.equal(noindex.robots.index, false);
  assert.equal(noindex.openGraph.url, 'https://example.com/a');
  assert.equal(noindex.twitter.card, 'summary');
});

test('sitemap excludes drafts, versions, unknown types, missing routes, noindex and aliases', () => {
  const entries = createSitemap(config, [page,
    {...page, _id: 'drafts.one', slug: 'draft'}, {...page, _id: 'versions.release.one', slug: 'release'},
    {...page, slug: undefined}, {...page, _type: 'unknown'}, {...page, slug: 'hidden', seo: {indexing: 'noindex'}},
    {...page, slug: 'alias', seo: {canonicalUrl: 'https://example.com/a'}},
    {...page, slug: 'external', seo: {canonicalUrl: 'https://other.example/a'}},
  ]);
  assert.deepEqual(entries, [{url: 'https://example.com/a'}]);
  assert.deepEqual(createSitemap(config, [page], {preview: true}), []);
});

test('sitemap deduplicates and keeps latest real timestamp', () => {
  const entries = createSitemap(config, [{...page, _updatedAt: '2026-01-01'}, {...page, publishedAt: '2026-02-01', _updatedAt: '2026-01-01'}]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].lastModified, '2026-02-01T00:00:00.000Z');
});

test('invalid eligible data fails instead of silently generating a partial sitemap', () => {
  assert.throws(() => createSitemap(config, [{...page, seo: {canonicalUrl: 'javascript:alert(1)'}}]));
});

test('Article graph references actual page, publisher and breadcrumb nodes', () => {
  const data = buildJsonLd(resolveSeo(config, {...page, _type: 'story', publishedAt: '2026-01-01'}));
  const graph = data['@graph'];
  const article = graph.find((node) => node['@type'] === 'Article');
  assert.equal(article.mainEntityOfPage['@id'], 'https://example.com/articles/a#webpage');
  assert.equal(article.author.name, 'Real Author');
  assert.equal(article.publisher['@id'], graph.find((node) => node['@type'] === 'Organization')['@id']);
  assert.equal(graph.find((node) => node['@type'] === 'BreadcrumbList').itemListElement.length, 2);
  assert.ok(!buildJsonLd(resolveSeo(config, page))['@graph'].some((node) => node['@type'] === 'Article'));
});

test('JSON-LD escapes script-closing input without changing its parsed meaning', () => {
  const malicious = '</script><script>alert(1)</script>\u2028\u2029';
  const serialized = serializeJsonLd({name: malicious});
  assert.ok(!serialized.includes('<'));
  assert.equal(JSON.parse(serialized).name, malicious);
  const rendered = renderToStaticMarkup(SeoJsonLd({seo: resolveSeo(config, {...page, title: malicious})}));
  assert.equal((rendered.match(/<script/g) ?? []).length, 1);
  assert.ok(rendered.includes('application/ld+json'));
});

test('robots marks nonproduction and publishes sitemap only in production', () => {
  assert.equal(createRobots('https://example.com').sitemap, 'https://example.com/sitemap.xml');
  assert.deepEqual(createRobots('https://example.com', {preview: true}), {rules: {userAgent: '*', disallow: '/'}});
});
