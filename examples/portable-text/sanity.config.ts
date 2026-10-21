import {ALL_FIELDS_GROUP, defineArrayMember, defineConfig, defineField, defineType} from 'sanity';
import {structureTool} from 'sanity/structure';
import {seoPlugin, seoField} from '@gerald/seo/sanity';
import {config, loadDocuments} from './seo.config.mjs';

export default defineConfig({
  name: 'portable-text', title: 'SEO Portable Text example', projectId: 'demo1234', dataset: 'production',
  plugins: [structureTool({structure: (S) => S.list().title('Content').items([S.documentTypeListItem('page')])}), seoPlugin({config, loadDocuments})],
  schema: {types: [defineType({name: 'page', title: 'Page', type: 'document', groups: [
    {name: 'content', title: 'Content', default: true}, {name: 'seo', title: 'SEO'}, {...ALL_FIELDS_GROUP, hidden: true},
  ], fields: [
    defineField({name: 'title', group: 'content', type: 'string'}),
    defineField({name: 'slug', group: 'content', type: 'slug'}),
    defineField({name: 'isHomepage', group: 'content', type: 'boolean'}),
    defineField({name: 'body', group: 'content', type: 'array', of: [defineArrayMember({type: 'block'})]}),
    seoField({group: 'seo'}),
  ]})]},
});
