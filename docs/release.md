# Release Process

## Triggers

Every push to `main` triggers the **Release** workflow (`.github/workflows/release.yml`).

## What Happens

1. **Build** all packages (pnpm topo order)
2. **Test** — `pnpm test:run`
3. **Auto-bump patch** — reads `packages/cli/package.json`, increments `1.0.x → 1.0.x+1`, commits `[skip ci]`
4. **Publish** — `node scripts/publish.mjs` → strips workspace deps → `npm publish --access public`
5. **Git tag** — creates `v1.0.x` tag and pushes
6. **GitHub Release** — only for `feat:` / `fix:` commits. Auto-generates release notes.

## Version Bumps

| Type | Who | How |
|------|-----|-----|
| Patch | CI | Auto on every main push |
| Minor | Agent | Manual in `packages/cli/package.json` for new features |
| Major | Agent | Manual for breaking changes |

Never bump `version` anywhere other than `packages/cli/package.json`.

## npm Auth

- Secret: `NPM_TOKEN` in GitHub repo settings
- Env: passed as `NODE_AUTH_TOKEN` (actions/setup-node convention)

## Troubleshooting

**403 "cannot publish over previous version"** — version already exists. Auto-bump failed or manual bump skipped. Bump patch manually and push.

**404 "Not Found"** — npm auth missing. Check `NPM_TOKEN` secret.
