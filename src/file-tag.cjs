'use strict';

/**
 * @fileoverview `!file("...")`: a file's contents as a configuration
 * value, and the project root a relative path is read from.
 *
 * **For the options that take contents rather than a path.** Fastify's
 * `https` key, certificate and CA are the reason this exists: they are
 * PEM text, and without the tag they could only be read in code, outside
 * the configuration that otherwise describes the server.
 *
 * **This tag is cooper-fastify's, not CASC's.** A document using it loads
 * only where it is registered. That is the same bargain the Laravel
 * adapter's path tags make, and it stays here until a second integration
 * needs it.
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * The project root: the directory of the nearest `package.json` found
 * walking up from `cwd`, else `cwd` itself.
 *
 * The same rule `cooper-config` finds `config/config.casc` by, so a
 * relative `!file` path and the document are read from one directory.
 * Repeated here because `cooper-config` does not export it.
 *
 * @param {string} [cwd] -- where to start (default `process.cwd()`)
 * @returns {string} an absolute path
 */
function projectRoot(cwd = process.cwd()) {
  const start = path.resolve(cwd);
  for (let dir = start; ; dir = path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    if (path.dirname(dir) === dir) return start;
  }
}

/**
 * The `!file` tag for a project rooted at `root`: it reads the file its
 * argument names -- relative to `root`, or absolute -- as UTF-8 text.
 *
 * Text, not a `Buffer`, because what it is for is text: PEM keys and
 * certificates, which Fastify and `node:tls` take as strings.
 *
 * **The environment may choose the file** (`!file("${TLS_KEY}")`), which
 * `!module` deliberately does not allow for code: reading a file runs
 * nothing.
 *
 * @param {string} root -- the directory a relative path is read from
 * @returns {(argument: unknown) => string}
 * @example
 *   loadFileSync('config/config.casc', { tags: { file: fileTag(process.cwd()) } });
 */
function fileTag(root) {
  return function file(argument) {
    if (typeof argument !== 'string') {
      throw new TypeError(`!file takes a path as a string, not ${typeof argument === 'object' ? String(argument) : JSON.stringify(argument) ?? String(argument)}`);
    }
    const absolute = path.resolve(root, argument);
    try {
      return fs.readFileSync(absolute, 'utf8');
    } catch (err) {
      const code = /** @type {NodeJS.ErrnoException} */ (err).code ?? /** @type {Error} */ (err).message;
      throw new Error(`cannot read ${absolute} (${code})`);
    }
  };
}

module.exports = { fileTag, projectRoot };
