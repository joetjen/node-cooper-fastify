// Types for TypeScript applications. The implementation is JavaScript,
// checked by `tsc --checkJs`; these say what it gives a TypeScript caller,
// above all that `fastify.config` exists once the plugin is registered.

import type { FastifyListenOptions, FastifyPluginAsync } from 'fastify';

/** A path into the configuration: `'db.pool.size'`, or segments for a key holding a dot. */
export type KeyPath = string | readonly string[];

/** What `fastify.config` is: cooper-config's readers. */
export interface ConfigReader {
  /** The value at `path`, or `fallback` when there is none. */
  get<T = any>(path: KeyPath, fallback?: T): T;
  /** The value at `path`, which must be there. */
  require<T = any>(path: KeyPath): T;
  /** Whether anything, `null` included, is at `path`. */
  has(path: KeyPath): boolean;
  /** The whole configuration, deep-frozen. */
  all(): Readonly<Record<string, any>>;
}

/** cooper-config's load options. */
export interface CooperFastifyOptions {
  /** The CASC file; a relative one against the project root (default `config/config.casc`). */
  path?: string;
  /** The project root (default: the directory of the nearest `package.json`). */
  root?: string;
  env?: Record<string, string>;
  dotenv?: boolean;
  dotenvEnv?: string | null;
  dotenvFiles?: string[];
  dotenvDir?: string;
  dotenvOverride?: boolean;
  resolvers?: Record<string, (...args: any[]) => unknown> | Map<string, (...args: any[]) => unknown>;
  tags?: Record<string, (argument: any) => unknown> | Map<string, (argument: any) => unknown>;
  importSchemes?: Record<string, (...args: any[]) => unknown>;
  /** What each `!module("Name")` means: a value, or a specifier whose default export is used. */
  modules?: Record<string, unknown> | Map<string, unknown>;
  cache?: boolean;
  watchEnv?: boolean;
}

declare module 'fastify' {
  interface FastifyInstance {
    /** The application's configuration, loaded by cooper-fastify. */
    config: ConfigReader;
  }
}

/** The plugin. Registering it loads the configuration and decorates the instance with `config`. */
declare const cooperFastify: FastifyPluginAsync<CooperFastifyOptions>;

/** The `fastify` block, without `listen`, for the `Fastify()` factory; loads the configuration. */
export function serverOptions(options?: CooperFastifyOptions): Promise<Record<string, any>>;

/** The `fastify.listen` block, for `listen()`. */
export function listenOptions(): FastifyListenOptions;

/** The `!file` tag for a project rooted at `root`. */
export function fileTag(root: string): (argument: unknown) => string;

/** The installed package version. */
export const version: string;

export { cooperFastify };
export default cooperFastify;
