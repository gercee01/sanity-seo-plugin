import {SeoJsonLd} from '@gerald/seo/next';
import {resolveSeo} from '@gerald/seo/core';
import {config, settings} from './seo.config.mjs';

export function Content({document}) {
  const seo = resolveSeo(config, document, {settings});
  return <main>
    <SeoJsonLd seo={seo} />
    {seo.content.nodes.map((node, index) => {
      if (node.type === 'heading') return node.level === 1 ? <h1 key={index}>{node.text}</h1> : <h2 key={index}>{node.text}</h2>;
      if (node.type === 'paragraph') return <p key={index}>{node.text}</p>;
      if (node.type === 'link' && node.href) return <p key={index}><a href={node.href}>{node.text}</a></p>;
      return null;
    })}
  </main>;
}
