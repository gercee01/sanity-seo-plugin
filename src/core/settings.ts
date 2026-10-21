import {record as maybeRecord, text} from './content.js';
import {absoluteUrl} from './urls.js';
import type {SeoConfig, SeoImage, SeoSettings} from './types.js';
const record = (value: unknown) => maybeRecord(value) ?? {};

export const SEO_SETTINGS_ID = 'geraldSeoSettings';
export const SEO_SETTINGS_TYPE = 'geraldSeoSettings';
export const SEO_SETTINGS_PROJECTION = 'site{name, description, language, image{asset, alt, crop, hotspot}, publisher{name, type, logo{asset, alt, crop, hotspot}}}, separator, contentTypes[]{type, titleTemplate, indexing}, social{card, site}';

export function validateTitleTemplate(value: string): void {
  if (value.length > 200 || /[{}]/.test(value.replace(/\{(?:title|siteName|separator)\}/g, ''))) {
    throw new Error('Title templates support only {title}, {siteName}, and {separator} (maximum 200 characters).');
  }
}

function settingImage(value: unknown, config: Pick<SeoConfig, 'resolveImage'>): SeoImage | undefined {
  if (value == null) return undefined;
  const resolved = config.resolveImage?.(value) ?? record(value);
  if (!resolved || !text(resolved.url)) throw new Error('Settings image is unresolved. Configure resolveImage for Sanity image references.');
  for (const dimension of [resolved.width, resolved.height]) {
    if (dimension !== undefined && (typeof dimension !== 'number' || !Number.isFinite(dimension) || dimension <= 0)) throw new Error('Settings image dimensions must be positive numbers.');
  }
  return {url: absoluteUrl(resolved.url as string, 'Settings image'), alt: text(resolved.alt), width: resolved.width as number | undefined, height: resolved.height as number | undefined};
}

/** Normalize a package settings document, or an equivalent host-mapped object. No client or fetch is embedded. */
export function normalizeSeoSettings(value: unknown, config: Pick<SeoConfig, 'resolveImage'> = {}): SeoSettings {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('SEO settings must be an object.');
  const source = record(value);
  for (const key of ['site', 'types', 'social'] as const) {
    if (source[key] != null && !maybeRecord(source[key])) throw new Error(`Settings ${key} must be an object.`);
  }
  const rawSite = record(source.site);
  if (rawSite.origin !== undefined || source.origin !== undefined) throw new Error('Production origin belongs in developer configuration, not CMS settings.');
  const site: NonNullable<SeoSettings['site']> = {};
  for (const key of ['name', 'description', 'language'] as const) {
    if (rawSite[key] != null && typeof rawSite[key] !== 'string') throw new Error(`Settings ${key} must be text.`);
    const current = text(rawSite[key]);
    if (current) site[key] = current;
  }
  if (site.language) {
    try { Intl.getCanonicalLocales(site.language); } catch { throw new Error('Settings language must be a valid language tag.'); }
  }
  if (rawSite.image != null) site.image = settingImage(rawSite.image, config);
  const publisher = record(rawSite.publisher);
  if (rawSite.publisher != null && !maybeRecord(rawSite.publisher)) throw new Error('Publisher settings must be an object.');
  if (Object.keys(publisher).length) {
    if (publisher.type != null && !['Organization', 'Person'].includes(String(publisher.type))) throw new Error('Invalid publisher type.');
    if (publisher.name != null && typeof publisher.name !== 'string') throw new Error('Publisher name must be text.');
    site.publisher = {
      ...(text(publisher.name) ? {name: text(publisher.name)} : {}),
      ...(publisher.type ? {type: publisher.type as 'Organization' | 'Person'} : {}),
      ...(publisher.logo != null ? {logo: settingImage(publisher.logo, config)} : {}),
    };
  }
  const result: SeoSettings = {site};
  if (source.separator != null) {
    if (typeof source.separator !== 'string' || !source.separator.trim() || source.separator.length > 10 || /[{}\r\n]/.test(source.separator)) throw new Error('Choose a title separator of 1–10 characters without braces or line breaks.');
    result.separator = source.separator.trim();
  }
  const types: NonNullable<SeoSettings['types']> = {};
  if (source.contentTypes !== undefined && !Array.isArray(source.contentTypes)) throw new Error('Content type settings must be a list.');
  const entries = Array.isArray(source.contentTypes)
    ? source.contentTypes.map((item) => {const current = record(item); return [current.type, current] as const;})
    : Object.entries(record(source.types));
  for (const [name, raw] of entries) {
    if (typeof name !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name) || Object.hasOwn(types, name)) throw new Error('Content type settings need unique valid type names.');
    const current = record(raw);
    if (!maybeRecord(raw)) throw new Error('Content type settings must be objects.');
    if (current.titleTemplate != null && typeof current.titleTemplate !== 'string') throw new Error('Title template must be text.');
    const template = text(current.titleTemplate);
    if (template) validateTitleTemplate(template);
    if (current.indexing != null && !['inherit', 'index', 'noindex'].includes(String(current.indexing))) throw new Error('Invalid type indexing setting.');
    types[name] = {titleTemplate: template, ...(current.indexing && current.indexing !== 'inherit' ? {indexing: current.indexing as 'index' | 'noindex'} : {})};
  }
  if (entries.length) result.types = types;
  const social = record(source.social);
  if (social.card != null && !['summary', 'summary_large_image'].includes(String(social.card))) throw new Error('Invalid X card type.');
  if (social.site != null && typeof social.site !== 'string') throw new Error('X account must be text.');
  if (text(social.site) && !/^@[A-Za-z0-9_]{1,15}$/.test(text(social.site)!)) throw new Error('X account must be an @handle of up to 15 letters, numbers, or underscores.');
  if (Object.keys(social).length) result.social = {card: social.card as 'summary' | 'summary_large_image' | undefined, site: text(social.site)};
  return result;
}

export function formatSeoTitle(title: string | undefined, siteName: string, separator = '|', template?: string): string {
  if (!title || title === siteName) return siteName;
  const suffix = ` ${separator} ${siteName}`;
  if (!template && title.endsWith(suffix)) return title;
  const existing = [suffix, ` | ${siteName}`].find((ending) => title.endsWith(ending));
  const clean = existing ? title.slice(0, -existing.length) : title;
  if (!template) return `${clean}${suffix}`;
  return template.replace(/\{(title|siteName|separator)\}/g, (_, key: string) => ({title: clean, siteName, separator})[key]!).replace(/\s+/g, ' ').trim() || siteName;
}
