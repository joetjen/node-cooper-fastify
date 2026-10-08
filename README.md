# cooper-fastify

cooper-fastify is a [Fastify](https://fastify.dev) plugin that loads your
application's [CASC](https://github.com/joetjen/cooper/blob/main/guides/casc/CASC.md)
configuration once, at startup, and puts it on `fastify.config`. It also
gives the server's own options -- body limit, timeouts, logger, TLS --
to the `Fastify()` factory from the same document.

Fastify has no configuration system of its own. This plugin takes the
place of `@fastify/env` and of `dotenv`: `.env` files are read by
[`cooper`](https://github.com/joetjen/node-cooper) itself. The loading
and reading are [`cooper-config`](https://github.com/joetjen/node-cooper-config)'s,
so `fastify.config.get(...)` and `require('@joetjen/cooper-config').get(...)` read
the same configuration.

```text
# config/config.casc
#@version = 1.0

fastify {
  bodyLimit      = 1MiB
  requestTimeout = 30s
  trustProxy     = true
  logger { level = "info" }
  https {
    key  = !file("certs/server.key")
    cert = !file("certs/server.crt")
  }
  listen { port = 8443, host = "0.0.0.0" }
}

db {
  host      = "db.internal"
  *password = ${DB_PASSWORD}
}

import "${COOPER_ENV}/*.casc"
```

```js
import Fastify from 'fastify';
import cooper, { serverOptions, listenOptions } from '@joetjen/cooper-fastify';

const app = Fastify(await serverOptions());   // loads config/config.casc, once
await app.register(cooper);                   // fastify.config

app.get('/db', async (request) => ({ host: request.server.config.get('db.host') }));

await app.listen(listenOptions());
```

## Install

```sh
npm install @joetjen/cooper-fastify
```

`fastify` 5 is a peer dependency, so your own is used. `cooper-config`
and `cooper` come along. You need Node.js 20 or later. `require` works
the same way as `import`.

## The plugin

```js
await app.register(cooper, options?);
```

Registering it loads the configuration and decorates the instance with
`config`. The plugin is wrapped with `fastify-plugin`, so the
configuration lands on the instance that registers it, and every plugin
and route below sees it.

| | |
| --- | --- |
| options given | loads with them, cooper-config's load options (`path`, `root`, `env`, `dotenvDir`, `modules`, `tags`, ...) |
| no options, something loaded | reads that: by `serverOptions()`, the preload entry or `cooper-config` itself |
| no options, nothing loaded | loads `config/config.casc` under the project root |
| an unknown option | `TypeError` |
| the document does not load | `ready()` rejects with `CooperConfigError`; the server never starts |
| `prefix`, `logLevel`, `logSerializers` | Fastify's, left to Fastify |

The project root is the directory of the nearest `package.json` above
the working directory.

## Reading: `fastify.config`

```js
app.config.get('db.port', 5432);     // the value, or the fallback when there is none
app.config.require('db.host');       // the value, or a CooperConfigError naming the path
app.config.has('db.replica');        // whether anything, null included, is there
app.config.all();                    // the whole configuration
request.server.config.get('db.host') // the same, in a route
```

Paths are dotted (`'db.pool.size'`) or an array of segments for a key
holding a dot (`['dotted.key', 'inner']`). Every value is deep-frozen,
and so is `fastify.config`. Byte sizes arrive as bytes and durations as
milliseconds; the [`cooper-config` README](https://github.com/joetjen/node-cooper-config#conversion)
has the full table, and how each block's secrets arrive.

TypeScript knows `fastify.config` once the package is imported:

```ts
const host = app.config.require<string>('db.host');
```

## The server's options: `serverOptions()` and `listenOptions()`

Fastify takes its server options once, when `Fastify()` creates the
app, before any plugin runs. So the plugin cannot set them, and
`serverOptions()` reads them first:

```js
const app = Fastify(await serverOptions(options?));
await app.listen(listenOptions());
```

- `serverOptions()` loads the configuration by the plugin's rule and
  returns the `fastify` block without its `listen` block. The plugin
  registered afterwards without options reads the same load.
- `listenOptions()` returns the `fastify.listen` block. It loads
  nothing.
- Both return fresh, mutable objects, and an empty one when there is no
  block.
- The keys are Fastify's own, camel case included.

### Code: `!module`

Options that are functions or objects -- `genReqId`, a log `stream`, a
`loggerInstance`, `querystringParser` -- are named with CASC's `!module`
and mapped in code:

```text
fastify {
  genReqId = !module("App.RequestId")
}
```

```js
const app = Fastify(await serverOptions({
  modules: { 'App.RequestId': './lib/request-id.js' },   // its default export
  // or:  { 'App.RequestId': genReqId }                  // the value itself
}));
```

A document can only choose among the names the application mapped. It
can never name a file of code, not even through `${...}`. A `!module`
anywhere in the block is resolved. This is why `serverOptions()` is
asynchronous: a mapped path is imported.

### Files: `!file`

`!file("path")` is a file's contents, as UTF-8 text, for options that
take contents rather than a path -- `https.key`, `https.cert`,
`https.ca`:

```text
fastify {
  https {
    key  = !file("certs/server.key")     # relative to the project root
    cert = !file("${TLS_CERT}")          # or a path from the environment
  }
}
```

- An absolute path is read as it is.
- A file that is not there fails the load, naming it.
- `!file` works everywhere in the document, not only in `fastify`.
- A `file` tag of your own, passed in `tags`, replaces it.
- It is cooper-fastify's tag, not part of CASC: a document using it
  loads only where it is registered.
- An application loading with `cooper-config` directly can register it
  with `tags: { file: fileTag(root) }`.

## Startup without `serverOptions()`

When nothing reads the configuration before the plugin, registering it
is enough. To load it before any of your code runs, preload it:

```sh
node --import @joetjen/cooper-fastify/register app.js     # ES modules
node --require @joetjen/cooper-fastify/register app.js    # CommonJS
```

Use `@joetjen/cooper-fastify/register` rather than `@joetjen/cooper-config/register`,
because only this one registers `!file`. A document that does not load
stops the process with its message and exit code 1.

## Per-environment configuration

`${COOPER_ENV}` names the environment (`dev`, `test`, `prod`), falling
back to `NODE_ENV`, and `.env.<env>` is chosen by it. See the
[`cooper-config` README](https://github.com/joetjen/node-cooper-config#per-environment-configuration-cooper_env).

## Development

```sh
npm install
npm run precommit
```

`npm run precommit` type-checks the JSDoc (`tsc --checkJs --noEmit`)
and the TypeScript declarations, and runs the Mocha suite. See
[CONTRIBUTING.md](CONTRIBUTING.md) and the
[cheatsheet](guides/CHEATSHEET.md).

## License

Apache-2.0, see [LICENSE](LICENSE).
