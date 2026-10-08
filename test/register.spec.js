import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { expect } from 'chai';
import { project, cleanup, HEADER, PACKAGE_ROOT } from './support/project.js';

/**
 * The preload entry, and the plugin in a process where nothing was loaded
 * before it: both need a fresh `node`, since the store is process-wide.
 */

describe('in a fresh process', () => {
  afterEach(cleanup);

  /**
   * Runs `script` as an ES module in `root`, with `args` before it.
   * @param {string} root
   * @param {string} script
   * @param {string[]} [args]
   */
  function run(root, script, args = []) {
    return spawnSync(process.execPath, [...args, path.join(root, script)], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, COOPER_ENV: 'test' },
    });
  }

  /** A project whose app.mjs prints what the plugin loaded. */
  function app() {
    const plugin = path.join(PACKAGE_ROOT, 'src', 'cooper-fastify.js');
    const fastify = path.join(PACKAGE_ROOT, 'node_modules', 'fastify', 'fastify.js');
    return project({
      'package.json': '{}',
      'config/config.casc': HEADER + 'app { region = "eu-west", key = !file("certs/k.pem") }',
      'certs/k.pem': 'KEY',
      'app.mjs':
        `import Fastify from ${JSON.stringify(fastify)};\n` +
        `import cooper from ${JSON.stringify(plugin)};\n` +
        'const app = Fastify();\n' +
        'await app.register(cooper);\n' +
        'await app.ready();\n' +
        "console.log(JSON.stringify([app.config.get('app.region'), app.config.get('app.key')]));\n" +
        'await app.close();\n',
    });
  }

  it('the plugin with no options loads config/config.casc from the project root', () => {
    const root = app();
    const result = run(root, 'app.mjs');
    expect(result.stderr).to.equal('');
    expect(JSON.parse(result.stdout)).to.deep.equal(['eu-west', 'KEY']);
  });

  it('--import cooper-fastify/register loads it before the application, !file included', () => {
    const root = app();
    const result = run(root, 'app.mjs', ['--import', path.join(PACKAGE_ROOT, 'src', 'register.js')]);
    expect(result.stderr).to.equal('');
    expect(JSON.parse(result.stdout)).to.deep.equal(['eu-west', 'KEY']);
  });

  it('--require cooper-fastify/register does the same for CommonJS', () => {
    const root = app();
    const result = run(root, 'app.mjs', ['--require', path.join(PACKAGE_ROOT, 'src', 'register.cjs')]);
    expect(result.stderr).to.equal('');
    expect(JSON.parse(result.stdout)).to.deep.equal(['eu-west', 'KEY']);
  });

  it('a document that does not load stops the preload with its message and exit code 1', () => {
    const root = project({ 'package.json': '{}', 'config/config.casc': HEADER + 'app { region = }', 'app.mjs': 'console.log("ran")\n' });
    const result = run(root, 'app.mjs', ['--import', path.join(PACKAGE_ROOT, 'src', 'register.js')]);
    expect(result.status).to.equal(1);
    expect(result.stdout).to.equal('');
    expect(result.stderr).to.match(/^cooper-fastify: failed to load CASC configuration/);
  });
});
