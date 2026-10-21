import {defineCliConfig} from 'sanity/cli';
export default defineCliConfig({api: {projectId: 'demo1234', dataset: 'production'}, deployment: {autoUpdates: false}});
