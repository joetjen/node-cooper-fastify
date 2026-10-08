import path from 'node:path';
import { expect } from 'chai';
import Fastify from 'fastify';
import * as cooperConfig from '@joetjen/cooper-config';
import cooper, { serverOptions, listenOptions } from '../src/cooper-fastify.js';
import { project, cleanup, hermetic, HEADER } from './support/project.js';

/**
 * `serverOptions()` and `listenOptions()`: the `fastify` block, as the
 * `Fastify()` factory and `listen()` take it.
 */

describe('serverOptions()', () => {
  /** @type {import('fastify').FastifyInstance | undefined} */
  let app;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    cleanup();
  });

  /**
   * @param {string} document
   * @param {Record<string, string>} [files]
   */
  function rootWith(document, files = {}) {
    return project({ 'config/config.casc': HEADER + document, ...files });
  }

  it('is the fastify block, in the units Fastify takes', async () => {
    const root = rootWith(`
      fastify {
        bodyLimit = 1MiB
        requestTimeout = 30s
        trustProxy = true
        logger { level = "warn" }
      }
    `);
    const options = await serverOptions(hermetic({ root }));
    expect(options).to.deep.equal({ bodyLimit: 1048576, requestTimeout: 30000, trustProxy: true, logger: { level: 'warn' } });
  });

  it('is a fresh object Fastify may change, not the frozen configuration', async () => {
    const root = rootWith('fastify { logger { level = "warn" } }');
    const options = await serverOptions(hermetic({ root }));
    expect(Object.isFrozen(options)).to.equal(false);
    expect(Object.isFrozen(options.logger)).to.equal(false);
    expect(Object.getPrototypeOf(options)).to.equal(Object.prototype);
  });

  it('is accepted by Fastify', async () => {
    const root = rootWith('fastify { bodyLimit = 10B }');
    app = Fastify(await serverOptions(hermetic({ root })));
    app.post('/', async () => 'ok');
    const response = await app.inject({ method: 'POST', url: '/', payload: { far: 'too long for ten bytes' } });
    expect(response.statusCode).to.equal(413);
  });

  it('leaves out the listen block, which listenOptions() answers', async () => {
    const root = rootWith('fastify { bodyLimit = 1KiB, listen { port = 8080, host = "0.0.0.0" } }');
    expect(await serverOptions(hermetic({ root }))).to.deep.equal({ bodyLimit: 1024 });
    expect(listenOptions()).to.deep.equal({ port: 8080, host: '0.0.0.0' });
  });

  it('is empty, as listenOptions() is, when there is no fastify block', async () => {
    const root = rootWith('app { region = "eu-west" }');
    expect(await serverOptions(hermetic({ root }))).to.deep.equal({});
    expect(listenOptions()).to.deep.equal({});
  });

  it('is what the plugin registered afterwards without options reads', async () => {
    const root = rootWith('fastify { bodyLimit = 1KiB }\napp { region = "eu-west" }');
    app = Fastify(await serverOptions(hermetic({ root })));
    await app.register(cooper);
    await app.ready();
    expect(app.config.get('app.region')).to.equal('eu-west');
    expect(app.config.get('fastify.bodyLimit')).to.equal(1024);
  });

  it('rejects with cooper-config\'s error when the document does not load', async () => {
    const root = rootWith('fastify { bodyLimit = }');
    let failure;
    try {
      await serverOptions(hermetic({ root }));
    } catch (err) {
      failure = err;
    }
    expect(failure).to.be.an.instanceOf(cooperConfig.CooperConfigError);
  });

  describe('a !module value', () => {
    it('is the value the application mapped the name to', async () => {
      const genReqId = () => 'request-1';
      const root = rootWith('fastify { genReqId = !module("App.RequestId") }');
      const options = await serverOptions(hermetic({ root, modules: { 'App.RequestId': genReqId } }));
      expect(options.genReqId).to.equal(genReqId);
    });

    it('is the default export of a module the application mapped by path', async () => {
      const root = rootWith('fastify { genReqId = !module("App.RequestId") }', {
        'lib/request-id.cjs': "module.exports = () => 'from-a-file';\n",
      });
      const specifier = path.join(root, 'lib', 'request-id.cjs');
      const options = await serverOptions(hermetic({ root, modules: { 'App.RequestId': specifier } }));
      expect(options.genReqId()).to.equal('from-a-file');
    });

    it('is resolved wherever it is in the block', async () => {
      const stream = { write() {} };
      const root = rootWith('fastify { logger { level = "warn", stream = !module("App.LogStream") } }');
      const options = await serverOptions(hermetic({ root, modules: { 'App.LogStream': stream } }));
      expect(options.logger.stream).to.equal(stream);
    });

    it('reaches Fastify as the function it names', async () => {
      const root = rootWith('fastify { genReqId = !module("App.RequestId") }');
      app = Fastify(await serverOptions(hermetic({ root, modules: { 'App.RequestId': () => 'request-1' } })));
      app.get('/', async (request) => ({ id: request.id }));
      const response = await app.inject({ method: 'GET', url: '/' });
      expect(response.json()).to.deep.equal({ id: 'request-1' });
    });
  });
});

describe('listenOptions()', () => {
  afterEach(cleanup);

  it('is a fresh object listen() may change', () => {
    const root = project({ 'config/config.casc': HEADER + 'fastify { listen { port = 8080 } }' });
    cooperConfig.load(hermetic({ root }));
    const options = listenOptions();
    expect(Object.isFrozen(options)).to.equal(false);
    expect(options).to.deep.equal({ port: 8080 });
  });
});
