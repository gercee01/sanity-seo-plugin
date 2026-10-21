import {defineArrayMember, defineField, defineType} from 'sanity';
import {SEO_SETTINGS_TYPE, validateTitleTemplate} from '../core/index.js';
import type {SeoConfig} from '../core/index.js';

export const SEO_SETTINGS_VALUE_TYPE = 'geraldSeoSettingsValue';
const imageField = (name: string, title: string) => defineField({name, title, type: 'image', options: {hotspot: true}, fields: [defineField({name: 'alt', title: 'Image description', type: 'string'})]});

export function seoSettingsField(options: {name?: string; title?: string; group?: string} = {}) {
  return defineField({name: 'seoDefaults', title: 'SEO defaults', type: SEO_SETTINGS_VALUE_TYPE, ...options});
}

export function settingsSchemas(config: SeoConfig, managed: boolean) {
  const fields = [
    defineField({name: 'site', title: 'Site basics', type: 'object', fields: [
      defineField({name: 'name', title: 'Site name', type: 'string', description: `Code default: ${config.site.name}`}),
      defineField({name: 'description', title: 'Default description', type: 'text', rows: 3}),
      defineField({name: 'language', title: 'Language tag', type: 'string', description: 'For example en or en-GB. Readability currently supports English.', validation: (rule) => rule.custom((value) => {if (!value) return true; try {Intl.getCanonicalLocales(value); return true;} catch {return 'Enter a valid language tag.';}})}),
      imageField('image', 'Default sharing image'),
      defineField({name: 'publisher', title: 'Publisher identity', type: 'object', fields: [
        defineField({name: 'type', title: 'Publisher type', type: 'string', options: {list: ['Organization', 'Person']}}),
        defineField({name: 'name', title: 'Publisher name', type: 'string'}), imageField('logo', 'Publisher logo'),
      ]}),
    ]}),
    defineField({name: 'separator', title: 'Title separator', type: 'string', description: 'Leave blank to use |.', validation: (rule) => rule.custom((value) => !value || (value.trim().length > 0 && value.length <= 10 && !/[{}\r\n]/.test(value)) || 'Use 1–10 characters without braces or line breaks.')}),
    defineField({name: 'contentTypes', title: 'Search appearance by content type', type: 'array', of: [defineArrayMember({name: 'geraldSeoTypeDefaults', type: 'object', fields: [
      defineField({name: 'type', title: 'Content type', type: 'string', options: {list: Object.keys(config.types)}, validation: (rule) => rule.required()}),
      defineField({name: 'titleTemplate', title: 'Title template', type: 'string', description: 'Tokens: {title}, {separator}, {siteName}. Blank preserves the current title format.', validation: (rule) => rule.custom((value) => {try {if (value) validateTitleTemplate(value); return true;} catch (error) {return (error as Error).message;}})}),
      defineField({name: 'indexing', title: 'Indexing default', type: 'string', options: {list: [{title: 'Use code default', value: 'inherit'}, {title: 'Allow indexing', value: 'index'}, {title: 'Noindex', value: 'noindex'}]}}),
    ], preview: {select: {title: 'type', subtitle: 'titleTemplate'}}})], validation: (rule) => rule.custom((value) => {
      const types = (value ?? []).map((item) => (item as {type?: string}).type).filter(Boolean);
      return new Set(types).size === types.length || 'Configure each content type once.';
    })}),
    defineField({name: 'social', title: 'Social defaults', type: 'object', fields: [
      defineField({name: 'card', title: 'X card', type: 'string', options: {list: ['summary', 'summary_large_image']}}),
      defineField({name: 'site', title: 'X site account', type: 'string', validation: (rule) => rule.custom((value) => !value || /^@[A-Za-z0-9_]{1,15}$/.test(value) || 'Enter an @handle with up to 15 letters, numbers, or underscores.')}),
    ]}),
  ];
  return [defineType({name: SEO_SETTINGS_VALUE_TYPE, title: 'SEO defaults', type: 'object', fields}),
    ...(managed ? [defineType({name: SEO_SETTINGS_TYPE, title: 'SEO settings', type: 'document', fields, preview: {prepare: () => ({title: 'SEO settings'})}})] : [])];
}
