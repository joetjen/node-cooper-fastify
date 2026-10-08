# cooper-fastify cheatsheet

## Startup

```js
import Fastify from 'fastify';
import cooper, { serverOptions, listenOptions } from '@joetjen/cooper-fastify';

const app = Fastify(await serverOptions(options?));   // loads, once
await app.register(cooper);                           // fastify.config
await app.listen(listenOptions());
```

```sh
node --import @joetjen/cooper-fastify/register app.js     # or preload: ESM
node --require @joetjen/cooper-fastify/register app.js    # CJS
```

## When the configuration is loaded

| Call | Loads |
| --- | --- |
| `register(cooper, options)` / `serverOptions(options)` | with `options`, always |
| `register(cooper)` / `serverOptions()` | nothing if already loaded, else the defaults |
| `listenOptions()` | never |
| `@joetjen/cooper-fastify/register` | the defaults, before the application |

| | |
| --- | --- |
| options | cooper-config's: `path`, `root`, `env`, `dotenv*`, `resolvers`, `tags`, `importSchemes`, `modules`, `cache`, `watchEnv` |
| unknown option | `TypeError` |
| document does not load | `ready()` / `serverOptions()` rejects with `CooperConfigError`; preload exits 1 |
| no `config/config.casc` | empty configuration |

## Reading

```js
app.config.get(path, fallback?)    // value, or fallback
app.config.require(path)           // value, or CooperConfigError
app.config.has(path)               // true for a present null
app.config.all()                   // everything, deep-frozen
request.server.config              // the same, in a route
```

`path`: `'a.b.c'` or `['dotted.key', 'inner']`.

## The `fastify` block

```text
fastify {
  bodyLimit      = 1MiB                     # 1048576
  requestTimeout = 30s                      # 30000
  logger { level = "info" }
  genReqId = !module("App.RequestId")       # mapped in code
  https { key = !file("certs/server.key") } # the file's text
  listen { port = 8080, host = "0.0.0.0" }  # listenOptions() only
}
```

| | |
| --- | --- |
| keys | Fastify's own, camel case |
| `!module("Name")` | `modules[Name]`: a value as is, a specifier's default export |
| `!file("path")` | UTF-8 contents; relative to the project root, or absolute; `${...}` allowed |
| result | fresh, mutable; `{}` without a block |
