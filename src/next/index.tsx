import {createElement} from 'react';
import type {Metadata, MetadataRoute} from 'next';
import {absoluteUrl, resolveSeo, routeUrl, siteOrigin} from '../core/index.js';
import type {ResolveOptions, ResolvedSeo, SeoConfig, SeoDocument} from '../core/index.js';

/** Use the returned absolute title to avoid a second suffix from a parent template. */
export function toMetadata(seo: ResolvedSeo): Metadata {
  const sharing = seo.social ?? {title: seo.title, description: seo.description, image: seo.image, card: seo.image ? 'summary_large_image' as const : 'summary' as const};
  const images = sharing.image ? [{url: sharing.image.url, alt: sharing.image.alt, width: sharing.image.width, height: sharing.image.height}] : [];
  return {
    title: {absolute: seo.title}, description: seo.description,
    metadataBase: new URL(seo.site.origin),
    alternates: {canonical: seo.canonical ?? null},
    robots: {index: seo.index, follow: true, ...(seo.index ? {'max-image-preview': 'large' as const, 'max-snippet': -1, 'max-video-preview': -1} : {})},
    openGraph: {
      type: seo.kind === 'article' ? 'article' : 'website', title: sharing.title,
      description: sharing.description, url: seo.url, siteName: seo.site.name, images,
      ...(seo.kind === 'article' ? {publishedTime: seo.publishedAt, modifiedTime: seo.modifiedAt, authors: seo.author?.url ? [seo.author.url] : undefined} : {}),
    },
    twitter: {card: sharing.card, title: sharing.title, description: sharing.description, images: sharing.image ? [sharing.image.url] : [], ...(sharing.site ? {site: sharing.site} : {})},
  };
}

export function createMetadata(config: SeoConfig, document: SeoDocument, options?: ResolveOptions): Metadata {
  return toMetadata(resolveSeo(config, document, options));
}

export function buildJsonLd(seo: ResolvedSeo): Record<string, unknown> {
  const siteId = `${seo.site.origin}/#website`;
  const publisherId = `${seo.site.origin}/#publisher`;
  const pageId = `${seo.url}#webpage`;
  const graph: Record<string, unknown>[] = [];
  if (seo.site.publisher) graph.push({
    '@type': seo.site.publisher.type, '@id': publisherId, name: seo.site.publisher.name,
    ...(seo.site.publisher.logo ? {logo: {'@type': 'ImageObject', url: seo.site.publisher.logo.url}} : {}),
  });
  graph.push({'@type': 'WebSite', '@id': siteId, url: `${seo.site.origin}/`, name: seo.site.name, ...(seo.site.publisher ? {publisher: {'@id': publisherId}} : {})});
  if (seo.breadcrumbs.length > 1) graph.push({
    '@type': 'BreadcrumbList', '@id': `${seo.url}#breadcrumb`,
    itemListElement: seo.breadcrumbs.map((crumb, index) => ({'@type': 'ListItem', position: index + 1, name: crumb.name, item: routeUrl(seo.site.origin, crumb.path)})),
  });
  graph.push({
    '@type': 'WebPage', '@id': pageId, url: seo.url, name: seo.title,
    description: seo.description, inLanguage: seo.language, isPartOf: {'@id': siteId},
    ...(seo.image ? {primaryImageOfPage: {'@type': 'ImageObject', url: seo.image.url}} : {}),
    ...(seo.breadcrumbs.length > 1 ? {breadcrumb: {'@id': `${seo.url}#breadcrumb`}} : {}),
  });
  if (seo.kind === 'article') graph.push({
    '@type': 'Article', '@id': `${seo.url}#article`, mainEntityOfPage: {'@id': pageId},
    headline: seo.title, description: seo.description, inLanguage: seo.language,
    datePublished: seo.publishedAt, dateModified: seo.modifiedAt,
    ...(seo.image ? {image: [seo.image.url]} : {}),
    ...(seo.author ? {author: {'@type': 'Person', name: seo.author.name, ...(seo.author.url ? {url: seo.author.url} : {})}} : {}),
    ...(seo.site.publisher ? {publisher: {'@id': publisherId}} : {}),
  });
  return {'@context': 'https://schema.org', '@graph': graph};
}

export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

/** Render in a Server Component; keep authenticated fetching in the host. */
export function SeoJsonLd({seo}: {seo: ResolvedSeo}) {
  return createElement('script', {type: 'application/ld+json', dangerouslySetInnerHTML: {__html: serializeJsonLd(buildJsonLd(seo))}});
}

export function createSitemap(config: SeoConfig, documents: readonly SeoDocument[], options: ResolveOptions = {}): MetadataRoute.Sitemap {
  const entries = new Map<string, MetadataRoute.Sitemap[number]>();
  if (options.preview) return [];
  for (const document of documents) {
    const adapter = Object.hasOwn(config.types, document._type) ? config.types[document._type] : undefined;
    if (!adapter || document._id?.startsWith('drafts.') || document._id?.startsWith('versions.') || adapter.getPath(document) == null) continue;
    const seo = resolveSeo(config, document, options);
    if (!seo.sitemapEligible) continue;
    const dates = [seo.publishedAt, seo.modifiedAt].filter((value): value is string => Boolean(value));
    const lastModified = dates.length ? new Date(Math.max(...dates.map(Date.parse))).toISOString() : undefined;
    const existing = entries.get(seo.url);
    if (!existing || (lastModified && (!existing.lastModified || Date.parse(String(existing.lastModified)) < Date.parse(lastModified)))) {
      entries.set(seo.url, {url: seo.url, ...(lastModified ? {lastModified} : {}), ...(seo.image ? {images: [seo.image.url]} : {})});
    }
  }
  return [...entries.values()];
}

export function createRobots(origin: string, options: {preview?: boolean; disallow?: string[]} = {}): MetadataRoute.Robots {
  const base = siteOrigin(origin);
  return {
    rules: options.preview ? {userAgent: '*', disallow: '/'} : {userAgent: '*', allow: '/', ...(options.disallow ? {disallow: options.disallow} : {})},
    ...(!options.preview ? {sitemap: absoluteUrl(`${base}/sitemap.xml`)} : {}),
  };
}
