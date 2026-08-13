import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function getVersion(): string {
  try {
    return JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'))
      .version as string
  } catch {
    return '0.0.0'
  }
}

const COMMANDS: [string, string][] = [
  ['update', 'Check for and display available updates'],
  ['doctor', 'Diagnose your development environment'],
  ['ports', 'List, inspect, and kill processes on ports'],
  ['docker', 'Inspect Docker containers, images, volumes, and networks'],
  ['git', 'Inspect Git branch, status, stashes, and more'],
  ['jwt', 'Decode, encode, and validate JWT tokens'],
  ['json', 'Format, minify, validate, and convert JSON'],
  ['uuid', 'Generate UUID v4, v7, NanoID, and ULID'],
  ['qr', 'Generate scannable QR codes in the terminal'],
  ['env', 'Compare .env and .env.example, detect missing variables'],
  ['repo', 'Analyze a project: framework, language, dependencies, architecture'],
  ['ai', 'AI-powered developer tools: explain, commit, review, chat'],
  ['ssh', 'SSH connection manager: list, connect, and manage hosts'],
  ['logs', 'Aggregated log viewer for system, Docker, and PM2 logs'],
  ['standup', 'Generate markdown standup notes from git commits'],
  ['context', 'Context management'],
  ['clean', 'Clean project artifacts'],
  ['completion', 'Generate shell completion scripts for bash, zsh and fish'],
  ['plugin', 'Manage plugins'],
  ['chat', 'Chat with an AI assistant'],
]

export function fastHelp(): string {
  const width = Math.max(...COMMANDS.map(([c]) => c.length))
  const lines = [
    'Usage: dev [options] [command]',
    '',
    'The Raycast of the Terminal for Developers',
    '',
    'Options:',
    '  -V, --version   output the version number',
    '  -h, --help      display help for command',
    '',
    'Commands:',
    ...COMMANDS.map(([cmd, desc]) => `  ${cmd.padEnd(width + 2)}${desc}`),
    '',
    'Examples:',
    '  $ dev              Interactive command discovery',
    '  $ dev doctor       Check development environment',
    '  $ dev json         JSON utilities (format, validate, query)',
    '  $ dev completion zsh   Generate zsh completion',
    '',
    'More info: https://github.com/1arley/devcli',
    '',
  ]
  return lines.join('\n')
}

const args = process.argv.slice(2)
if (args.length === 1) {
  if (args[0] === '--version' || args[0] === '-V') {
    process.stdout.write(`${getVersion()}\n`)
    process.exit(0)
  }
  if (args[0] === '--help' || args[0] === '-h') {
    process.stdout.write(fastHelp())
    process.exit(0)
  }
}
