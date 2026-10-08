'use strict';

/**
 * @fileoverview `serverOptions()` and `listenOptions()`: the `fastify`
 * block, as the `Fastify()` factory and `listen()` take it.
 *
 * **The server's options are fixed when it is created**, before any
 * plugin runs, so the plugin cannot set them. These two read the
 * configuration first -- `serverOptions()` loading it -- for the factory
 * call, which is what lets a server's body limit, timeouts and logger live
 * in the same document as everything else, under the same overlays.
 *
 * The keys are Fastify's own, camel case and all: a second spelling of
 * every option would be one more thing to learn and nothing to gain.
 * Byte sizes and durations already arrive as bytes and milliseconds, the
 * units Fastify takes them in.
 */

const cooperConfig = require('@joetjen/cooper-config');
const { ModuleRef } = require('@joetjen/cooper');
const { ensureLoaded } = require('./load.cjs');

/** The block both read. */
const BLOCK = 'fastify';

/** The sub-block that is `listen()`'s and not the factory's. */
const LISTEN = 'listen';

/**
 * The `fastify` block, without its `listen` block, for `Fastify()`.
 *
 * Loads the configuration by the plugin's rule (see `load.cjs`): with
 * `options`, or reading what is loaded when there are none. **Every
 * `!module("Name")` in the block becomes what the application mapped the
 * name to**: the value itself, or the default export of the module a
 * specifier names, which is why this is asynchronous. A document can
 * choose only among the names the application mapped, never a file of
 * code.
 *
 * @param {import('../types/cooper-fastify.js').CooperFastifyOptions} [options]
 * @returns {Promise<Record<string, any>>} a fresh, mutable object; empty when there is no `fastify` block
 * @throws {TypeError} for an option cooper-config does not know
 * @throws {import('@joetjen/cooper-config').CooperConfigError} when the document does not load
 * @example
 *   const app = Fastify(await serverOptions({ modules: { 'App.RequestId': genReqId } }));
 */
async function serverOptions(options) {
  ensureLoaded(/** @type {Record<string, unknown>} */ (options ?? {}));
  const { [LISTEN]: _listen, ...rest } = /** @type {Record<string, unknown>} */ (cooperConfig.get(BLOCK, {}));
  return /** @type {Record<string, any>} */ (await thawed(rest));
}

/**
 * The `fastify.listen` block, for `listen()`.
 *
 * It reads what is loaded and loads nothing: it is called once the app
 * exists, and by then `serverOptions()` or the plugin has loaded.
 *
 * @returns {Record<string, any>} a fresh, mutable object; empty when there is no such block
 * @throws {import('@joetjen/cooper-config').CooperConfigError} before anything is loaded
 * @example
 *   await app.listen(listenOptions());
 */
function listenOptions() {
  return /** @type {Record<string, any>} */ (copy(cooperConfig.get([BLOCK, LISTEN], {})));
}

/**
 * A mutable copy of a configuration value with every `ModuleRef` in it
 * replaced by its target.
 *
 * Mutable because Fastify, pino and `node:http` were written for option
 * objects they may fill in, and the configuration is frozen.
 *
 * @param {unknown} value
 * @returns {Promise<unknown>}
 */
async function thawed(value) {
  if (value instanceof ModuleRef) return target(value);
  if (Array.isArray(value)) return Promise.all(value.map(thawed));
  if (isPlain(value)) {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [key, inner] of Object.entries(/** @type {object} */ (value))) out[key] = await thawed(inner);
    return out;
  }
  return value;
}

/**
 * What a `!module` names: the mapped value as it is, or, for a specifier,
 * the module's default export -- what a function or a class is exported
 * as, from CommonJS and ES modules alike -- else its namespace.
 * @param {InstanceType<typeof ModuleRef>} ref
 * @returns {Promise<unknown>}
 */
async function target(ref) {
  const loaded = await ref.load();
  if (ref.specifier === undefined) return loaded;
  return loaded !== null && typeof loaded === 'object' && 'default' in loaded ? loaded.default : loaded;
}

/**
 * The synchronous copy `listenOptions()` makes: blocks and lists, nothing
 * resolved.
 * @param {unknown} value
 * @returns {unknown}
 */
function copy(value) {
  if (Array.isArray(value)) return value.map(copy);
  if (isPlain(value)) {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [key, inner] of Object.entries(/** @type {object} */ (value))) out[key] = copy(inner);
    return out;
  }
  return value;
}

/**
 * Whether `value` is a block: a plain or null-prototype object, not one
 * of cooper's values or anything the application mapped.
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlain(value) {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

module.exports = { serverOptions, listenOptions };
