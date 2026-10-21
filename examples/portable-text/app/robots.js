import {createRobots} from '@gerald/seo/next';
import {config} from '../seo.config.mjs';

export default function robots() {return createRobots(config.site.origin);}
