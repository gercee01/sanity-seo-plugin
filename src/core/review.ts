import {analyzeSeo} from './analyze.js';
import {resolveSeo} from './resolve.js';
import type {ResolveOptions, ResolvedSeo, SeoCheck, SeoConfig, SeoDocument} from './types.js';

export const ANALYZER_VERSION = '0.2.1';
export type TrafficLight = 'problem' | 'improvement' | 'good' | 'unavailable';
export type ReviewState = 'needs-attention' | 'incomplete' | 'ready';
export type SeoSummary = {seo: TrafficLight; readability: TrafficLight; state: ReviewState; problems: number; improvements: number; unavailable: number};
export type SeoReview = {document: SeoDocument; seo?: ResolvedSeo; checks: SeoCheck[]; summary: SeoSummary; error?: string};
const problemIds = new Set(['title', 'description', 'h1']);

export function seoCheckPriority(check: SeoCheck): number {
  if (check.status === 'warning' && (problemIds.has(check.id) || check.id.startsWith('link-target-'))) return 0;
  if (check.status === 'unavailable') return 1;
  if (check.status === 'warning') return check.category === 'metadata' ? 2 : check.category === 'content' ? 3 : 4;
  return check.status === 'info' ? 5 : 6;
}

export function summarizeSeo(checks: readonly SeoCheck[]): SeoSummary {
  const problems = checks.filter((check) => check.status === 'warning' && (problemIds.has(check.id) || check.id.startsWith('link-target-'))).length;
  const improvements = checks.filter((check) => check.status === 'warning').length - problems;
  const unavailable = checks.filter((check) => check.status === 'unavailable').length;
  function light(items: readonly SeoCheck[]): TrafficLight {
    if (!items.some((check) => check.status === 'good' || check.status === 'warning') || items.some((check) => check.status === 'unavailable')) return 'unavailable';
    if (items.some((check) => check.status === 'warning' && (problemIds.has(check.id) || check.id.startsWith('link-target-')))) return 'problem';
    return items.some((check) => check.status === 'warning') ? 'improvement' : 'good';
  }
  const seo = light(checks.filter((check) => check.category !== 'readability'));
  const readability = light(checks.filter((check) => check.category === 'readability'));
  return {seo, readability, problems, improvements, unavailable,
    state: unavailable || seo === 'unavailable' || readability === 'unavailable' ? 'incomplete' : problems || improvements ? 'needs-attention' : 'ready'};
}

/** Review intended publication output; public output helpers continue rejecting draft/release IDs. */
export function reviewSeoDocument(config: SeoConfig, document: SeoDocument, options: ResolveOptions = {}): SeoReview {
  try {
    const editorial = {...document, _id: document._id?.replace(/^(?:drafts\.|versions\.[^.]+\.)/, '')};
    const seo = resolveSeo(config, editorial, options);
    const checks = analyzeSeo(seo);
    return {document, seo, checks, summary: summarizeSeo(checks)};
  } catch (error) {
    return {document, checks: [], summary: {seo: 'unavailable', readability: 'unavailable', state: 'incomplete', problems: 0, improvements: 0, unavailable: 1}, error: error instanceof Error ? error.message : 'Analysis failed.'};
  }
}
