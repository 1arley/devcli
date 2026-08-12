# Roadmap

## v1.0.0 — MVP (Current)

- [x] Monorepo scaffold (pnpm + TypeScript)
- [x] Plugin architecture with auto-discovery
- [x] Ink-powered interactive discovery TUI
- [x] `dev doctor` — environment diagnostics
- [x] `dev ports` — port listing and process killing
- [x] `dev docker` — containers, images, volumes, networks, disk usage
- [x] `dev git` — branch status, ahead/behind, stash, log
- [x] `dev jwt` — decode, encode, validate
- [x] `dev json` — format, minify, validate, YAML conversion
- [x] `dev uuid` — UUID v4, v7, NanoID, ULID
- [x] `dev qr` — QR code generation
- [x] `dev env` — .env / .env.example comparison
- [x] `dev repo` — project analysis (framework, language, architecture)
- [x] `dev ai` — error explanation (local + AI-powered)
- [x] CI/CD pipeline (lint, typecheck, test, build, release)
- [ ] npm publish automation
- [ ] Documentation website

## v1.1.0

- [x] `dev ssh` — SSH connection manager
- [x] `dev logs` — aggregated log viewer
- [x] `dev repo` — deeper analysis (dependency tree, bundle size)
- [x] Plugin auto-discovery from npm (`dev plugin add @scope/plugin`)
- [x] `dev chat` — AI coding agent REPL (streaming, tools, permissions, sessions)

## v1.2.0

- [ ] `dev kubernetes` — pod, service, deployment inspection
- [ ] `dev redis` — Redis CLI wrapper
- [ ] `dev postgres` — PostgreSQL inspection

## v1.3.0

- [ ] `dev next` — Next.js project utilities
- [ ] `dev react` — React component scaffolding
- [ ] `dev nestjs` — NestJS utilities
- [ ] `dev prisma` — Prisma schema tools

## v2.0.0

- [ ] Cloud provider integrations (Vercel, Railway, Cloudflare, AWS)
- [ ] GitHub integration (`dev gh`)
- [ ] Docker Swarm support
- [ ] Plugin marketplace
- [ ] Theme system

## Chat Enhancements (Future)

- [ ] Multi-agent orchestration (spawn subagents)
- [ ] Diff-aware file context (only send changed lines)
- [ ] Web UI companion for session history
- [ ] Custom tool plugins (register tools via plugin system)
- [ ] Voice input/output (Whisper + TTS)
- [ ] MCP (Model Context Protocol) server compatibility
- [ ] Reasoning blocks display (o1/o3, deepseek-reasoner)
