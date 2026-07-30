# Dev CLI — Agent Guide

## Version Strategy

- **Patch** (`1.0.x`): auto-incremented by release workflow on every push to `main`. Never bump manually.
- **Minor** (`1.x.0`): bump manually when adding backward-compatible feature. Agent decides based on scope.
- **Major** (`x.0.0`): bump manually for breaking changes.

Bump version in `packages/cli/package.json`. Never bump elsewhere.

## Commands (run in order)

```
pnpm install --frozen-lockfile
pnpm --filter @devcli/config --filter @devcli/ui --filter @devcli/core run build  # deps for typecheck
pnpm lint
pnpm typecheck
pnpm build
pnpm test:run
```

Pre-commit hook runs lint-staged (eslint + prettier). If it fails on `apps/` files, stage only your files.

## Architecture

- Monorepo (pnpm workspaces): `packages/*`, `packages/plugins/*`, `apps/*`
- Published package: `packages/cli/` (`@1arley/devcli`)
- Bundler: tsup (esbuild), `dts: true` for libs, `dts: false` for cli (bundles all)
- tsup bundles all `@devcli/*` deps into cli via `noExternal`
- Typecheck: `tsc --noEmit` per package. Needs `dist/` from workspace deps — build those first.

## Key Configs

- Root `tsconfig.json` has project references to all packages (for `tsc -b`)
- `packages/core/tsconfig.json`: path mappings for `@devcli/config`, `@devcli/ui` (src)
- `packages/cli/tsconfig.json`: path mappings for all `@devcli/plugin-*` (src)
- Plugin tsconfigs extend root `tsconfig.base.json` directly
- Vitest aliases `@devcli/core`/`config` to `src/`, `@devcli/ui` to test stub

## CI/CD

- `ci.yml`: quality (build base → lint → typecheck), test (build → test), build (all)
- `release.yml`: on push to main → build → test → auto-bump patch → publish → tag → release
- Release only creates GitHub Release for `feat:` / `fix:` commits
- npm token: set `NPM_TOKEN` secret in GitHub, passed as `NODE_AUTH_TOKEN`
