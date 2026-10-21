import {defineSeoConfig, mergeContent, normalizeSeoSettings, portableTextContent} from '@gerald/seo/core';

function extractSections(document) {
  const parts = [{nodes: [{type: 'heading', level: 1, text: String(document.headline ?? ''), path: ['headline']}], issues: []}];
  for (const section of document.contentBlocks ?? []) {
    const path = ['contentBlocks', {_key: section._key}];
    if (section._type === 'copySection') parts.push(mergeContent(
      {nodes: [{type: 'heading', level: 2, text: section.heading, path: [...path, 'heading']}], issues: []},
      portableTextContent(section.copy, [...path, 'copy']),
    ));
    else parts.push({nodes: [], issues: ['Unmapped custom section: ' + section._type]});
  }
  return mergeContent(...parts);
}
export const config = defineSeoConfig({
  seoField: 'search',
  site: {origin: 'https://journal.example', name: 'Independent Journal', description: 'Articles from a different schema.', publisher: {type: 'Person', name: 'Journal Editor'}},
  types: {
    landingPage: {getPath: () => '/', getTitle: (doc) => doc.headline, getContent: extractSections},
    story: {
      kind: 'article',
      getPath: (doc) => doc.handle ? '/articles/' + doc.handle : null,
      getTitle: (doc) => doc.headline,
      getDescription: (doc) => doc.summary,
      getContent: extractSections,
      getPublishedAt: (doc) => doc.releaseDate,
      getAuthor: (doc) => doc.writer,
      getBreadcrumbs: (doc) => [{name: 'Home', path: '/'}, {name: doc.headline, path: '/articles/' + doc.handle}],
    },
  },
});
const contentBlocks = [{_type: 'copySection', _key: 'copy', heading: 'Keep it readable', copy: [{_type: 'block', _key: 'text', style: 'normal', children: [{_type: 'span', text: 'Custom sections remain editor controlled while the shared package resolves metadata consistently.', marks: []}]}]}];
export const documents = [
  {_id: 'landing', _type: 'landingPage', headline: 'Journal home', contentBlocks},
  {_id: 'story', _type: 'story', handle: 'editor-guide', headline: 'Editor guide', summary: 'Write clear content with reusable sections.', contentBlocks, releaseDate: '2026-10-01', writer: {name: 'Casey Editor'}, search: {focusKeyphrase: 'Editor guide'}},
  {_id: 'hidden', _type: 'story', handle: 'hidden', headline: 'Hidden article', contentBlocks, search: {indexing: 'noindex'}},
  {_id: 'alias', _type: 'story', handle: 'alias', headline: 'Alias', contentBlocks, search: {canonicalUrl: 'https://journal.example/articles/editor-guide'}},
  {_id: 'drafts.draft', _type: 'story', handle: 'draft', headline: 'Private draft', contentBlocks},
];
export const settings = normalizeSeoSettings({site: {name: 'Published Journal', image: {url: 'https://journal.example/share.png'}}, contentTypes: [{type: 'story', titleTemplate: '{siteName}: {title}'}]});
export const expected = {origin: config.site.origin, path: '/articles/editor-guide', title: 'Published Journal: Editor guide', socialTitle: 'Published Journal: Editor guide', image: 'https://journal.example/share.png'};

export async function loadDocuments({client, cursor, limit, perspective, signal}) {
  const items = await client.withConfig({perspective}).fetch(
    '*[_type in ["landingPage","story"] && (!defined($cursor) || _id > $cursor)] | order(_id asc)[0...25]{_id,_type,_rev,_updatedAt,headline,handle,summary,releaseDate,writer,contentBlocks,search}',
    {cursor: cursor ?? null, limit}, {signal},
  );
  return {documents: items, nextCursor: items.length === limit ? items.at(-1)._id : undefined};
}
