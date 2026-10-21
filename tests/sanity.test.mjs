import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seoPlugin, seoField, seoSettingsField, SEO_PROJECTION, SEO_SCHEMA_TYPE, SEO_SETTINGS_TYPE, SEO_SETTINGS_VALUE_TYPE} from '../dist/sanity/index.js';

const config = {site: {origin: 'https://example.com', name: 'Example'}, types: {page: {getPath: () => '/'}}};
test('plugin registers one namespaced object while preserving host schemas', () => {
  const plugin = seoPlugin({config});
  const schemas = plugin.schema.types([{name: 'page', type: 'document'}]);
  assert.equal(schemas[0].name, 'page');
  const object = schemas[1];
  assert.equal(object.name, SEO_SCHEMA_TYPE);
  assert.equal(typeof object.components.input, 'function');
  assert.deepEqual(object.fields.map((field) => field.name), ['title', 'description', 'image', 'focusKeyphrase', 'indexing', 'canonicalUrl', 'social']);
  assert.deepEqual(object.groups.map((group) => group.name), ['search', 'social', 'advanced']);
  assert.ok(schemas.some((type) => type.name === SEO_SETTINGS_TYPE));
  assert.equal(plugin.document.singletons([])[0].documentId, 'geraldSeoSettings');
  assert.equal(plugin.plugins[0].tools[0].name, 'seo');
});
test('existing settings and code-only modes do not introduce a competing singleton', () => {
  const custom = seoPlugin({config, settings: {schemaType: 'siteSettings', documentId: 'site-settings', field: 'seoDefaults'}});
  assert.ok(custom.schema.types([]).some((type) => type.name === SEO_SETTINGS_VALUE_TYPE));
  assert.ok(!custom.schema.types([]).some((type) => type.name === SEO_SETTINGS_TYPE));
  assert.equal(custom.document, undefined);
  assert.equal(seoSettingsField().type, SEO_SETTINGS_VALUE_TYPE);
  assert.equal(seoPlugin({config, settings: false}).document, undefined);
  assert.throws(() => seoPlugin({config, settings: {documentId: 'drafts.settings', schemaType: 'settings'}}), /published singleton/);
  assert.throws(() => seoPlugin({config, settings: {documentId: 'settings', schemaType: 'settings', field: 'x}bad'}}), /top-level/);
});
test('custom field names are explicit, and duplicate plugin registration fails clearly', () => {
  assert.equal(seoField({name: 'search'}).name, 'search');
  assert.equal(seoField().type, SEO_SCHEMA_TYPE);
  assert.throws(() => seoPlugin({config}).schema.types([{name: SEO_SCHEMA_TYPE}]), /already registered/);
  assert.match(SEO_PROJECTION, /image\{asset/);
});
