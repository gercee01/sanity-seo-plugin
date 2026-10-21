import type {SanityClient} from 'sanity';
import {normalizeSeoSettings, SEO_SETTINGS_ID, SEO_SETTINGS_TYPE, SEO_SETTINGS_PROJECTION} from '../core/index.js';
import type {SeoConfig, SeoSettings} from '../core/index.js';
import type {SeoPluginOptions, SeoSettingsIntegration} from './options.js';

export function settingsTarget(options: Pick<SeoPluginOptions, 'settings'>): SeoSettingsIntegration | undefined {
  if (options.settings === false) return undefined;
  const target = options.settings ?? {documentId: SEO_SETTINGS_ID, schemaType: SEO_SETTINGS_TYPE};
  if (!/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(target.documentId) || /^(drafts|versions)\./.test(target.documentId)) throw new Error('Settings documentId must be a published singleton ID.');
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(target.schemaType)) throw new Error('Invalid settings schema type.');
  if (target.field && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(target.field)) throw new Error('Settings field must be a top-level field name.');
  return target;
}

export function settingsQuery(target: SeoSettingsIntegration): string {
  const projection = target.field ? `${target.field}{${SEO_SETTINGS_PROJECTION}}` : SEO_SETTINGS_PROJECTION;
  return `*[_id == $id][0]{_rev, _updatedAt, ${projection}}`;
}

export type SettingsSnapshot = {settings: SeoSettings; exists: boolean; revision?: string};

/** Server callers must explicitly choose a perspective and own caching/invalidation. */
export async function loadSeoSettings(client: SanityClient, config: SeoConfig, options: Pick<SeoPluginOptions, 'settings'> = {}, perspective: 'published' | 'drafts' = 'published'): Promise<SettingsSnapshot> {
  const target = settingsTarget(options);
  if (!target) return {settings: {}, exists: false};
  const raw = await client.withConfig({perspective, useCdn: false}).fetch<Record<string, unknown> | null>(settingsQuery(target), {id: target.documentId});
  const value = target.field ? raw?.[target.field] : raw;
  return {settings: normalizeSeoSettings(value, config), exists: Boolean(raw), revision: typeof raw?._rev === 'string' ? raw._rev : undefined};
}
