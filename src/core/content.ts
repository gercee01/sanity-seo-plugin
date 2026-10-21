import type {AnalysisContent, ContentNode, SourcePath} from './types.js';

export function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Extracts only Portable Text semantics; custom objects require a host adapter. */
export function portableTextContent(value: unknown, path: SourcePath = []): AnalysisContent {
  const nodes: ContentNode[] = [];
  const issues: string[] = [];
  if (value == null) return {nodes, issues};
  if (!Array.isArray(value)) return {nodes, issues: ['Expected a Portable Text array.']};
  value.forEach((item, index) => {
    const block = record(item);
    const source = [...path, typeof block?._key === 'string' ? {_key: block._key} : index];
    if (!block || block._type !== 'block' || !Array.isArray(block.children)) {
      issues.push(`Unsupported content object: ${text(block?._type) ?? 'unknown'}. Supply a content adapter.`);
      return;
    }
    const spans = block.children.map(record);
    const prose = spans.map((span) => span?._type === 'span' && typeof span.text === 'string' ? span.text : '').join('');
    if (spans.some((span) => span?._type !== 'span')) issues.push('Unsupported inline object in Portable Text.');
    const heading = typeof block.style === 'string' ? /^h([1-6])$/.exec(block.style) : null;
    if (prose.trim()) nodes.push(heading
      ? {type: 'heading', text: prose, level: Number(heading[1]), path: source}
      : {type: 'paragraph', text: prose, path: source});
    const definitions = Array.isArray(block.markDefs) ? block.markDefs.map(record) : [];
    for (const definition of definitions) {
      if (!definition || typeof definition._key !== 'string') continue;
      const linked = spans.filter((span) => Array.isArray(span?.marks) && span.marks.includes(definition._key));
      if (!linked.length) continue;
      const href = text(definition.href);
      if (!href && definition._type !== 'link' && definition._type !== 'internalLink') continue;
      nodes.push({type: 'link', text: linked.map((span) => span?.text ?? '').join(''), href, path: source});
      if (!href) issues.push('A link target is unresolved. Map references to href before analysis.');
    }
  });
  return {nodes, issues};
}

export function mergeContent(...parts: AnalysisContent[]): AnalysisContent {
  return {nodes: parts.flatMap((part) => part.nodes), issues: parts.flatMap((part) => part.issues)};
}
