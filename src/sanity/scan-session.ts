import {ANALYZER_VERSION} from '../core/index.js';
import type {SeoReview} from '../core/index.js';
import type {SanityClient} from 'sanity';
import type {SeoPluginOptions} from './options.js';
import type {SettingsSnapshot} from './settings.js';
import {scanSeoPage} from './scan.js';

type ScannedReview = SeoReview & {stale?: string; identity: {document: string; settings: string; analyzer: string; adapter: number}};
type ScanState = {
  perspective: 'published' | 'drafts'; reviews: ScannedReview[]; cursor?: string; complete: boolean;
  busy: boolean; error?: string; scannedAt?: string; type: string; state: string; category: string;
  monitoring: boolean; monitorError?: string;
};

export function createScanSession() {
  let state: ScanState = {perspective: 'published', reviews: [], complete: false, busy: false, type: 'all', state: 'all', category: 'all', monitoring: false};
  const listeners = new Set<() => void>();
  const cursors = new Set<string>();
  let request: AbortController | undefined;
  let inputs: unknown[] = [];
  let settingsIdentity = '';
  let adapter = 0;
  let connections = 0;
  let subscription: {unsubscribe(): void} | undefined;
  let connection = 0;
  const update = (patch: Partial<ScanState>) => {state = {...state, ...patch}; for (const listener of listeners) listener();};
  const cancel = () => {request?.abort(); request = undefined; if (state.busy) update({busy: false});};
  const invalidate = (reason: string) => {
    cancel(); cursors.clear();
    update({reviews: state.reviews.map((review) => ({...review, stale: reason})), cursor: undefined, complete: false});
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {listeners.add(listener); return () => {listeners.delete(listener);};},
    update, cancel, invalidate,
    setPerspective(perspective: ScanState['perspective']) {
      if (perspective === state.perspective) return;
      cancel(); cursors.clear(); settingsIdentity = '';
      update({perspective, reviews: [], cursor: undefined, complete: false, error: undefined, scannedAt: undefined});
    },
    syncInputs(options: SeoPluginOptions, snapshot: SettingsSnapshot) {
      const next = [options.config, JSON.stringify(options.config.site), options.config.seoField, options.config.resolveImage,
        ...Object.entries(options.config.types).flatMap(([name, mapping]) => [name, ...Object.values(mapping)]),
        options.loadContext, options.loadDocuments, options.settings, ANALYZER_VERSION];
      const identity = JSON.stringify([snapshot.settings, snapshot.revision]);
      if (inputs.length && (next.length !== inputs.length || next.some((value, index) => value !== inputs[index]))) {
        adapter++; invalidate('Content mapping or analyzer changed. Refresh scan.');
      }
      if (settingsIdentity && identity !== settingsIdentity) invalidate('SEO settings changed. Refresh scan.');
      inputs = next; settingsIdentity = identity;
    },
    connect(client: SanityClient) {
      connections++;
      if (!subscription) {
        const current = ++connection;
        const disconnected = () => {
          if (current !== connection) return;
          invalidate('Content monitoring failed. Reload before rescanning.');
          update({monitoring: false, monitorError: 'Content updates unavailable. Reload to reconnect.'});
        };
        try {
          subscription = client.listen('*', {}, {includeResult: false, includeMutations: false, includeAllVersions: true, visibility: 'query', events: ['welcome', 'mutation', 'reconnect']}).subscribe({
            next(event) {
              if (current !== connection) return;
              if (event.type === 'welcome') {
                invalidate('Content monitoring (re)connected. Refresh scan.');
                update({monitoring: true, monitorError: undefined});
              } else if (event.type === 'reconnect') {
                invalidate('Content monitoring disconnected. Refresh after reconnecting.');
                update({monitoring: false, monitorError: 'Content updates disconnected. Waiting to reconnect.'});
              } else if (event.type === 'mutation') {
                if (event.documentId.startsWith('versions.') || (state.perspective === 'published' && event.documentId.startsWith('drafts.'))) return;
                // Context loaders may resolve any reference; narrow invalidation only when dependencies are explicit.
                invalidate('Saved content or a referenced document changed. Refresh scan.');
              }
            },
            error: disconnected,
            complete: disconnected,
          });
        } catch {
          update({monitoring: false, monitorError: 'Content updates unavailable. Reload to reconnect.'});
          invalidate('Content monitoring failed. Reload before rescanning.');
        }
      }
      return () => {
        connections--;
        // Structure can replace panes in one commit; keep the connection during that navigation.
        queueMicrotask(() => {
          if (connections) return;
          connection++; subscription?.unsubscribe(); subscription = undefined;
          invalidate('Content monitoring paused while away. Refresh scan.');
          update({monitoring: false});
        });
      };
    },
    async scan(options: SeoPluginOptions, client: SanityClient, snapshot: SettingsSnapshot, restart = false) {
      if (!state.monitoring) return;
      cancel();
      const controller = new AbortController(); request = controller;
      if (restart) {cursors.clear(); update({reviews: [], cursor: undefined, complete: false, scannedAt: undefined});}
      update({busy: true, error: undefined});
      try {
        const page = await scanSeoPage(options, {client, cursor: state.cursor, perspective: state.perspective, signal: controller.signal}, snapshot);
        if (controller.signal.aborted) return;
        if (page.nextCursor && cursors.has(page.nextCursor)) throw new Error('The document loader repeated a page cursor. Fix the loader and refresh.');
        if (page.nextCursor) cursors.add(page.nextCursor);
        const unique = new Map(state.reviews.map((item) => [item.document._id, item]));
        for (const review of page.reviews) unique.set(review.document._id, {...review, identity: {
          document: typeof review.document._rev === 'string' ? review.document._rev : JSON.stringify(review.document),
          settings: settingsIdentity, analyzer: ANALYZER_VERSION, adapter,
        }});
        update({reviews: [...unique.values()], cursor: page.nextCursor, complete: !page.nextCursor, scannedAt: new Date().toLocaleString()});
      } catch (cause) {
        if (!controller.signal.aborted) update({error: cause instanceof Error ? cause.message : 'Scan failed.'});
      } finally {if (!controller.signal.aborted) {request = undefined; update({busy: false});}}
    },
  };
}

// In-memory only, scoped to plugin/project/dataset/user; never persisted as editorial approval.
const sessions = new WeakMap<SeoPluginOptions, Map<string, ReturnType<typeof createScanSession>>>();
export function getScanSession(options: SeoPluginOptions, client: SanityClient, userId?: string) {
  const config = client.config();
  const key = JSON.stringify([config.projectId, config.dataset, userId]);
  let workspace = sessions.get(options);
  if (!workspace) {workspace = new Map(); sessions.set(options, workspace);}
  let session = workspace.get(key);
  if (!session) {session = createScanSession(); workspace.set(key, session);}
  return session;
}
