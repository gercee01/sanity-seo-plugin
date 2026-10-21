import {notFound} from 'next/navigation';
import {createMetadata} from '@gerald/seo/next';
import {config, documents, settings} from '../../seo.config.mjs';
import {Content} from '../../content.jsx';

async function load(params) {
  const {slug} = await params;
  const path = '/' + slug.join('/');
  const doc = documents.find((item) => !item._id?.startsWith('drafts.') && config.types[item._type].getPath(item) === path);
  if (!doc) notFound();
  return doc;
}
export async function generateMetadata({params}) {return createMetadata(config, await load(params), {settings});}
export default async function Page({params}) {return <Content document={await load(params)} />;}
