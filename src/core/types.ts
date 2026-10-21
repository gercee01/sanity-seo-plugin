export type Indexing = 'inherit' | 'index' | 'noindex';
export type SourcePath = readonly (string | number | {_key: string})[];
export type SeoDocument = {_type: string; _id?: string; [field: string]: unknown};
export type SeoImage = {url: string; alt?: string; width?: number; height?: number};
export type ContentNode =
  | {type: 'paragraph'; text: string; path?: SourcePath}
  | {type: 'heading'; text: string; level: number; path?: SourcePath}
  | {type: 'link'; text: string; href?: string; path?: SourcePath}
  | {type: 'image'; alt?: string; decorative?: boolean; path?: SourcePath};
export type AnalysisContent = {nodes: ContentNode[]; issues: string[]};
export type SeoOverrides = {
  title?: string;
  description?: string;
  image?: unknown;
  canonicalUrl?: string;
  indexing?: Indexing;
  focusKeyphrase?: string;
  social?: {title?: string; description?: string; image?: unknown; card?: 'summary' | 'summary_large_image'};
};
export type Author = {name: string; url?: string};
export type Breadcrumb = {name: string; path: string};
export type DocumentAdapter = {
  getPath: (document: SeoDocument) => string | null;
  getTitle?: (document: SeoDocument) => string | undefined;
  getDescription?: (document: SeoDocument) => string | undefined;
  getImage?: (document: SeoDocument) => unknown;
  getContent?: (document: SeoDocument) => AnalysisContent;
  getSeo?: (document: SeoDocument) => SeoOverrides | undefined;
  getAuthor?: (document: SeoDocument) => Author | undefined;
  getPublishedAt?: (document: SeoDocument) => string | undefined;
  getModifiedAt?: (document: SeoDocument) => string | undefined;
  getBreadcrumbs?: (document: SeoDocument) => Breadcrumb[];
  kind?: 'page' | 'article';
  indexing?: 'index' | 'noindex';
};
export type SeoSite = {
  origin: string;
  name: string;
  description?: string;
  image?: SeoImage;
  language?: string;
  publisher?: {name: string; type: 'Organization' | 'Person'; logo?: SeoImage};
};
export type SeoConfig = {
  site: SeoSite;
  types: Record<string, DocumentAdapter>;
  seoField?: string;
  resolveImage?: (value: unknown) => SeoImage | undefined;
};
export type SeoSettings = {
  site?: Omit<Partial<SeoSite>, 'origin' | 'publisher'> & {publisher?: Partial<NonNullable<SeoSite['publisher']>>};
  separator?: string;
  types?: Record<string, {titleTemplate?: string; indexing?: 'index' | 'noindex'}>;
  social?: {card?: 'summary' | 'summary_large_image'; site?: string};
};
export type ResolveOptions = {preview?: boolean; site?: Partial<SeoSite>; settings?: SeoSettings};
export type ResolvedSeo = {
  title: string;
  description?: string;
  url: string;
  routeUrl: string;
  canonical?: string;
  index: boolean;
  public: boolean;
  sitemapEligible: boolean;
  kind: 'page' | 'article';
  image?: SeoImage;
  social?: {title: string; description?: string; image?: SeoImage; card: 'summary' | 'summary_large_image'; site?: string};
  language: string;
  site: SeoSite;
  focusKeyphrase?: string;
  content: AnalysisContent;
  author?: Author;
  publishedAt?: string;
  modifiedAt?: string;
  breadcrumbs: Breadcrumb[];
  sources: {title: 'override' | 'content' | 'site'; description: 'override' | 'content' | 'site' | 'missing'; image: 'override' | 'content' | 'site' | 'missing'};
};
export type SeoCheck = {
  id: string;
  category: 'metadata' | 'content' | 'readability';
  status: 'good' | 'warning' | 'info' | 'unavailable';
  message: string;
  path?: SourcePath;
};
