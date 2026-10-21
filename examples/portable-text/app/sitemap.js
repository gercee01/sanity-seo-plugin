import {createSitemap} from '@gerald/seo/next';
import {config, documents, settings} from '../seo.config.mjs';

export default function sitemap() {return createSitemap(config, documents, {settings});}
