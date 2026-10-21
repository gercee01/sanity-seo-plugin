import type {ResolvedSeo, SeoCheck} from './types.js';

function words(value: string, language: string): string[] {
  return [...new Intl.Segmenter(language, {granularity: 'word'}).segment(value)]
    .filter((part) => part.isWordLike).map((part) => part.segment.toLocaleLowerCase(language));
}

function contains(value: string, phrase: string, language: string): boolean {
  const haystack = ` ${words(value, language).join(' ')} `;
  return haystack.includes(` ${words(phrase, language).join(' ')} `);
}

export function analyzeSeo(seo: ResolvedSeo): SeoCheck[] {
  const checks: SeoCheck[] = [];
  const add = (id: string, category: SeoCheck['category'], pass: boolean, message: string, path?: SeoCheck['path']) => {
    checks.push({id, category, status: pass ? 'good' : 'warning', message, path});
  };
  add('title', 'metadata', seo.title.length > 0, 'A resolved search title is available.');
  add('title-length', 'metadata', seo.title.length >= 30 && seo.title.length <= 65, `Title: ${seo.title.length} characters. Rough guidance is 30–65; actual search width varies.`);
  add('description', 'metadata', Boolean(seo.description), seo.description ? 'A resolved description is available.' : 'Add a description or meaningful introductory paragraph.');
  if (seo.description) add('description-length', 'metadata', seo.description.length >= 120 && seo.description.length <= 160, `Description: ${seo.description.length} characters. Rough guidance is 120–160.`);
  const sharingImage = seo.social?.image ?? seo.image;
  add('social-image', 'metadata', Boolean(sharingImage), sharingImage ? 'A social sharing image is available.' : 'Add a social image, content image or site default.');
  checks.push({id: 'indexing', category: 'metadata', status: seo.index ? 'good' : 'info', message: seo.index ? 'This page allows indexing.' : 'This page is noindex. Confirm that this is intentional.'});
  if (seo.url !== seo.routeUrl) checks.push({id: 'canonical', category: 'metadata', status: 'info', message: `Canonical points to ${seo.url}; this route is excluded from the sitemap.`});
  for (const [index, message] of seo.content.issues.entries()) checks.push({id: `coverage-${index}`, category: 'content', status: 'unavailable', message});
  const prose = seo.content.nodes.filter((node) => node.type === 'paragraph' || node.type === 'heading');
  const body = prose.map((node) => node.text).join('\n');
  const wordCount = words(body, seo.language).length;
  if (!wordCount) {
    checks.push({id: 'content', category: 'content', status: 'unavailable', message: 'No analyzable content. Configure an adapter for the rendered page.'});
    checks.push({id: 'readability-content', category: 'readability', status: 'unavailable', message: 'Readability needs analyzable paragraph text.'});
    return checks;
  }
  checks.push({id: 'word-count', category: 'content', status: wordCount >= 300 ? 'good' : 'info', message: `${wordCount} words analyzed. Content length should serve the page purpose; 300 is an advisory reference.`});
  const headings = seo.content.nodes.filter((node) => node.type === 'heading');
  add('h1', 'content', headings.filter((node) => node.level === 1).length === 1, 'Use one main H1 in the rendered page; include renderer-generated headings in the adapter.');
  let previousLevel = 0;
  for (const heading of headings) {
    if (heading.level > previousLevel + 1) add('heading-order', 'content', false, `Heading jumps from H${previousLevel} to H${heading.level}.`, heading.path);
    previousLevel = heading.level;
  }
  for (const [index, node] of seo.content.nodes.entries()) {
    if (node.type === 'image') add(`image-alt-${index}`, 'content', node.decorative === true || Boolean(node.alt?.trim()), node.decorative ? 'Decorative image does not need descriptive alt text.' : 'Content images need descriptive alt text.', node.path);
    if (node.type === 'link') {
      add(`link-text-${index}`, 'content', Boolean(node.text.trim()) && !/^(click here|read more|here|link)$/i.test(node.text.trim()), 'Use link text that explains the destination.', node.path);
      let valid = false;
      try {
        const target = new URL(node.href ?? '', seo.routeUrl);
        valid = Boolean(node.href) && ['http:', 'https:', 'mailto:', 'tel:'].includes(target.protocol);
      } catch { /* An unresolved or malformed target receives feedback below. */ }
      add(`link-target-${index}`, 'content', valid, 'Links need a resolved, safe destination.', node.path);
    }
  }
  const phrase = seo.focusKeyphrase;
  if (phrase && words(phrase, seo.language).length) {
    let slug = new URL(seo.routeUrl).pathname;
    try { slug = decodeURIComponent(slug).replace(/[-_/]/g, ' '); } catch { /* Keep malformed percent escapes visible to the check. */ }
    for (const [id, label, value] of [
      ['title', 'search title', seo.title], ['description', 'description', seo.description ?? ''],
      ['slug', 'URL path', slug], ['introduction', 'first paragraph', prose.find((node) => node.type === 'paragraph')?.text ?? ''],
    ]) add(`keyphrase-${id}`, 'content', contains(value!, phrase, seo.language), `Focus keyphrase in ${label}.`);
  } else checks.push({id: 'keyphrase', category: 'content', status: 'info', message: 'Set a focus keyphrase to enable placement checks.'});
  if (!/^en(?:-|$)/i.test(seo.language)) {
    checks.push({id: 'readability-language', category: 'readability', status: 'unavailable', message: 'This release calibrates readability guidance for English only.'});
    return checks;
  }
  const paragraphs = prose.filter((node) => node.type === 'paragraph' && words(node.text, 'en').length > 0);
  const sentences = paragraphs.flatMap((node) => [...new Intl.Segmenter('en', {granularity: 'sentence'}).segment(node.text)].map((part) => part.segment)).filter((sentence) => words(sentence, 'en').length > 0);
  if (!sentences.length) {
    checks.push({id: 'readability-content', category: 'readability', status: 'unavailable', message: 'Readability needs analyzable paragraph text; headings alone are not enough.'});
    return checks;
  }
  const long = sentences.filter((sentence) => words(sentence, 'en').length > 20).length;
  if (sentences.length) add('sentence-length', 'readability', long / sentences.length <= 0.25, `${long} of ${sentences.length} sentences exceed 20 words. Consider shortening where it helps clarity.`);
  for (const [index, node] of paragraphs.entries()) {
    if (words(node.text, 'en').length > 150) add(`paragraph-${index}`, 'readability', false, 'This paragraph exceeds 150 words. Consider a natural break.', node.path);
  }
  let sectionWords = 0;
  let longSection = false;
  for (const node of prose) {
    if (node.type === 'heading') sectionWords = 0;
    else sectionWords += words(node.text, 'en').length;
    if (sectionWords > 300) longSection = true;
  }
  add('subheadings', 'readability', !longSection, 'Break long sections into meaningful subheadings where helpful.');
  const starts = sentences.map((sentence) => words(sentence, 'en')[0]);
  const repeated = starts.some((first, index) => first && first === starts[index + 1] && first === starts[index + 2]);
  if (sentences.length >= 3) add('sentence-beginnings', 'readability', !repeated, 'Vary sentence beginnings when three consecutive sentences start with the same word.');
  else checks.push({id: 'sentence-beginnings', category: 'readability', status: 'info', message: 'Sentence-beginning comparison needs at least three sentences.'});
  return checks;
}
