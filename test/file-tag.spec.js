import path from 'node:path';
import { expect } from 'chai';
import Fastify from 'fastify';
import * as cooperConfig from '@joetjen/cooper-config';
import cooper, { serverOptions, fileTag } from '../src/cooper-fastify.js';
import { project, cleanup, hermetic, HEADER } from './support/project.js';

/**
 * `!file("...")`: a file's contents, for the options that take a file's
 * contents rather than its path -- Fastify's `https` key and certificates
 * above all.
 */

describe('the !file tag', () => {
  /** @type {import('fastify').FastifyInstance | undefined} */
  let app;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    cleanup();
  });

  const PEM = '-----BEGIN PRIVATE KEY-----\nnot really\n-----END PRIVATE KEY-----\n';

  /**
   * The configuration the plugin loads from a project holding `document`
   * and `files`.
   * @param {string} document
   * @param {Record<string, string>} [files]
   * @param {object} [options]
   */
  async function configWith(document, files = {}, options = {}) {
    const root = project({ 'config/config.casc': HEADER + document, ...files });
    app = Fastify();
    await app.register(cooper, hermetic({ root, ...options }));
    await app.ready();
    return app.config;
  }

  it('reads a file relative to the project root', async () => {
    const config = await configWith('tls { key = !file("certs/server.key") }', { 'certs/server.key': PEM });
    expect(config.get('tls.key')).to.equal(PEM);
  });

  it('reads an absolute path as it is', async () => {
    const elsewhere = project({ 'server.key': PEM });
    const config = await configWith(`tls { key = !file("${path.join(elsewhere, 'server.key')}") }`);
    expect(config.get('tls.key')).to.equal(PEM);
  });

  it('reads the path an environment variable names', async () => {
    const config = await configWith('tls { key = !file("${TLS_KEY}") }', { 'certs/server.key': PEM }, {
      env: { COOPER_ENV: 'test', TLS_KEY: 'certs/server.key' },
    });
    expect(config.get('tls.key')).to.equal(PEM);
  });

  it('keeps a secret file a secret until the block reveals it', async () => {
    const config = await configWith('tls { cooper-secrets = keep\n *key = !file("certs/server.key") }', {
      'certs/server.key': PEM,
    });
    expect(String(config.get('tls.key'))).to.not.contain('not really');
  });

  it('fails the load naming the file when it is not there', async () => {
    const root = project({ 'config/config.casc': HEADER + 'tls { key = !file("certs/missing.key") }' });
    app = Fastify();
    app.register(cooper, hermetic({ root }));
    let failure;
    try {
      await app.ready();
    } catch (err) {
      failure = err;
    }
    expect(failure).to.be.an.instanceOf(cooperConfig.CooperConfigError);
    expect(/** @type {Error} */ (failure).message).to.contain(path.join('certs', 'missing.key'));
  });

  it('refuses an argument that is not a string', async () => {
    const root = project({ 'config/config.casc': HEADER + 'tls { key = !file(42) }' });
    app = Fastify();
    app.register(cooper, hermetic({ root }));
    let failure;
    try {
      await app.ready();
    } catch (err) {
      failure = err;
    }
    expect(/** @type {Error} */ (failure).message).to.contain('!file');
  });

  it('gives way to a file tag the application registers itself', async () => {
    const config = await configWith('tls { key = !file("anything") }', {}, { tags: { file: () => 'the application\'s' } });
    expect(config.get('tls.key')).to.equal('the application\'s');
  });

  it('sits beside the application\'s other tags, given as an object or as a Map', async () => {
    const shout = (/** @type {string} */ value) => value.toUpperCase();
    const document = 'a { key = !file("k"), loud = !shout("x") }';
    const asObject = await configWith(document, { k: 'key' }, { tags: { shout } });
    expect([asObject.get('a.key'), asObject.get('a.loud')]).to.deep.equal(['key', 'X']);
    await app?.close();
    const asMap = await configWith(document, { k: 'key' }, { tags: new Map([['shout', shout]]) });
    expect([asMap.get('a.key'), asMap.get('a.loud')]).to.deep.equal(['key', 'X']);
  });

  it('is there for serverOptions() too', async () => {
    const root = project({ 'config/config.casc': HEADER + 'fastify { https { key = !file("certs/server.key") } }', 'certs/server.key': PEM });
    const options = await serverOptions(hermetic({ root }));
    expect(options.https).to.deep.equal({ key: PEM });
  });

  it('is exported, for an application that loads with cooper-config itself', () => {
    const root = project({ 'k.pem': PEM });
    expect(fileTag(root)('k.pem')).to.equal(PEM);
  });
});
