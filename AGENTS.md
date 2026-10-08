# AGENTS.md

Instructions for AI agents working in this Node.js codebase.

`cooper-fastify` is a Fastify plugin that loads an application's CASC
configuration once, at startup, with
[`@joetjen/cooper-config`](https://github.com/joetjen/node-cooper-config) (`node-cooper-config`), and
puts it on `fastify.config`. It also hands the `fastify` block to the
`Fastify()` factory through `serverOptions()`. It is the Fastify
counterpart of the PHP framework adapters, `php-cooper-symfony` and
`php-cooper-laravel`.

## Communication

- Every response starts with the user's first name. Determine it from
  `git config user.name` (take the first name); if that's unavailable
  or ambiguous, ask once. Remember the answer for the rest of the
  session rather than re-deriving or re-asking.

## Before every commit

- Run `npm run precommit` (type-check via `tsc --checkJs --noEmit` and
  the declarations through `test/types`, then the full test suite) and
  make sure it passes. No exceptions.

## Design rules that are not up for convenience

- **Eager only.** The configuration is loaded once, at startup. Never
  add lazy loading on first access, reloading, or file watching. A
  configuration error must stop the server before it does any work.
- **No loading or reading of its own.** Finding the file, converting
  values and the secrets policy are `cooper-config`'s; parsing is
  `cooper`'s. This package decides only *when* the load happens and how
  Fastify sees the result.
- **One load rule** (`src/load.cjs`), shared by the plugin,
  `serverOptions()` and the preload entry: options given, load with
  them; none, read what is loaded; none and nothing loaded, load the
  defaults.
- **A document never names code.** `!module` resolves only through the
  application's `modules` mapping. `!file` may take its path from the
  environment because reading a file runs nothing; nothing here may
  ever `import` or `require` a path a document chose.

## Language: plain JS + JSDoc, not TypeScript

- Source is plain `.cjs`/`.js`. No `.ts` files in `src/` and no build
  step. Type safety comes from JSDoc annotations checked by
  `tsc --checkJs --noEmit`.
- `types/cooper-fastify.d.ts` is what a TypeScript application sees,
  and `test/types/usage.ts` is compiled against it. Change both with the
  API.

## Tests

- Tests are written first: red, then implement, then green. Test names
  read as sentences.
- Tests must stay current with behavior. A change to what code does
  needs its tests updated in the same commit.
- Tests live in `test/` and run via Mocha/Chai against a real Fastify
  (`app.inject`). Every test loads from a throwaway project
  (`test/support/project.js`) with `dotenv: false` and an explicit
  `COOPER_ENV`, so the developer's own files and environment cannot
  leak in.
- The store is process-wide. Anything that needs a process where nothing
  has been loaded, or that tests the `register` entry, runs a real
  `node` child process.

## Documentation

- Every documentation surface touched by a change is part of that
  change: JSDoc, README, `guides/CHEATSHEET.md`, `CHANGELOG.md`, the
  declarations, and comments explaining non-obvious behavior.
- Every exported function needs a JSDoc block.
- Update `CHANGELOG.md` under `[Unreleased]` for every user-facing
  change, following [Keep a Changelog](https://keepachangelog.com/).

## Dual entry points (ESM/CJS parity)

- `src/*.cjs` is the real implementation. **This is the file to
  change.** `src/cooper-fastify.js` and `src/register.js` are thin ESM
  wrappers over it.
- The CommonJS module *is* the plugin, as Fastify's plugins are, with
  the rest of the API as properties, `default` and `cooperFastify`
  included. If you add or rename an export, update both entry points,
  the declarations and `test/entry-points.spec.js`.

## Dependency boundaries

- `@joetjen/cooper-config`, `@joetjen/cooper` and `fastify-plugin` are
  the runtime dependencies, from npm; `fastify` is a peer.

## Git workflow, commits, versioning

- [git flow](https://nvie.com/posts/a-successful-git-branching-model/):
  no direct commits to `main` or `develop`; work on `feature/*`,
  `release/*`, `hotfix/*` or `support/*`.
- [Conventional Commits](https://www.conventionalcommits.org/).
- [Semantic Versioning](https://semver.org/), bumped with
  `npm version <major|minor|patch>`.

## License

Apache-2.0. Never MIT.
