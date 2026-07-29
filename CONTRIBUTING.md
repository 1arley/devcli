# Contributing to Dev CLI

Thank you for your interest in contributing! This document outlines the process.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies:

```bash
pnpm install
```

4. Build all packages:

```bash
pnpm build
```

5. Run tests:

```bash
pnpm test:run
```

## Development Workflow

### Branching

Never develop directly on `main`.

**Permanent branches:**
- `main` — stable, tagged releases
- `develop` — integration branch

**Temporary branches (from `develop`):**
- `feature/<name>` — new features
- `fix/<name>` — bug fixes
- `docs/<name>` — documentation
- `refactor/<name>` — refactoring
- `test/<name>` — test improvements
- `ci/<name>` — CI/CD changes
- `release/<version>` — release preparation
- `hotfix/<name>` — urgent production fixes

### Process

1. Create an Issue describing the change
2. Refine requirements and acceptance criteria
3. Create a branch from `develop`
4. Implement the change
5. Write tests (all new code must have tests)
6. Update documentation
7. Run `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm build` locally
8. Open a Pull Request targeting `develop`
9. Address review feedback
10. Squash merge after approval + green pipeline

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(doctor): add environment diagnostics
fix(jwt): handle malformed tokens
docs(readme): improve installation guide
refactor(core): simplify plugin loader
test(git): add repository status tests
ci(release): automate npm publication
```

Commits must be small, atomic, and focused on a single change.

### Pull Requests

Every PR must include:
- Objective
- Related Issue (e.g., `Closes #123`)
- List of changes
- Quality checklist (tests added, docs updated, lint, typecheck, build, coverage)
- Evidence (screenshots/GIFs for UI changes)
- Known risks
- Next steps

A PR will not be approved if:
- There is duplicated code
- Architecture is broken
- Tests are missing
- Documentation is outdated
- UX is degraded
- Performance regresses

## Code Style

- TypeScript strict mode
- No `any` without justification
- No `console.log` in production code (use `console.warn`/`console.error`)
- Prettier + ESLint enforce formatting
- No unreleased TODOs

## Testing

- Use Vitest
- Unit tests for all business logic
- Integration tests for command registration
- Snapshot tests where applicable
- Minimum 80% coverage threshold enforced

```bash
pnpm test:run          # Run all tests
pnpm test:coverage     # Run with coverage report
```

## Releasing

Releases are automated via CI/CD:
1. Changes merge to `main`
2. Semantic Release determines version bump
3. GitHub Release is created
4. Package is published to npm

No manual intervention required.
