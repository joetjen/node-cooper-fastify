'use strict';

/**
 * @fileoverview The preload entry: `node --import @joetjen/cooper-fastify/register`
 * (or `--require`) loads the configuration with its defaults before the
 * application's own code, `!file` included -- which is why it is not
 * `@joetjen/cooper-config/register`, whose load does not know the tag.
 *
 * A configuration that fails to load stops the process here, with the
 * error's message and exit code 1 rather than a stack trace: the trace
 * would point into this library, and what needs fixing is the document.
 */

const { CooperConfigError } = require('@joetjen/cooper-config');
const { ensureLoaded } = require('./load.cjs');

try {
  ensureLoaded();
} catch (err) {
  if (!(err instanceof CooperConfigError)) throw err;
  process.stderr.write(`cooper-fastify: ${err.message}\n`);
  process.exit(1);
}
