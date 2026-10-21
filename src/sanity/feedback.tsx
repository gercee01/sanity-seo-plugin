'use client';

import {Badge, Box, Card, Flex, Heading, Stack, Text} from '@sanity/ui';
import {IntentLink} from 'sanity/router';
import type {SeoCheck, SeoDocument, SourcePath, TrafficLight} from '../core/index.js';
import {seoCheckPriority} from '../core/index.js';

const lightLabels = {problem: '● Problems', improvement: '● Improvements', good: '● Good', unavailable: '○ Incomplete'};
const tones = {problem: 'critical', improvement: 'caution', good: 'positive', unavailable: 'default'} as const;

export function Status({label, status}: {label: string; status: TrafficLight}) {
  return <Badge tone={tones[status]}>{label}: {lightLabels[status]}</Badge>;
}

export function sourcePath(path: SourcePath): string {
  return path.map((segment, index) => typeof segment === 'number' ? `[${segment}]` : typeof segment === 'object' ? `[_key==${JSON.stringify(segment._key)}]` : `${index ? '.' : ''}${segment}`).join('');
}

export function EditorLink({document, path, children}: {document: SeoDocument; path?: SourcePath; children: React.ReactNode}) {
  return document._id ? <IntentLink intent="edit" params={{id: document._id.replace(/^(?:drafts\.|versions\.[^.]+\.)/, ''), type: document._type, ...(path?.length ? {path: sourcePath(path)} : {})}}>{children}</IntentLink> : <span>{children}</span>;
}

export function CheckList({checks, document}: {checks: SeoCheck[]; document: SeoDocument}) {
  return <Stack gap={3}>
    {(['warning', 'unavailable', 'info', 'good'] as const).map((status) => {
      const items = checks.filter((check) => check.status === status).sort((a, b) => seoCheckPriority(a) - seoCheckPriority(b));
      if (!items.length) return null;
      return <details key={status} open={status === 'warning' || status === 'unavailable'}>
        <summary>{status === 'warning' ? 'Problems and improvements' : status === 'unavailable' ? 'Incomplete checks' : status === 'info' ? 'Information' : 'Good results'} ({items.length})</summary>
        <Stack as="ul" gap={3} paddingTop={3} style={{paddingLeft: 24}}>{items.map((check) => <Box as="li" key={check.id}>
          <Text size={1}>{check.message} {check.path && <EditorLink document={document} path={check.path}>Edit field</EditorLink>}</Text>
        </Box>)}</Stack>
      </details>;
    })}
  </Stack>;
}

export function SearchPreview({seo, mobile}: {seo: import('../core/index.js').ResolvedSeo; mobile: boolean}) {
  return <Card padding={3} border radius={2} style={{maxWidth: mobile ? 360 : 640}}>
    <Stack gap={3}>
      <Text size={1} muted>{seo.url}</Text><Heading>{seo.title}</Heading>
      <Text size={1}>{seo.description ?? 'No description available.'}</Text>
      <Text size={1} muted>Title: {seo.sources.title} · Description: {seo.sources.description} · Image: {seo.sources.image}</Text>
    </Stack>
  </Card>;
}

export function SocialPreview({seo}: {seo: import('../core/index.js').ResolvedSeo}) {
  const sharing = seo.social ?? {title: seo.title, description: seo.description, image: seo.image, card: seo.image ? 'summary_large_image' : 'summary'};
  return <Flex gap={3} wrap="wrap">{['Open Graph', 'X'] .map((platform) => <Card key={platform} border radius={2} padding={3} style={{flex: '1 1 240px'}}><Stack gap={3}>
    <Text size={1} weight="semibold">{platform}{platform === 'X' ? ` · ${sharing.card}${sharing.site ? ` · ${sharing.site}` : ''}` : ''}</Text>
    {sharing.image && <img src={sharing.image.url} alt={sharing.image.alt ?? 'Social sharing preview'} style={{display: 'block', width: '100%', maxHeight: 240, objectFit: 'cover'}} />}
    <Text weight="semibold">{sharing.title}</Text><Text size={1} muted>{sharing.description}</Text>
  </Stack></Card>)}</Flex>;
}
