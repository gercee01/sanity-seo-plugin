import {record, text} from './content.js';
import type {SeoImage} from './types.js';

/** Dependency-free resolver for Sanity image references; ignores crop/hotspot. */
export function sanityImageResolver(options: {projectId: string; dataset: string}) {
  if (!/^[a-z0-9]+$/.test(options.projectId) || !/^[a-zA-Z0-9_-]+$/.test(options.dataset)) throw new Error('Invalid Sanity image project/dataset.');
  return (value: unknown): SeoImage | undefined => {
    const data = record(value);
    if (!data) return undefined;
    if (typeof data.url === 'string') return data as SeoImage;
    const asset = record(data.asset);
    const match = typeof asset?._ref === 'string' ? /^image-([a-zA-Z0-9]+)-(\d+)x(\d+)-(\w+)$/.exec(asset._ref) : null;
    if (!match) return typeof asset?.url === 'string' ? {url: asset.url, alt: text(data.alt)} : undefined;
    // shortcut: center crop only; supply a custom resolver when hotspot-aware crops are needed.
    return {url: `https://cdn.sanity.io/images/${options.projectId}/${options.dataset}/${match[1]}-${match[2]}x${match[3]}.${match[4]}?w=1200&h=630&fit=crop&auto=format`, width: 1200, height: 630, alt: text(data.alt)};
  };
}
