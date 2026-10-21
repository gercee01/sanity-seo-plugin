import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewSeoDocument} from '../dist/core/index.js';

const document = {_id: 'page', _type: 'page', title: 'A practical guide to publishing', seo: {description: 'Learn how clear titles, thoughtful descriptions, and consistent editorial checks help teams publish useful pages with reliable metadata.'}};
const heading = {type: 'heading', level: 1, text: 'A practical guide to publishing'};
function review(nodes, issues = [], language = 'en') {
  return reviewSeoDocument({site: {origin: 'https://example.com', name: 'Example', language, image: {url: 'https://example.com/share.png'}}, types: {page: {getPath: () => '/guide', getContent: () => ({nodes, issues})}}}, document);
}

for (const [label, nodes] of [
  ['heading-only', [heading]], ['empty', []], ['punctuation-only', [{type: 'paragraph', text: '... !!!'}]],
  ['headings with blank/punctuation paragraphs', [heading, {type: 'paragraph', text: '  '}, {type: 'paragraph', text: '...'}]],
]) test(`${label} content cannot pass readability or become ready`, () => {
  const result = review(nodes);
  assert.equal(result.summary.readability, 'unavailable');
  assert.equal(result.summary.state, 'incomplete');
  assert.ok(result.checks.some((check) => check.id === 'readability-content' && check.status === 'unavailable'));
  assert.ok(!result.checks.some((check) => check.category === 'readability' && check.status === 'good'));
});

test('short genuine prose stays eligible without requiring a long page', () => {
  const result = review([heading, {type: 'paragraph', text: 'This guide helps editors publish useful content.'}]);
  assert.equal(result.summary.readability, 'good');
  assert.equal(result.summary.state, 'ready');
  assert.equal(result.checks.find((check) => check.id === 'sentence-beginnings').status, 'info');
});

test('three repeated sentence beginnings are assessed while coverage/language limits stay incomplete', () => {
  const nodes = [heading, {type: 'paragraph', text: 'We write clearly. We edit carefully. We publish thoughtfully.'}];
  assert.equal(review(nodes).checks.find((check) => check.id === 'sentence-beginnings').status, 'warning');
  assert.equal(review(nodes, ['Unknown section']).summary.state, 'incomplete');
  assert.equal(review(nodes, [], 'fr').summary.readability, 'unavailable');
});
