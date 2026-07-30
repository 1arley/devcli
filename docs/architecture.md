# Architecture

## Monorepo Layout

```
devcli/
├── apps/website/          # Next.js docs site (not published)
├── packages/
│   ├── config/            # @devcli/config — config loading
│   ├── core/              # @devcli/core — plugin system, registry, types
│   ├── ui/                # @devcli/ui — Ink-based UI components
│   ├── cli/               # @1arley/devcli — published CLI (bundles all)
│   └── plugins/           # 11 plugins, each is @devcli/plugin-*
├── tests/                 # Vitest tests (flat, one per package)
└── scripts/publish.mjs    # Strips workspace deps, publishes to npm
```

## Bundling

- **tsup** with esbuild for all packages
- Base packages (`config`, `core`, `ui`, `plugins/*`): `dts: true` — emit `.d.ts` + ESM
- **CLI** (`packages/cli`): `dts: false`, `noExternal: ['@devcli/*']` — bundles all internal deps into single ESM file
- CLI bundles react, ink, commander as externals (expected at runtime)

## TypeScript Config Chain

```
tsconfig.base.json           # strict, ESNext, bundler resolution
├── tsconfig.json             # root — project references only
├── packages/config/          # extends base directly
├── packages/ui/              # extends base, adds jsx + DOM
├── packages/core/            # extends base, path-maps config + ui to src/
├── packages/cli/             # extends base, path-maps all plugin-* to src/
└── packages/plugins/*/       # extends base directly
```

## Resolution Strategy

- **Build (tsup)**: resolves `@devcli/*` via pnpm workspace symlinks → `package.json` → `dist/`
- **Typecheck (`tsc --noEmit`)**: needs `dist/` from upstream deps. Build `config`/`ui`/`core` first.
- **CLI typecheck**: path-maps each `@devcli/plugin-*` to `plugins/*/src` — works without plugin `dist/`
- **Tests (vitest)**: aliases `@devcli/core`/`config` → `src/`, `@devcli/ui` → test stub

## Dependencies Graph

```
config, ui               # leaf packages
    └── core             # depends on config + ui
        └── plugins      # each depends on core + ui
            └── cli      # depends on core + config + ui + all plugins
```
