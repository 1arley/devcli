<div align="center">

# Dev CLI

**The Raycast of the Terminal for Developers**

A single command to solve hundreds of small daily developer pains.

</div>

---

## Introduction

Dev CLI centralizes dozens of developer utilities into a single executable. Instead of memorizing `lsof`, `docker`, `jq`, `gh`, `git`, `curl` — just run `dev` and find everything.

Run `dev` with no arguments to open a searchable, interactive interface (powered by Ink + React). Type to filter, press Enter to execute.

```bash
dev
```

## Installation

```bash
# npm
npm install -g @dev-cli/cli

# pnpm
pnpm add -g @dev-cli/cli

# yarn
yarn global add @dev-cli/cli
```

Requires Node.js 18+.

## Quick Start

```bash
# Diagnose your environment
dev doctor

# List listening ports
dev ports

# Kill a process on a port
dev ports kill 3000

# Inspect Docker containers
dev docker

# Decode a JWT token
dev jwt decode eyJhbGciOiJIUzI1NiIs...

# Format JSON from stdin
echo '{"b":2,"a":1}' | dev json format

# Generate UUIDs
dev uuid v4 -n 5
dev uuid nano --size 10
dev uuid ulid

# Generate a QR code
dev qr "https://github.com/1arley/devcli"

# Compare .env and .env.example
dev env

# Analyze a project
dev repo ./my-project

# Explain an error with AI
dev ai "TypeError: Cannot read properties of undefined"
```

## Commands

### `dev` (Discovery)

Opens an interactive, searchable interface listing all available commands. Arrow keys to navigate, type to filter, Enter to run, ESC to quit.

### `dev doctor`

Diagnoses your development environment — checks for Node, npm, pnpm, Git, Docker, Docker Compose, `.env` file, TypeScript config, and shows system info (memory, CPU, platform).

### `dev ports`

| Subcommand | Description |
|---|---|
| `dev ports` | List all listening ports with PID and process name |
| `dev ports kill <port>` | Kill the process listening on a port |
| `dev ports free` | Show a summary of ports in use |

### `dev docker`

| Subcommand | Description |
|---|---|
| `dev docker` | List all containers |
| `dev docker containers` | List all containers (detailed) |
| `dev docker images` | List Docker images |
| `dev docker volumes` | List Docker volumes |
| `dev docker networks` | List Docker networks |
| `dev docker disk` | Show Docker disk usage |
| `dev docker prune -f` | Remove unused Docker data |

### `dev git`

| Subcommand | Description |
|---|---|
| `dev git` | Show branch, ahead/behind, stash count, modified files |
| `dev git branches` | List all branches with tracking info |
| `dev git status` | Show working tree status |
| `dev git log [count]` | Show recent commits (default 10) |
| `dev git stash` | List stashes |

### `dev jwt`

| Subcommand | Description |
|---|---|
| `dev jwt decode <token>` | Decode a JWT token's header and payload |
| `dev jwt encode -p '<json>'` | Encode a JWT from JSON payload |
| `dev jwt validate <token>` | Validate structure and check expiration |

### `dev json`

| Subcommand | Description |
|---|---|
| `dev json format [file]` | Pretty-print JSON (file or stdin) |
| `dev json minify [file]` | Minify JSON (file or stdin) |
| `dev json validate [file]` | Validate JSON (file or stdin) |
| `dev json to-yaml [file]` | Convert JSON to YAML |
| `dev json from-yaml [file]` | Convert YAML to JSON |

### `dev uuid`

| Subcommand | Description |
|---|---|
| `dev uuid` | Generate a UUID v4 |
| `dev uuid v4 [-n count]` | Generate UUID v4 |
| `dev uuid v7 [-n count]` | Generate UUID v7 (time-ordered) |
| `dev uuid nano [-s size] [-n count]` | Generate NanoID |
| `dev uuid ulid [-n count]` | Generate ULID |

### `dev qr`

```bash
dev qr <text>           # Render QR code in terminal
dev qr <text> -o out.txt # Save QR code to file
```

### `dev env`

| Subcommand | Description |
|---|---|
| `dev env` | Compare .env and .env.example, show missing variables |
| `dev env missing` | Show variables missing from .env |
| `dev env diff` | Show diff between .env and .env.example |

### `dev repo [path]`

Analyzes a project directory and detects:
- Framework (Next.js, React, Vue, Express, NestJS, etc.)
- Language (TypeScript, JavaScript, Go, Rust, Python, etc.)
- Package manager (pnpm, yarn, npm, bun)
- Architecture (monorepo, src/, lib/, packages/)
- Dependency count
- Source file count

### `dev ai [input...]`

Explains errors, stack traces, and logs using AI. Works without configuration using pattern-matching heuristics. For AI-powered explanations, configure a provider in `.devclirc.json`:

```json
{
  "ai": {
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini"
  }
}
```

## Configuration

Create a `.devclirc.json` file in your home directory or project root:

```json
{
  "version": 1,
  "defaults": {
    "editor": "code",
    "shell": "bash",
    "theme": "default"
  },
  "ai": {
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o-mini"
  },
  "ports": {
    "ignore": [3000, 8080]
  }
}
```

## Architecture

Dev CLI is built as a pnpm monorepo with a plugin-based architecture inspired by Clean Architecture:

```
Interface → Commands → Services → Domain → Infrastructure → Utilities
```

- **`packages/core`** — Plugin contract, registry, and loader
- **`packages/config`** — Config schema (Zod) and loader
- **`packages/ui`** — Terminal UI components (Ink, Chalk, tables, spinners)
- **`packages/cli`** — Entry point, Commander setup, Ink discovery TUI
- **`packages/plugins/*`** — One package per command, each independently removable

### Plugin System

Every command is a plugin implementing the `Plugin` interface:

```typescript
interface Plugin {
  manifest: PluginManifest;
  register(program: Command): void;
}
```

Plugins are registered in `packages/cli/src/registry.ts` and auto-loaded at startup.

## Roadmap

See [ROADMAP.md](./ROADMAP.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## FAQ

**Q: Do I need Docker installed?**
A: No. Commands that require external tools gracefully report when they're unavailable.

**Q: Does `dev ai` send data to the cloud?**
A: Only if you configure an AI provider. Without configuration, it uses local pattern matching.

**Q: Can I use Dev CLI on Windows?**
A: Yes. All commands support both Unix and Windows (ports and docker use cross-platform detection).

## License

[MIT](./LICENSE)
