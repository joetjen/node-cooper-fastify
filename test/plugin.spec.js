import { expect } from 'chai';
import Fastify from 'fastify';
import * as cooperConfig from 'cooper-config';
import cooper from '../src/cooper-fastify.js';
import { project, cleanup, hermetic, HEADER } from './support/project.js';

/**
 * The plugin: registering it loads the project's configuration, and
 * `fastify.config` reads it.
 */

describe('the plugin', () => {
  /** @type {import('fastify').FastifyInstance | undefined} */
  let app;

  afterEach(async () => {
    await app?.close();
    app = undefined;
    cleanup();
  });

  /**
   * A Fastify app with the plugin registered against a project holding
   * `document` as its `config/config.casc`.
   * @param {string} document
   * @param {object} [options]
   */
  async function appWith(document, options = {}) {
    const root = project({ 'config/config.casc': HEADER + document });
    app = Fastify();
    await app.register(cooper, hermetic({ root, ...options }));
    await app.ready();
    return app;
  }

  it('loads the project configuration and puts it on fastify.config', async () => {
    const fastify = await appWith('app { region = "eu-west" }');
    expect(fastify.config.get('app.region')).to.equal('eu-west');
  });

  it('is what a route reads through request.server.config', async () => {
    const root = project({ 'config/config.casc': HEADER + 'app { region = "eu-west" }' });
    app = Fastify();
    await app.register(cooper, hermetic({ root }));
    app.get('/region', async (request) => ({ region: request.server.config.get('app.region') }));
    const response = await app.inject({ method: 'GET', url: '/region' });
    expect(response.json()).to.deep.equal({ region: 'eu-west' });
  });

  it('reads the way cooper-config does: get with a fallback, require, has and all', async () => {
    const fastify = await appWith('app { size = 1KiB, nothing = nil }');
    expect(fastify.config.get('app.size')).to.equal(1024);
    expect(fastify.config.get('app.missing', 'fallback')).to.equal('fallback');
    expect(fastify.config.require('app.size')).to.equal(1024);
    expect(() => fastify.config.require('app.missing')).to.throw(cooperConfig.CooperConfigError, 'app.missing');
    expect(fastify.config.has('app.nothing')).to.equal(true);
    expect(fastify.config.has('app.missing')).to.equal(false);
    expect(Object.isFrozen(fastify.config.all())).to.equal(true);
  });

  it('cannot have its reader replaced or changed', async () => {
    const fastify = await appWith('app { region = "eu-west" }');
    expect(Object.isFrozen(fastify.config)).to.equal(true);
  });

  it('decorates the instance that registers it, not a context of its own, and every plugin below sees it', async () => {
    const root = project({ 'config/config.casc': HEADER + 'app { region = "eu-west" }' });
    app = Fastify();
    await app.register(cooper, hermetic({ root }));
    /** @type {unknown} */
    let seen;
    await app.register(async (child) => {
      seen = child.config.get('app.region');
    });
    await app.ready();
    expect(app.config.get('app.region')).to.equal('eu-west');
    expect(seen).to.equal('eu-west');
  });

  it('stops ready() with cooper-config\'s error when the document does not load', async () => {
    const root = project({ 'config/config.casc': HEADER + 'app { region = }' });
    app = Fastify();
    app.register(cooper, hermetic({ root }));
    let failure;
    try {
      await app.ready();
    } catch (err) {
      failure = err;
    }
    expect(failure).to.be.an.instanceOf(cooperConfig.CooperConfigError);
    expect(/** @type {Error} */ (failure).message).to.contain('config.casc');
  });

  it('refuses an option neither it nor cooper-config knows', async () => {
    const root = project({ 'config/config.casc': HEADER + 'app {}' });
    app = Fastify();
    app.register(cooper, hermetic({ root, modulez: {} }));
    let failure;
    try {
      await app.ready();
    } catch (err) {
      failure = err;
    }
    expect(failure).to.be.an.instanceOf(TypeError);
    expect(/** @type {Error} */ (failure).message).to.contain('modulez');
  });

  it('leaves Fastify\'s own register options to Fastify', async () => {
    const fastify = await appWith('app { region = "eu-west" }', { prefix: '/api', logLevel: 'warn' });
    expect(fastify.config.get('app.region')).to.equal('eu-west');
  });

  it('given no options, reads a configuration already loaded instead of loading again', async () => {
    const root = project({ 'config/config.casc': HEADER + 'app { region = "loaded before" }' });
    cooperConfig.load(hermetic({ root }));
    app = Fastify();
    await app.register(cooper);
    await app.ready();
    expect(app.config.get('app.region')).to.equal('loaded before');
  });

  it('given options, loads with them even when a configuration is already loaded', async () => {
    const before = project({ 'config/config.casc': HEADER + 'app { region = "before" }' });
    cooperConfig.load(hermetic({ root: before }));
    const fastify = await appWith('app { region = "after" }');
    expect(fastify.config.get('app.region')).to.equal('after');
  });
});
