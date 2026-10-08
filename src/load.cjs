'use strict';

/**
 * @fileoverview When the configuration is loaded, and with what: the one
 * rule the plugin, `serverOptions()` and the preload entry share.
 *
 * - **Options given: load with them**, whatever was loaded before. They
 *   are a request for that configuration.
 * - **No options: read what is loaded**, so `serverOptions(options)`
 *   followed by `register(cooper)` is one load, not two -- and a load the
 *   application made with `cooper-config` itself, or through a preload,
 *   is the one the plugin reads.
 * - **No options and nothing loaded: load the defaults.**
 *
 * Every load registers `!file`, beside the application's own tags.
 */

const path = require('node:path');
const cooperConfig = require('cooper-config');
const { fileTag, projectRoot } = require('./file-tag.cjs');

/**
 * Fastify's own `register()` options. Fastify hands them to the plugin
 * along with the rest, and they are not cooper-config's to refuse.
 */
const FASTIFY_REGISTER_OPTIONS = ['prefix', 'logLevel', 'logSerializers'];

/**
 * Loads the configuration by the rule above.
 * @param {Record<string, unknown>} [options] -- cooper-config's load options, Fastify's register options among them or not
 * @returns {void}
 * @throws {TypeError} for an option cooper-config does not know
 * @throws {import('cooper-config').CooperConfigError} when the document does not load
 */
function ensureLoaded(options = {}) {
  const own = withoutFastifyOptions(options);
  if (Object.keys(own).length === 0 && isLoaded()) return;
  cooperConfig.load(withFileTag(own));
}

/**
 * `options` without Fastify's own register options.
 * @param {Record<string, unknown>} options
 * @returns {Record<string, unknown>}
 */
function withoutFastifyOptions(options) {
  /** @type {Record<string, unknown>} */
  const own = {};
  for (const [key, value] of Object.entries(options)) {
    if (!FASTIFY_REGISTER_OPTIONS.includes(key)) own[key] = value;
  }
  return own;
}

/**
 * `options` with `!file` among its tags, rooted where the document is
 * read from. **The application's own `file` tag wins**, as a tag of
 * cooper's own name does over cooper's built-in.
 * @param {Record<string, unknown>} options
 * @returns {Record<string, unknown>}
 */
function withFileTag(options) {
  const root = typeof options.root === 'string' ? path.resolve(options.root) : projectRoot();
  const file = fileTag(root);
  const tags = options.tags;
  if (tags instanceof Map) return { ...options, tags: new Map([['file', file], ...tags]) };
  return { ...options, tags: { file, .../** @type {Record<string, unknown>} */ (tags ?? {}) } };
}

/**
 * Whether a configuration has been loaded in this process. `cooper-config`
 * answers that only by refusing to read before a load.
 * @returns {boolean}
 */
function isLoaded() {
  try {
    cooperConfig.all();
    return true;
  } catch (err) {
    if (err instanceof cooperConfig.CooperConfigError) return false;
    throw err;
  }
}

module.exports = { ensureLoaded, withFileTag };
