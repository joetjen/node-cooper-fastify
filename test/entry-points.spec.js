import { createRequire } from 'node:module';
import { expect } from 'chai';
import * as esm from '../src/cooper-fastify.js';
import esmDefault from '../src/cooper-fastify.js';

const require = createRequire(import.meta.url);
const cjs = require('../src/cooper-fastify.cjs');
const pkg = require('../package.json');

/**
 * The ESM entry is a thin wrapper over the CJS implementation; both must
 * expose the same objects, so one process-wide store backs both.
 *
 * The CJS module *is* the plugin, as Fastify's plugins are, with the rest
 * of the API on it -- and on `default` and `cooperFastify`, the names a
 * transpiled `import cooper from` and a named import look for.
 */

describe('public API: entry points', () => {
  const NAMES = ['serverOptions', 'listenOptions', 'fileTag', 'version'];

  it('the CommonJS module is the plugin, under its default and named exports too', () => {
    expect(cjs).to.be.a('function');
    expect(cjs.default).to.equal(cjs);
    expect(cjs.cooperFastify).to.equal(cjs);
  });

  it('the ESM default export is the same plugin', () => {
    expect(esmDefault).to.equal(cjs);
    expect(esm.cooperFastify).to.equal(cjs);
  });

  it('the ESM named exports and the CommonJS module expose the same objects', () => {
    for (const name of NAMES) {
      expect(/** @type {any} */ (esm)[name], `esm ${name}`).to.exist;
      expect(/** @type {any} */ (esm)[name], `esm ${name} === cjs`).to.equal(cjs[name]);
    }
  });

  it('exports nothing else', () => {
    expect(Object.keys(esm).sort()).to.deep.equal([...NAMES, 'cooperFastify', 'default'].sort());
  });

  it('version is the one in package.json', () => {
    expect(esm.version).to.equal(pkg.version);
  });
});
