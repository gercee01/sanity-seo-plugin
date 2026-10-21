import {defineSeoConfig, type SeoConfig, type SeoDocument, normalizeSeoSettings} from '@gerald/seo/core';
import {seoPlugin, seoField, SEO_PROJECTION} from '@gerald/seo/sanity';
import {createMetadata, createSitemap, SeoJsonLd} from '@gerald/seo/next';
const config: SeoConfig = defineSeoConfig({site: {name: 'Typed consumer', origin: 'https://example.com'}, types: {entry: {getPath: () => '/'}}});
const document: SeoDocument = {_type: 'entry'};
seoPlugin({config, settings: {documentId: 'site-settings', schemaType: 'siteSettings', field: 'seoDefaults'}, loadDocuments: async () => ({documents: [document]}), loadContext: async (current, _client) => ({document: current})});
seoPlugin({config, loadContext: async (current, client, {signal}) => {
  await client.fetch('*[_id == $id][0]', {id: current._id}, {signal});
  return {document: current};
}});
seoField({name: 'search'});
createMetadata(config, document, {settings: normalizeSeoSettings({site: {name: 'CMS name'}})});
createSitemap(config, [document]);
void SEO_PROJECTION;
void SeoJsonLd;
