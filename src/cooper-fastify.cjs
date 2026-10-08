'use strict';

/**
 * @fileoverview The plugin: registering it loads the application's CASC
 * configuration, and `fastify.config` reads it.
 *
 * ```js
 * const app = Fastify(await serverOptions());
 * await app.register(cooper);
 * app.config.get('db.host');
 * ```
 *
 * **Fastify has no configuration system of its own**, so there is nothing
 * to feed and nothing to replace but `@fastify/env`, whose
 * `fastify.config` this takes the name of. The configuration itself is
 * `cooper-config`'s, loaded once and process-wide, so `fastify.config` and
 * a plain `require('cooper-config').get(...)` read the same thing.
 *
 * It is wrapped with `fastify-plugin`: a configuration belongs to the
 * whole application, not to the encapsulation context that happened to
 * register it.
 */

const fp = require('fastify-plugin');
const cooperConfig = require('cooper-config');
const { ensureLoaded } = require('./load.cjs');
const { serverOptions, listenOptions } = require('./server-options.cjs');
const { fileTag } = require('./file-tag.cjs');
const version = require('./version.cjs');

/**
 * What `fastify.config` is: cooper-config's four readers, frozen, so no
 * plugin can swap the configuration out from under the others.
 * @typedef {Readonly<{get: typeof cooperConfig.get, require: typeof cooperConfig.require, has: typeof cooperConfig.has, all: typeof cooperConfig.all}>} ConfigReader
 */

/** @type {ConfigReader} */
const reader = Object.freeze({
  get: cooperConfig.get,
  require: cooperConfig.require,
  has: cooperConfig.has,
  all: cooperConfig.all,
});

/**
 * Loads the configuration and decorates the instance with `config`.
 *
 * Its options are cooper-config's load options. Given none, it reads a
 * configuration already loaded -- by `serverOptions()`, the preload entry
 * or the application -- and loads the defaults only when there is none.
 * A document that does not load rejects, so `ready()` does and the server
 * never starts.
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Record<string, unknown>} options
 * @returns {Promise<void>}
 */
async function cooperFastify(fastify, options) {
  ensureLoaded(options);
  fastify.decorate('config', reader);
}

const plugin = fp(cooperFastify, { name: 'cooper-fastify', fastify: '5.x' });

// The CommonJS module is the plugin, as Fastify's plugins are, with the
// rest of the API on it. `default` and `cooperFastify` are the names a
// transpiled default import and a named import look for.
module.exports = plugin;
module.exports.default = plugin;
module.exports.cooperFastify = plugin;
module.exports.serverOptions = serverOptions;
module.exports.listenOptions = listenOptions;
module.exports.fileTag = fileTag;
module.exports.version = version;
