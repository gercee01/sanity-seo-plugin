import {createMetadata} from '@gerald/seo/next';
import {config, documents, settings} from '../seo.config.mjs';
import {Content} from '../content.jsx';

const document = documents.find((doc) => config.types[doc._type].getPath(doc) === '/');
export function generateMetadata() {return createMetadata(config, document, {settings});}
export default function Home() {return <Content document={document} />;}
