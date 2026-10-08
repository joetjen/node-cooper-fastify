// Compiled, never run, by `npm run typecheck`: what a TypeScript
// application writes must type-check against `types/cooper-fastify.d.ts`.

import Fastify from 'fastify';
import cooper, { serverOptions, listenOptions, fileTag, version } from 'cooper-fastify';

const app = Fastify(await serverOptions({ modules: { 'App.RequestId': () => 'id' } }));
await app.register(cooper, { root: '.', dotenv: false });

const host: string = app.config.require<string>('db.host');
const port: number = app.config.get('db.port', 5432);
const present: boolean = app.config.has(['dotted.key', 'inner']);
const everything: Readonly<Record<string, any>> = app.config.all();

app.get('/', async (request) => request.server.config.get<string>('app.region'));

await app.listen(listenOptions());

const file: (argument: unknown) => string = fileTag('.');
const installed: string = version;

// @ts-expect-error -- an option cooper-config does not know
await app.register(cooper, { modulez: {} });

void [host, port, present, everything, file, installed];
