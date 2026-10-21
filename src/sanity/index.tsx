import {defineField, definePlugin, defineType} from 'sanity';
import {structureTool} from 'sanity/structure';
import {defineSeoConfig, SEO_SETTINGS_TYPE} from '../core/index.js';
import {SeoInput} from './input.js';
import type {SeoPluginOptions} from './options.js';
import {settingsSchemas} from './settings-schema.js';
import {settingsTarget} from './settings.js';
import {SeoDashboard} from './dashboard.js';

export type {SeoPluginOptions, SeoContext, SeoDocumentPage, SeoSettingsIntegration} from './options.js';
export {seoSettingsField, SEO_SETTINGS_VALUE_TYPE} from './settings-schema.js';
export {loadSeoSettings} from './settings.js';
export {SEO_SETTINGS_ID, SEO_SETTINGS_TYPE, SEO_SETTINGS_PROJECTION} from '../core/index.js';
export const SEO_SCHEMA_TYPE = 'geraldSeo';

export function seoField(options: {name?: string; title?: string; group?: string; description?: string} = {}) {
  return defineField({name: options.name ?? 'seo', title: options.title ?? 'SEO', type: SEO_SCHEMA_TYPE, ...options});
}

export {SEO_PROJECTION} from '../core/index.js';

export const seoPlugin = definePlugin<SeoPluginOptions>((options) => {
  const {config} = options;
  defineSeoConfig(config);
  const target = settingsTarget(options);
  const managed = options.settings === undefined;
  return {
    name: 'gerald-seo',
    plugins: [structureTool({name: 'seo', title: 'SEO', structure: (S) => S.list().title('SEO').items([
      ...(['Overview', 'Health', 'Optimize', 'Workflow'] as const).map((view) => S.listItem().id(view.toLowerCase()).title(view).child(S.component().id(view.toLowerCase()).title(view).component(() => <SeoDashboard options={options} view={view} />))),
      ...(target ? [S.divider(), S.listItem().id('seo-settings').title('Settings').child(S.document().schemaType(target.schemaType).documentId(target.documentId))] : []),
    ])})],
    ...(managed && target ? {document: {singletons: (previous: import('sanity').SingletonDefinition[]) => [...previous, {id: 'geraldSeoSettings', documentId: target.documentId, schemaType: SEO_SETTINGS_TYPE, title: 'SEO settings'}]}} : {}),
    schema: {
      types: (previous) => {
        if (previous.some((type) => [SEO_SCHEMA_TYPE, 'geraldSeoSettingsValue', ...(managed ? [SEO_SETTINGS_TYPE] : [])].includes(type.name))) throw new Error(`SEO schema already registered. Install seoPlugin once per workspace.`);
        return [...previous, defineType({
          name: SEO_SCHEMA_TYPE, title: 'SEO', type: 'object',
          groups: [{name: 'search', title: 'Search', default: true}, {name: 'social', title: 'Social'}, {name: 'advanced', title: 'Advanced'}],
          components: {input: (props) => <SeoInput {...props} {...options} />},
          fields: [
            defineField({name: 'title', title: 'Search title', group: 'search', type: 'string', description: 'Optional override; leave blank to use the content title and site name.', validation: (rule) => rule.max(65).warning('Long titles may be shortened in search results.')}),
            defineField({name: 'description', title: 'Search description', group: 'search', type: 'text', rows: 3, description: 'Optional override; otherwise uses content or site defaults.', validation: (rule) => rule.max(160).warning('Long descriptions may be shortened.')}),
            defineField({name: 'image', title: 'Shared SEO image', group: 'social', type: 'image', description: 'Existing sharing image fallback. Independent social overrides below take priority.', options: {hotspot: true}, fields: [defineField({name: 'alt', title: 'Image description', type: 'string'})]}),
            defineField({name: 'focusKeyphrase', title: 'Focus keyphrase', group: 'search', type: 'string', description: 'Used for guidance only; never emitted as a keywords meta tag.'}),
            defineField({name: 'indexing', title: 'Search indexing', group: 'advanced', type: 'string', initialValue: 'inherit', options: {list: [{title: 'Use type default', value: 'inherit'}, {title: 'Allow indexing', value: 'index'}, {title: 'Noindex', value: 'noindex'}], layout: 'radio'}, validation: (rule) => rule.custom((value) => !value || ['inherit', 'index', 'noindex'].includes(value) || 'Choose a valid indexing policy.')}),
            defineField({name: 'canonicalUrl', title: 'Canonical URL', group: 'advanced', type: 'url', description: 'Advanced: another preferred URL. Leave blank for this page’s production URL.', validation: (rule) => rule.uri({scheme: ['http', 'https'], allowRelative: false}).custom((value) => {
              if (!value) return true;
              try {const url = new URL(value); return !url.username && !url.password && !url.hash || 'Canonical URLs cannot include credentials or fragments.';} catch {return 'Enter an absolute HTTP(S) URL.';}
            })}),
            defineField({name: 'social', title: 'Social overrides', group: 'social', type: 'object', description: 'Blank fields inherit resolved search/content/site values.', fields: [
              defineField({name: 'title', title: 'Sharing title', type: 'string'}),
              defineField({name: 'description', title: 'Sharing description', type: 'text', rows: 3}),
              defineField({name: 'image', title: 'Sharing image override', type: 'image', options: {hotspot: true}, fields: [defineField({name: 'alt', title: 'Image description', type: 'string'})]}),
              defineField({name: 'card', title: 'X card', type: 'string', options: {list: ['summary', 'summary_large_image']}}),
            ]}),
          ],
        }), ...settingsSchemas(config, managed)];
      },
    },
  };
});
