import {ALL_FIELDS_GROUP, defineArrayMember, defineConfig, defineField, defineType} from 'sanity';
import {structureTool} from 'sanity/structure';
import {seoPlugin, seoField, seoSettingsField} from '@gerald/seo/sanity';
import {config, loadDocuments} from './seo.config.mjs';

const groups = [{name: 'content', title: 'Content', default: true}, {name: 'seo', title: 'SEO'}, {...ALL_FIELDS_GROUP, hidden: true}];
const headline = defineField({name: 'headline', group: 'content', type: 'string'});
const blocks = defineField({name: 'contentBlocks', group: 'content', type: 'array', of: [defineArrayMember({type: 'object', name: 'copySection', fields: [
  defineField({name: 'heading', type: 'string'}),
  defineField({name: 'copy', type: 'array', of: [defineArrayMember({type: 'block'})]}),
]})]});
export default defineConfig({
  name: 'custom-sections', title: 'SEO custom sections example', projectId: 'demo1234', dataset: 'production',
  plugins: [structureTool(), seoPlugin({config, settings: {schemaType: 'siteSettings', documentId: 'site-settings', field: 'seoDefaults'}, loadDocuments})],
  document: {singletons: [{schemaType: 'siteSettings', documentId: 'site-settings'}]},
  schema: {types: [
    defineType({name: 'siteSettings', title: 'Site settings', type: 'document', fields: [seoSettingsField()]}),
    defineType({name: 'landingPage', type: 'document', groups, fields: [headline, blocks, seoField({name: 'search', group: 'seo'})]}),
    defineType({name: 'story', type: 'document', groups, fields: [
      headline, defineField({name: 'handle', group: 'content', type: 'string'}), defineField({name: 'summary', group: 'content', type: 'text'}),
      defineField({name: 'releaseDate', group: 'content', type: 'datetime'}),
      defineField({name: 'writer', group: 'content', type: 'object', fields: [defineField({name: 'name', type: 'string'}), defineField({name: 'url', type: 'url'})]}),
      blocks, seoField({name: 'search', group: 'seo'}),
    ]}),
  ]},
});
