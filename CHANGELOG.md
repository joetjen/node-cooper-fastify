# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project scaffold mirroring `node-cooper-config`: `package.json`
  (Node.js 20+, `fastify` 5 as a peer dependency, `cooper-config`,
  `cooper` and `fastify-plugin` as runtime dependencies), the dual
  CJS/ESM entry-point convention, Mocha/Chai tests, `tsc --checkJs`
  type-checking, TypeDoc API docs, GitHub Actions for CI, docs and a
  monthly dependency audit, and the Apache License 2.0.
- The plugin, wrapped with `fastify-plugin`: registering it loads the
  configuration with `cooper-config` and decorates the instance with
  `config` -- `get`, `require`, `has` and `all`, frozen. Given options,
  it loads with them; given none, it reads a configuration already
  loaded, and loads the defaults only when there is none. A document
  that does not load rejects `ready()`. Fastify's own register options
  (`prefix`, `logLevel`, `logSerializers`) are left to Fastify, and any
  other unknown option is a `TypeError`.
- `serverOptions(options?)`: the `fastify` block, without `listen`, as a
  fresh mutable object for the `Fastify()` factory. Every `!module` in
  it becomes what the application mapped the name to -- the value, or
  the default export of a mapped specifier.
- `listenOptions()`: the `fastify.listen` block, for `listen()`.
- The `!file("path")` tag, registered on every load: a file's contents
  as UTF-8 text, relative to the project root or absolute, for Fastify's
  `https` options above all. An application's own `file` tag replaces
  it. Exported as `fileTag(root)`.
- `cooper-fastify/register`, a preload entry for `--import`/`--require`
  that loads with the defaults, `!file` included, and exits with code 1
  and the error's message on failure.
- TypeScript declarations: `fastify.config` is typed on
  `FastifyInstance`, and the options are checked.
