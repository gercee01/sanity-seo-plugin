'use client';

import {useEffect, useSyncExternalStore} from 'react';
import {Badge, Button, Card, Flex, Heading, Select, Stack, Text} from '@sanity/ui';
import {useClient, useCurrentUser} from 'sanity';
import {ANALYZER_VERSION, SEO_PACKAGE_VERSION} from '../core/index.js';
import type {SeoPluginOptions} from './options.js';
import {useSeoSettings} from './use-settings.js';
import {getScanSession} from './scan-session.js';
import {CheckList, EditorLink, Status} from './feedback.js';

export type DashboardView = 'Overview' | 'Health' | 'Optimize' | 'Workflow';

export function SeoDashboard({options, view}: {options: SeoPluginOptions; view: DashboardView}) {
  const client = useClient({apiVersion: '2026-10-01'});
  const user = useCurrentUser();
  const session = getScanSession(options, client, user?.id);
  const data = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const {perspective, reviews, cursor, complete, busy, error, scannedAt, type, state, category, monitoring, monitorError} = data;
  const snapshot = useSeoSettings(client, options, perspective);
  useEffect(() => session.connect(client), [session, client]);
  useEffect(() => {
    if (snapshot.pending) session.cancel();
    else if (snapshot.error) session.invalidate('SEO settings unavailable. Reconnect and refresh scan.');
    else session.syncInputs(options, snapshot);
  }, [session, options, snapshot]);
  const scan = (restart = false) => session.scan(options, client, snapshot, restart);
  const resultState = (item: (typeof reviews)[number]) => item.stale ? 'stale' : item.summary.state;
  const visible = reviews.filter((item) => (type === 'all' || item.document._type === type)
    && (state === 'all' || resultState(item) === state)
    && (category === 'all' || Boolean(item.stale) || item.checks.some((check) => check.category === category && check.status !== 'good')));
  const counts = (value: string) => reviews.filter((item) => resultState(item) === value).length;

  return <Card padding={4} style={{height: '100%', overflow: 'auto'}}><Stack gap={4}>
    <Heading>SEO {view}</Heading>
    <Text size={1} muted>{options.config.site.origin} · Package {SEO_PACKAGE_VERSION} · Analyzer {ANALYZER_VERSION}</Text>
    {view === 'Overview' && <Card border padding={3}><Stack gap={3}>
      <Heading size={1}>Setup checklist</Heading>
      <Text size={1}>✓ Production origin and content mappings configured: {Object.keys(options.config.types).join(', ')}</Text>
      <Text size={1}>{options.settings === false ? 'Code-only defaults selected.' : snapshot.exists ? '✓ Settings document found. Publish settings to activate them publicly.' : '○ Open Settings to configure site identity, search appearance, and social defaults. Code defaults remain active.'}</Text>
      <Text size={1}>{options.loadDocuments ? '✓ Content scan loader configured.' : '○ Configure loadDocuments to enable Health, Optimize, and Workflow scans.'}</Text>
      <Text size={1}>○ Frontend installation and live output: not verified from Studio. Check metadata, JSON-LD, sitemap, robots, and settings publication on your Next.js site.</Text>
    </Stack></Card>}
    {view === 'Optimize' && <Text size={1}>Open an affected field, edit the document, inspect its previews, then refresh this scan. Suggestions never rewrite or publish content automatically.</Text>}
    {view === 'Workflow' && <Card border padding={3}><Stack gap={3}>
      <Heading size={1}>Before publishing</Heading>
      <Text size={1}>1. Resolve problems and review improvements. 2. Check incomplete analysis. 3. Inspect search and social previews. 4. Publish with Sanity’s normal controls.</Text>
      <Text size={1}>Ready to review is calculated guidance, not human approval or a publication blocker.</Text>
    </Stack></Card>}
    <Text size={1} muted>Content/configuration analysis only. Live indexation, rankings, deployed HTML, and production cache freshness are not verified.</Text>
    <Flex gap={3} wrap="wrap" align="center">
      <label>Review perspective <Select value={perspective} onChange={(event) => session.setPerspective(event.currentTarget.value as 'published' | 'drafts')}><option value="published">Published content + published settings</option><option value="drafts">Draft perspective (includes published fallback)</option></Select></label>
      <Button text={busy ? 'Scanning…' : reviews.length ? 'Refresh scan' : 'Start scan'} disabled={busy || snapshot.pending || Boolean(snapshot.error) || !options.loadDocuments || !monitoring} onClick={() => void scan(true)} />
      {!complete && cursor && <Button text="Scan next 25" disabled={busy || snapshot.pending || Boolean(snapshot.error) || !monitoring} mode="ghost" onClick={() => void scan()} />}
      {busy && <Button text="Cancel" mode="ghost" onClick={session.cancel} />}
    </Flex>
    <Text size={1} muted>{snapshot.pending ? 'Loading settings…' : `${perspective} settings revision: ${snapshot.revision ?? 'code defaults'}`}</Text>
    {(snapshot.error || error) && <Card role="alert" tone="critical" padding={3}><Text size={1}>{snapshot.error ?? error}</Text></Card>}
    {!monitoring && <Card role="status" tone="caution" padding={3}><Text size={1}>{monitorError ?? 'Connecting content updates before scanning…'}</Text></Card>}
    <Flex gap={2} wrap="wrap" role="status" aria-live="polite">
      <Badge>{reviews.length} scanned · {complete ? 'scan complete' : 'partial / not scanned'}</Badge>
      <Badge tone="caution">{counts('needs-attention')} need attention</Badge><Badge>{counts('incomplete')} incomplete</Badge><Badge tone="positive">{counts('ready')} ready to review</Badge>
      <Badge tone="caution">{counts('stale')} stale — refresh required</Badge>
    </Flex>
    {scannedAt && <Text size={1} muted>Last scanned: {scannedAt}. Content/reference changes mark these results stale; refresh to recheck. Open-document analysis follows unsaved edits.</Text>}
    <Flex gap={3} wrap="wrap">
      <label>Content type <Select value={type} onChange={(event) => session.update({type: event.currentTarget.value})}><option value="all">All mapped types</option>{Object.keys(options.config.types).map((name) => <option key={name}>{name}</option>)}</Select></label>
      <label>Review status <Select value={state} onChange={(event) => session.update({state: event.currentTarget.value})}><option value="all">All statuses</option><option value="needs-attention">Needs attention</option><option value="incomplete">Incomplete analysis</option><option value="ready">Ready to review</option><option value="stale">Stale — refresh required</option></Select></label>
      <label>Issue category <Select value={category} onChange={(event) => session.update({category: event.currentTarget.value})}><option value="all">All categories</option><option value="metadata">Metadata</option><option value="content">Content</option><option value="readability">Readability</option></Select></label>
    </Flex>
    {visible.map((item) => <Card key={item.document._id} border radius={2} padding={3}><Stack gap={3}>
      <EditorLink document={item.document} path={[options.config.seoField ?? 'seo']}><Text weight="semibold">{item.seo?.title ?? String(item.document.title ?? item.document._id)}</Text></EditorLink>
      <Text size={1} muted>{item.document._type} · {perspective} perspective · {item.seo?.routeUrl ?? 'Unresolved route'}</Text>
      {item.stale ? <Text size={1} weight="semibold">Stale result: {item.stale}</Text> : <Flex gap={2} wrap="wrap"><Status label="SEO" status={item.summary.seo} /><Status label="Readability" status={item.summary.readability} />{item.seo && !item.seo.index && <Badge>Noindex</Badge>}</Flex>}
      {item.error && <Text size={1}>{item.error}</Text>}
      {!item.stale && view !== 'Overview' && <CheckList checks={view === 'Health' ? item.checks.filter((check) => check.status !== 'good') : item.checks} document={item.document} />}
    </Stack></Card>)}
    {!visible.length && <Text size={1} muted>{reviews.length ? 'No scanned documents match these filters.' : 'Run a scan to review mapped content. No results is not a passing health check.'}</Text>}
  </Stack></Card>;
}
