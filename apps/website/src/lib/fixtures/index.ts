import type { PluginDemo } from './types'

export const pluginDemos: PluginDemo[] = [
  {
    plugin: 'doctor',
    category: 'dev',
    description: 'Environment diagnostics',
    fixtures: [
      {
        id: 'doctor-healthy',
        title: 'Healthy environment',
        command: 'dev doctor',
        description: 'All tools installed and configured',
        output: `┌─────────────────────────────────────────┐
│  DevCLI Doctor                          │
└─────────────────────────────────────────┘

  ✔ Node.js         v20.11.0
  ✔ npm             v10.2.4
  ✔ pnpm            v9.12.0
  ✔ Git             v2.43.0
  ✔ Docker          v25.0.3
  ✔ Docker Compose  v2.24.5
  ✔ .env            found
  ✔ tsconfig.json   found

  Platform  linux x64
  Memory    16.3 GB
  CPU       8 cores

  ✔ All checks passed`,
      },
      {
        id: 'doctor-issues',
        title: 'Missing tools',
        command: 'dev doctor',
        description: 'Some tools not found',
        output: `┌─────────────────────────────────────────┐
│  DevCLI Doctor                          │
└─────────────────────────────────────────┘

  ✔ Node.js         v20.11.0
  ✔ npm             v10.2.4
  ✖ pnpm            not found
  ✔ Git             v2.43.0
  ✖ Docker          not found
  ✖ Docker Compose  not found
  ✔ .env            found
  ✖ tsconfig.json   not found

  Platform  darwin arm64
  Memory    8.0 GB
  CPU       10 cores

  ✖ 4 issues found — run suggested commands to fix`,
      },
    ],
  },
  {
    plugin: 'docker',
    category: 'docker',
    description: 'Docker inspection',
    fixtures: [
      {
        id: 'docker-containers',
        title: 'List containers',
        command: 'dev docker',
        description: 'Running containers overview',
        output: `┌──────────────────────────────────────────────────────────────────┐
│  ID    Name          Image              Status        Ports      │
├──────────────────────────────────────────────────────────────────┤
│  a1b2  postgres-dev  postgres:16        Up 2 hours    5432       │
│  c3d4  redis-cache   redis:7-alpine     Up 2 hours    6379       │
│  e5f6  app-api       node:20-alpine     Up 45 min     3000:3000  │
└──────────────────────────────────────────────────────────────────┘

  3 containers running`,
      },
      {
        id: 'docker-images',
        title: 'List images',
        command: 'dev docker images',
        description: 'Local Docker images',
        output: `┌───────────────────────────────────────────────────────────┐
│  Repository      Tag          Size        Created         │
├───────────────────────────────────────────────────────────┤
│  postgres        16           432 MB      2 days ago      │
│  redis           7-alpine     32 MB       5 days ago      │
│  node            20-alpine    178 MB      1 week ago      │
│  nginx           latest       187 MB      2 weeks ago     │
└───────────────────────────────────────────────────────────┘

  4 images — 829 MB total`,
      },
      {
        id: 'docker-disk',
        title: 'Disk usage',
        command: 'dev docker disk',
        description: 'Docker disk consumption',
        output: `┌──────────────────────────────────────┐
│  Docker Disk Usage                   │
└──────────────────────────────────────┘

  Images      829 MB
  Containers  45 MB
  Volumes     1.2 GB
  Build Cache 234 MB

  Total       2.3 GB`,
      },
    ],
  },
  {
    plugin: 'ports',
    category: 'utility',
    description: 'Port management',
    fixtures: [
      {
        id: 'ports-list',
        title: 'List ports',
        command: 'dev ports',
        description: 'All listening ports',
        output: `┌──────────────────────────────────────────────────────────┐
│  Port    PID     Process           State                 │
├──────────────────────────────────────────────────────────┤
│  3000    12451   node              LISTEN                │
│  5432    8834    postgres          LISTEN                │
│  6379    9102    redis-server      LISTEN                │
│  8080    15203   nginx             LISTEN                │
│  9090    16844   prometheus        LISTEN                │
└──────────────────────────────────────────────────────────┘

  5 ports in use`,
      },
      {
        id: 'ports-kill',
        title: 'Kill port',
        command: 'dev ports kill 3000',
        description: 'Free a port instantly',
        output: `  ✔ Killed process 12451 (node) on port 3000`,
      },
    ],
  },
  {
    plugin: 'git',
    category: 'git',
    description: 'Git overview',
    fixtures: [
      {
        id: 'git-status',
        title: 'Repository status',
        command: 'dev git',
        description: 'Quick git overview',
        output: `┌─────────────────────────────────────────┐
│  Git Overview                           │
└─────────────────────────────────────────┘

  Branch     feature/auth
  Ahead      3 commits
  Behind     0 commits
  Stash      2 entries
  Modified   4 files

  Modified files:
    M  src/auth/handler.ts
    M  src/auth/middleware.ts
    A  src/auth/strategies/oauth.ts
    D  src/auth/legacy.ts`,
      },
      {
        id: 'git-log',
        title: 'Recent commits',
        command: 'dev git log 5',
        description: 'Last 5 commits',
        output: `  a3f8c21 feat(auth): add OAuth2 strategy
  b1e9d44 feat(auth): implement JWT refresh tokens
  c7f2a08 fix(auth): handle expired sessions gracefully
  d4b6e19 refactor(auth): extract middleware to separate module
  e2c8f55 test(auth): add integration tests for login flow`,
      },
    ],
  },
  {
    plugin: 'json',
    category: 'data',
    description: 'JSON utilities',
    fixtures: [
      {
        id: 'json-format',
        title: 'Format JSON',
        command: 'dev json format',
        description: 'Pretty-print from stdin',
        output: `{
  "name": "devcli",
  "version": "1.0.4",
  "plugins": [
    "doctor",
    "docker",
    "ports"
  ]
}`,
      },
      {
        id: 'json-validate',
        title: 'Validate JSON',
        command: 'dev json validate config.json',
        description: 'Check JSON validity',
        output: `  ✔ Valid JSON — config.json (234 bytes)`,
      },
    ],
  },
  {
    plugin: 'jwt',
    category: 'security',
    description: 'JWT tools',
    fixtures: [
      {
        id: 'jwt-decode',
        title: 'Decode token',
        command: 'dev jwt decode eyJhbGciOi...',
        description: 'Decode without verification',
        output: `┌─────────────────────────────────────────┐
│  JWT Header                             │
├─────────────────────────────────────────┤
│  alg: HS256                             │
│  typ: JWT                               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  JWT Payload                            │
├─────────────────────────────────────────┤
│  sub:   1234567890                      │
│  name:  John Doe                        │
│  iat:   1714567890                      │
│  exp:   1714571490                      │
└─────────────────────────────────────────┘

  Issued   2024-05-01 12:31:30
  Expires  2024-05-01 13:31:30`,
      },
    ],
  },
  {
    plugin: 'uuid',
    category: 'utility',
    description: 'ID generation',
    fixtures: [
      {
        id: 'uuid-generate',
        title: 'Generate UUIDs',
        command: 'dev uuid v4 -n 3',
        description: 'Generate multiple UUIDs',
        output: `  a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d
  f6e5d4c3-b2a1-4f0e-9d8c-7b6a5f4e3d2c
  1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d`,
      },
      {
        id: 'uuid-nano',
        title: 'NanoID',
        command: 'dev uuid nano -n 5',
        description: 'Generate NanoIDs',
        output: `  V1StGXR8_Z5jdHi6B-myT
  W2uShYR9-a6kEjI7C-nzU
  X3vTiZS0-b7lFkJ8D-oaV`,
      },
    ],
  },
  {
    plugin: 'qr',
    category: 'utility',
    description: 'QR code generation',
    fixtures: [
      {
        id: 'qr-generate',
        title: 'Generate QR',
        command: 'dev qr "https://devcli.dev"',
        description: 'Terminal QR code',
        output: `  ██████████████████████████
  ██          ██  ██      ██
  ██  ████  ████  ██  ██  ██
  ██  ████  ████      ██  ██
  ██  ████  ████  ████    ██
  ██          ██████████  ██
  ████████████  ██    ██  ██
  ██    ██  ██    ██  ████
  ██  ████      ██████  ██
  ██      ██  ██        ██
  ██████████████████████████

  devcli.dev`,
      },
    ],
  },
  {
    plugin: 'env',
    category: 'env',
    description: 'Environment variable management',
    fixtures: [
      {
        id: 'env-diff',
        title: 'Compare .env files',
        command: 'dev env',
        description: 'Diff .env vs .env.example',
        output: `┌──────────────────────────────────────────────────────────┐
│  .env vs .env.example                                    │
├──────────────────────────────────────────────────────────┤
│  DATABASE_URL     ✔ set        (example: postgres://...) │
│  API_KEY          ✔ set        (example: sk-...)         │
│  REDIS_URL        ✖ missing    (example: redis://...)    │
│  DEBUG            ⚠ extra      (not in example)          │
│  NODE_ENV         ✔ set        (example: development)    │
└──────────────────────────────────────────────────────────┘

  3 set · 1 missing · 1 extra`,
      },
    ],
  },
  {
    plugin: 'repo',
    category: 'dev',
    description: 'Project analysis',
    fixtures: [
      {
        id: 'repo-scan',
        title: 'Scan project',
        command: 'dev repo',
        description: 'Analyze current project',
        output: `┌─────────────────────────────────────────┐
│  Project Analysis                       │
└─────────────────────────────────────────┘

  Framework     Next.js 15
  Language      TypeScript (strict)
  Runtime       Node.js 20
  Pkg Manager   pnpm 9
  Architecture  Monorepo (4 workspaces)

  Dependencies
    Production   12
    Dev          8

  Files         342
  Lines         28,451`,
      },
    ],
  },
  {
    plugin: 'ai',
    category: 'ai',
    description: 'Error explanation',
    fixtures: [
      {
        id: 'ai-explain',
        title: 'Explain error',
        command: 'dev ai TypeError: Cannot read properties of undefined',
        description: 'Local error analysis',
        output: `┌─────────────────────────────────────────┐
│  TypeError Analysis                     │
└─────────────────────────────────────────┘

  Cause:    Accessing property on undefined value
  Common:   Uninitialized variable or missing null check
  Fix:      Add optional chaining (?.) or null guard

  Example:
    Before:  user.profile.name
    After:   user?.profile?.name`,
      },
    ],
  },
]

export function getPluginDemo(plugin: string): PluginDemo | undefined {
  return pluginDemos.find((d) => d.plugin === plugin)
}

export function getAllDemos(): PluginDemo[] {
  return pluginDemos
}
