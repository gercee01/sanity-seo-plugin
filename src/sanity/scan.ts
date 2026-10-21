import {reviewSeoDocument} from '../core/index.js';
import type {SeoReview} from '../core/index.js';
import type {SanityClient} from 'sanity';
import type {SeoPluginOptions} from './options.js';
import type {SettingsSnapshot} from './settings.js';

export async function scanSeoPage(options: SeoPluginOptions, request: {client: SanityClient; cursor?: string; perspective: 'published' | 'drafts'; signal: AbortSignal}, snapshot: SettingsSnapshot): Promise<{reviews: SeoReview[]; nextCursor?: string}> {
  if (!options.loadDocuments) throw new Error('Configure loadDocuments to scan your project’s mapped content.');
  request.signal.throwIfAborted();
  const page = await options.loadDocuments({...request, limit: 25});
  request.signal.throwIfAborted();
  if (!Array.isArray(page.documents) || page.documents.length > 25) throw new Error('Document loader must return at most 25 documents per page.');
  if (page.nextCursor !== undefined && (typeof page.nextCursor !== 'string' || !page.nextCursor || page.nextCursor === request.cursor)) throw new Error('Document loader returned an invalid or repeated cursor.');
  const reviews: SeoReview[] = [];
  for (const document of page.documents) {
    request.signal.throwIfAborted();
    if (!document?._type || !document._id) throw new Error('Scanned documents need _id and _type.');
    try {
      const context = await options.loadContext?.(document, request.client.withConfig({perspective: request.perspective}), {signal: request.signal});
      request.signal.throwIfAborted();
      reviews.push(reviewSeoDocument(options.config, context?.document ?? document, {site: context?.site, settings: context?.settings ?? snapshot.settings}));
    } catch (error) {
      request.signal.throwIfAborted();
      reviews.push({document, checks: [], summary: {seo: 'unavailable', readability: 'unavailable', state: 'incomplete', problems: 0, improvements: 0, unavailable: 1}, error: error instanceof Error ? error.message : 'Context unavailable.'});
    }
  }
  return {reviews, nextCursor: page.nextCursor};
}
