import { createRequire } from 'node:module';

const requireCjs = createRequire(import.meta.url);
const plugin = requireCjs('./cooper-fastify.cjs');

/** @type {typeof plugin.serverOptions} */
const serverOptions = plugin.serverOptions;
/** @type {typeof plugin.listenOptions} */
const listenOptions = plugin.listenOptions;
/** @type {typeof plugin.fileTag} */
const fileTag = plugin.fileTag;
/** @type {string} */
const version = plugin.version;

export { plugin as cooperFastify, serverOptions, listenOptions, fileTag, version };

export default plugin;
