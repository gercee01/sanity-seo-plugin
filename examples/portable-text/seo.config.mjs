import {defineSeoConfig, mergeContent, normalizeSeoSettings, portableTextContent} from '@gerald/seo/core';

export const config = defineSeoConfig({
  site: {origin: 'https://pages.example', name: 'Pages Example', description: 'Useful pages with maintainable SEO.', publisher: {type: 'Organization', name: 'Pages Example'}},
  types: {page: {
    getPath: (doc) => doc.isHomepage ? '/' : doc.slug?.current ? '/' + doc.slug.current : null,
    getContent: (doc) => mergeContent(
      {nodes: [{type: 'heading', level: 1, text: String(doc.title ?? ''), path: ['title']}], issues: []},
      portableTextContent(doc.body, ['body']),
    ),
  }},
});
const body = [{_type: 'block', _key: 'intro', style: 'normal', children: [{_type: 'span', text: 'Practical SEO guidance helps editors write clear content and publish accurate page metadata.', marks: []}]}];
export const documents = [
  {_id: 'home', _type: 'page', title: 'Home', isHomepage: true, body},
  {_id: 'guide', _type: 'page', title: 'Search basics', slug: {current: 'guide'}, body, seo: {focusKeyphrase: 'SEO', social: {title: 'Share this SEO guide', description: 'Social description for the guide.'}}},
  {_id: 'hidden', _type: 'page', title: 'Hidden page', slug: {current: 'hidden'}, body, seo: {indexing: 'noindex'}},
  {_id: 'alias', _type: 'page', title: 'Alias', slug: {current: 'alias'}, body, seo: {canonicalUrl: 'https://pages.example/guide'}},
  {_id: 'drafts.draft', _type: 'page', title: 'Private draft', slug: {current: 'draft'}, body},
];
// Fixture stand-in for a host-owned published settings query; not a live CMS connection.
export const settings = normalizeSeoSettings({site: {name: 'Published Pages', image: {url: 'https://pages.example/share.png'}}, separator: '–', contentTypes: [{type: 'page', titleTemplate: '{title} {separator} {siteName}'}], social: {site: '@pages'}});
export const expected = {origin: config.site.origin, path: '/guide', title: 'Search basics – Published Pages', socialTitle: 'Share this SEO guide', image: 'https://pages.example/share.png'};

export async function loadDocuments({client, cursor, limit, perspective, signal}) {
  const items = await client.withConfig({perspective}).fetch(
    '*[_type == "page" && (!defined($cursor) || _id > $cursor)] | order(_id asc)[0...25]{_id,_type,_rev,_updatedAt,title,slug,isHomepage,body,seo}',
    {cursor: cursor ?? null, limit}, {signal},
  );
  return {documents: items, nextCursor: items.length === limit ? items.at(-1)._id : undefined};
}
