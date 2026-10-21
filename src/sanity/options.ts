import type {SanityClient} from 'sanity';
import type {SeoConfig, SeoDocument, SeoSettings, SeoSite} from '../core/index.js';

export type SeoSettingsIntegration = {documentId: string; schemaType: string; field?: string};
export type SeoContext = {document?: SeoDocument; site?: Partial<SeoSite>; settings?: SeoSettings};
export type SeoDocumentPage = {documents: SeoDocument[]; nextCursor?: string};
export type SeoPluginOptions = {
  config: SeoConfig;
  /** false retains code-only settings; an object integrates an existing singleton. */
  settings?: false | SeoSettingsIntegration;
  loadContext?: (document: SeoDocument, client: SanityClient, context: {signal: AbortSignal}) => Promise<SeoContext>;
  /** Host-owned projection and reference loading. Return no nextCursor after the last page. */
  loadDocuments?: (request: {client: SanityClient; cursor?: string; limit: number; perspective: 'published' | 'drafts'; signal: AbortSignal}) => Promise<SeoDocumentPage>;
};
