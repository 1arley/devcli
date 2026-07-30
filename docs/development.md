# Development

## Setup

```bash
pnpm install
```

## Commands (run in order for verification)

```bash
pnpm --filter @devcli/config --filter @devcli/ui --filter @devcli/core run build  # deps first
pnpm lint
pnpm typecheck
pnpm build
pnpm test:run
```

## Key Scripts

| Command | Description |
|---------|-------------|
| `pnpm lint` | eslint --max-warnings=0 |
| `pnpm typecheck` | tsc --noEmit per package (needs dist/ from deps) |
| `pnpm build` | tsup all packages |
| `pnpm test:run` | vitest run |
| `pnpm test:coverage` | vitest run --coverage (80% threshold) |
| `pnpm clean` | rm -rf dist in all packages |

## Pre-commit Hooks

Husky runs lint-staged on staged files:
- `*.{ts,tsx,js,jsx}` → eslint --fix + prettier --write
- `*.{json,md,yml,yaml}` → prettier --write

If hook fails on `apps/` files, stage only your changed files.

## Adding a Plugin

1. Create `packages/plugins/<name>/` with `package.json` (name: `@devcli/plugin-<name>`), `tsconfig.json` (extends `../../../tsconfig.base.json`), `tsup.config.ts` (`dts: true`), `src/index.ts`
2. Add dependency in `packages/cli/package.json` (`"@devcli/plugin-<name>": "workspace:*"`)
3. Add path mapping in `packages/cli/tsconfig.json` (`"@devcli/plugin-<name>": ["../plugins/<name>/src"]`)
4. Add to `noExternal` in `packages/cli/tsup.config.ts`
5. Register plugin in `packages/cli/src/registry.ts`
6. Add test file `tests/plugin-<name>.test.ts`

## Testing

- Vitest with `globals: true`
- Tests at `tests/*.test.ts` (flat, one per package)
- `@devcli/ui` aliased to test stub (`tests/ui-stub.ts`)
- Coverage threshold: 80% lines/functions/branches/statements
