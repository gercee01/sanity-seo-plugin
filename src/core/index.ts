export type * from './types.js';
export const SEO_PACKAGE_VERSION = '0.2.0-rc.3';
export {defineSeoConfig, resolveSeo} from './resolve.js';
export {portableTextContent, mergeContent} from './content.js';
export {absoluteUrl, siteOrigin, routeUrl} from './urls.js';
export {sanityImageResolver} from './images.js';
export {analyzeSeo} from './analyze.js';
export {normalizeSeoSettings, formatSeoTitle, validateTitleTemplate, SEO_SETTINGS_ID, SEO_SETTINGS_TYPE, SEO_SETTINGS_PROJECTION} from './settings.js';
export {summarizeSeo, reviewSeoDocument, seoCheckPriority, ANALYZER_VERSION} from './review.js';
export type {SeoSummary, SeoReview, ReviewState, TrafficLight} from './review.js';
/** Include inside the host's SEO object projection. */
export const SEO_PROJECTION = 'title, description, image{asset, alt, crop, hotspot}, canonicalUrl, indexing, focusKeyphrase, social{title, description, image{asset, alt, crop, hotspot}, card}';
