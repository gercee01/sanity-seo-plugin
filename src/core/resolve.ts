import {record, text} from './content.js';
import {absoluteUrl, routeUrl, siteOrigin} from './urls.js';
import {formatSeoTitle, normalizeSeoSettings} from './settings.js';
import type {ResolveOptions, ResolvedSeo, SeoConfig, SeoDocument, SeoImage, SeoOverrides} from './types.js';

function image(value: unknown, config: SeoConfig): SeoImage | undefined {
  if (value == null) return undefined;
  const result = config.resolveImage?.(value) ?? record(value);
  if (!result || typeof result.url !== 'string') return undefined;
  const width = result.width;
  const height = result.height;
  if ((width !== undefined && (typeof width !== 'number' || !Number.isFinite(width) || width <= 0)) ||
      (height !== undefined && (typeof height !== 'number' || !Number.isFinite(height) || height <= 0))) {
    throw new Error('Image dimensions must be positive finite numbers.');
  }
  return {url: absoluteUrl(result.url, 'Image URL'), alt: text(result.alt), width: width as number | undefined, height: height as number | undefined};
}

function date(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!Number.isFinite(Date.parse(value))) throw new Error('SEO dates must be valid date strings.');
  return new Date(value).toISOString();
}

export function defineSeoConfig(config: SeoConfig): SeoConfig {
  siteOrigin(config.site.origin);
  if (!text(config.site.name)) throw new Error('Site name is required.');
  if (!Object.keys(config.types).length) throw new Error('Configure at least one document type.');
  if (config.seoField && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(config.seoField)) throw new Error('Invalid SEO field name.');
  for (const [name, adapter] of Object.entries(config.types)) {
    if (!name || typeof adapter.getPath !== 'function') throw new Error('Each type needs a getPath adapter.');
    if (adapter.indexing && !['index', 'noindex'].includes(adapter.indexing)) throw new Error('Invalid type indexing policy.');
    if (adapter.kind && !['page', 'article'].includes(adapter.kind)) throw new Error('Invalid document kind.');
  }
  return config;
}

export function resolveSeo(config: SeoConfig, document: SeoDocument, options: ResolveOptions = {}): ResolvedSeo & {social: NonNullable<ResolvedSeo['social']>} {
  defineSeoConfig(config);
  const adapter = Object.hasOwn(config.types, document._type) ? config.types[document._type] : undefined;
  if (!adapter) throw new Error(`No SEO adapter for document type "${document._type}".`);
  const settings = normalizeSeoSettings(options.settings);
  const typeSettings = settings.types?.[document._type];
  const baseSite = {...config.site, ...options.site};
  const site = {...baseSite, ...settings.site, publisher: baseSite.publisher || settings.site?.publisher
    ? {...baseSite.publisher, ...settings.site?.publisher} as NonNullable<typeof baseSite.publisher> : undefined};
  const origin = siteOrigin(site.origin);
  if (!text(site.name)) throw new Error('Site name is required.');
  const path = adapter.getPath(document);
  if (path == null) throw new Error('Document has no routable path.');
  const ownUrl = routeUrl(origin, path);
  const raw = adapter.getSeo ? adapter.getSeo(document) : record(document[config.seoField ?? 'seo']);
  const seo = (raw ?? {}) as SeoOverrides;
  if (seo.indexing !== undefined && !['inherit', 'index', 'noindex'].includes(seo.indexing)) throw new Error('Invalid document indexing policy.');
  const extracted = adapter.getContent?.(document) ?? {nodes: [], issues: ['No content adapter configured. Content analysis is incomplete.']};
  const content = {nodes: [...extracted.nodes], issues: [...extracted.issues]};
  const contentTitle = text(adapter.getTitle ? adapter.getTitle(document) : document.title);
  const fallbackTitle = formatSeoTitle(contentTitle, site.name, settings.separator, typeSettings?.titleTemplate);
  const overrideTitle = text(seo.title);
  const overrideDescription = text(seo.description);
  const contentDescription = text(adapter.getDescription?.(document)) ?? text(content.nodes.find((node) => node.type === 'paragraph')?.text);
  const description = overrideDescription ?? contentDescription ?? text(site.description);
  const overrideImage = image(seo.image, config);
  if (seo.image != null && !overrideImage) content.issues = [...content.issues, 'SEO image is unresolved. Configure resolveImage for Sanity image references.'];
  const contentImage = image(adapter.getImage ? adapter.getImage(document) : document.image, config);
  const siteImage = image(site.image, config);
  const resolvedImage = overrideImage ?? contentImage ?? siteImage;
  const social = record(seo.social) ?? {};
  if (social.card !== undefined && !['summary', 'summary_large_image'].includes(String(social.card))) throw new Error('Invalid document X card type.');
  const socialImage = image(social.image, config);
  if (social.image != null && !socialImage) content.issues.push('Social image is unresolved. Configure resolveImage for Sanity image references.');
  const sharingImage = socialImage ?? resolvedImage;
  const canonical = text(seo.canonicalUrl) ? absoluteUrl(seo.canonicalUrl!, 'Canonical URL') : ownUrl;
  const isPublic = !document._id?.startsWith('drafts.') && !document._id?.startsWith('versions.');
  const index = !options.preview && isPublic && (seo.indexing === 'inherit' || seo.indexing === undefined ? typeSettings?.indexing ?? adapter.indexing ?? 'index' : seo.indexing) === 'index';
  const author = adapter.getAuthor?.(document);
  if (author && !text(author.name)) throw new Error('Author name is required when supplying an author.');
  if (site.publisher && (!text(site.publisher.name) || !['Organization', 'Person'].includes(site.publisher.type))) throw new Error('Invalid publisher identity.');
  const publishedAt = date(adapter.getPublishedAt ? adapter.getPublishedAt(document) : text(document.publishedAt));
  const modifiedAt = date(adapter.getModifiedAt ? adapter.getModifiedAt(document) : text(document._updatedAt));
  const breadcrumbs = adapter.getBreadcrumbs?.(document) ?? [];
  for (const crumb of breadcrumbs) {
    if (!text(crumb.name)) throw new Error('Breadcrumb name is required.');
    routeUrl(origin, crumb.path);
  }
  return {
    title: overrideTitle ?? fallbackTitle, description, url: canonical, routeUrl: ownUrl,
    canonical: index ? canonical : undefined, index, public: isPublic,
    sitemapEligible: index && canonical === ownUrl && new URL(canonical).origin === origin,
    kind: adapter.kind ?? 'page', image: resolvedImage, language: site.language ?? 'en',
    social: {title: text(social.title) ?? overrideTitle ?? fallbackTitle, description: text(social.description) ?? description, image: sharingImage, card: (social.card as 'summary' | 'summary_large_image' | undefined) ?? settings.social?.card ?? (sharingImage ? 'summary_large_image' : 'summary'), site: settings.social?.site},
    site: {...site, origin, image: siteImage, publisher: site.publisher ? {...site.publisher, logo: image(site.publisher.logo, config)} : undefined},
    focusKeyphrase: text(seo.focusKeyphrase), content,
    author: author ? {name: author.name, url: author.url ? absoluteUrl(author.url, 'Author URL') : undefined} : undefined,
    publishedAt, modifiedAt, breadcrumbs,
    sources: {title: overrideTitle ? 'override' : contentTitle ? 'content' : 'site', description: overrideDescription ? 'override' : contentDescription ? 'content' : site.description ? 'site' : 'missing', image: overrideImage ? 'override' : contentImage ? 'content' : siteImage ? 'site' : 'missing'},
  };
}
