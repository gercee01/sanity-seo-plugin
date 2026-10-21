'use client';

import {useEffect, useState} from 'react';
import type {SanityClient} from 'sanity';
import {loadSeoSettings, settingsTarget} from './settings.js';
import type {SettingsSnapshot} from './settings.js';
import type {SeoPluginOptions} from './options.js';

export function useSeoSettings(client: SanityClient, options: SeoPluginOptions, perspective: 'published' | 'drafts') {
  const [state, setState] = useState<SettingsSnapshot & {pending: boolean; error?: string}>({settings: {}, exists: false, pending: true});
  const {config, settings} = options;
  useEffect(() => {
    let active = true;
    let request = 0;
    async function refresh() {
      const current = ++request;
      setState((previous) => ({...previous, pending: true, error: undefined}));
      try {
        const snapshot = await loadSeoSettings(client, config, {settings}, perspective);
        if (active && current === request) setState({...snapshot, pending: false});
      } catch (error) {
        if (active && current === request) setState({settings: {}, exists: false, pending: false, error: error instanceof Error ? error.message : 'Could not load SEO settings.'});
      }
    }
    void refresh();
    const target = settingsTarget({settings});
    const subscription = target ? client.listen('*[_id in [$id, $draftId]]', {id: target.documentId, draftId: `drafts.${target.documentId}`}, {includeResult: false, visibility: 'query'}).subscribe({next: () => void refresh(), error: () => {
      request++;
      if (active) setState((previous) => ({...previous, pending: false, error: 'Settings updates disconnected. Reload to verify the latest defaults.'}));
    }}) : undefined;
    return () => {active = false; request++; subscription?.unsubscribe();};
  }, [client, config, settings, perspective]);
  return state;
}
