'use client';

import {useEffect, useState} from 'react';
import {Box, Button, Card, Flex, Heading, Stack, Text} from '@sanity/ui';
import {useClient, useFormValue} from 'sanity';
import type {ObjectInputProps} from 'sanity';
import {reviewSeoDocument} from '../core/index.js';
import type {SeoDocument, SeoReview} from '../core/index.js';
import type {SeoPluginOptions} from './options.js';
import {useSeoSettings} from './use-settings.js';
import {CheckList, SearchPreview, SocialPreview, Status} from './feedback.js';

export type {SeoPluginOptions} from './options.js';

export function SeoInput(props: ObjectInputProps & SeoPluginOptions) {
  const {config, loadContext, settings, loadDocuments, ...inputProps} = props;
  const document = useFormValue([]) as SeoDocument | undefined;
  const client = useClient({apiVersion: '2026-10-01'});
  const snapshot = useSeoSettings(client, props, 'drafts');
  const [result, setResult] = useState<SeoReview>();
  const [pending, setPending] = useState(true);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setPending(true);
    setResult(undefined);
    if (snapshot.pending) return () => {active = false;};
    const timer = setTimeout(async () => {
      try {
        if (snapshot.error) throw new Error(snapshot.error);
        if (!document?._type) throw new Error('Open a supported document to preview SEO.');
        const context = await loadContext?.(document, client.withConfig({perspective: 'drafts'}), {signal: controller.signal});
        controller.signal.throwIfAborted();
        const review = reviewSeoDocument(config, context?.document ?? document, {site: context?.site, settings: context?.settings ?? snapshot.settings});
        if (active) setResult(review);
      } catch (error) {
        if (active) setResult({document: document ?? {_type: ''}, checks: [], summary: {seo: 'unavailable', readability: 'unavailable', state: 'incomplete', problems: 0, improvements: 0, unavailable: 1}, error: error instanceof Error ? error.message : 'SEO analysis could not complete.'});
      } finally {if (active) setPending(false);}
    }, 500);
    return () => {active = false; controller.abort(); clearTimeout(timer);};
  }, [document, config, loadContext, client, snapshot]);

  return <Stack gap={4}>
    {props.renderDefault(inputProps)}
    <Card border padding={4} radius={2}><Stack gap={4}>
      <Heading>Search and sharing preview</Heading>
      <Text size={1} muted>Intended published SEO using draft settings and unsaved content. Public output uses published settings. Search and social previews are approximate.</Text>
      <Box role="status" aria-live="polite"><Text size={1} muted>{pending ? 'Updating preview and checks…' : 'Preview updated'}</Text></Box>
      {result?.error && <Card padding={3} tone="caution" role="alert"><Text size={1}>{result.error}</Text></Card>}
      {result?.seo && <>
        <Flex gap={2}><Button text="Desktop" mode={mobile ? 'ghost' : 'default'} onClick={() => setMobile(false)} /><Button text="Mobile" mode={mobile ? 'default' : 'ghost'} onClick={() => setMobile(true)} /></Flex>
        <SearchPreview seo={result.seo} mobile={mobile} />
        <SocialPreview seo={result.seo} />
        <Heading>SEO and readability guidance</Heading>
        <Flex gap={2} wrap="wrap"><Status label="SEO" status={result.summary.seo} /><Status label="Readability" status={result.summary.readability} /></Flex>
        <CheckList checks={result.checks} document={result.document} />
      </>}
    </Stack></Card>
  </Stack>;
}
