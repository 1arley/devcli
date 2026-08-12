import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import chalk from 'chalk'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

type MarkdownRenderer = (text: string) => string

function detectTerminalColorSupport(): boolean {
  return (
    process.env['FORCE_COLOR'] !== '0' &&
    (process.env['FORCE_COLOR'] === '1' || process.stdout.isTTY === true)
  )
}

function createRenderer(): MarkdownRenderer {
  try {
    const markedTerminal = require('marked-terminal')
    const { marked } = require('marked')
    if (markedTerminal && marked) {
      marked.setOptions({
        renderer: new markedTerminal.MarkedTerminal({
          code: chalk.cyan,
          firstHeading: chalk.bold.cyan,
          heading: chalk.bold.cyan,
          strong: chalk.bold,
          em: chalk.italic,
          blockquote: chalk.gray,
          listitem: chalk.reset,
          codespan: chalk.cyan,
        }),
      })
      return (text: string) => marked.parse(text)
    }
  } catch {
    // Module not available — use fallback renderer below
  }

  // Fallback: basic inline code highlighting
  return (text: string) => {
    return text
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang: string | undefined, code: string) => {
        try {
          const { highlight } = require('cli-highlight')
          if (highlight) return highlight(code, { language: lang ?? 'typescript' })
        } catch {
          // cli-highlight not available
        }
        return chalk.cyan(code)
      })
      .replace(/`([^`]+)`/g, (_, code: string) => chalk.cyan(code))
      .replace(/\*\*([^*]+)\*\*/g, (_, t: string) => chalk.bold(t))
      .replace(/^\s*#+\s+(.+)$/gm, (_, h: string) => chalk.bold.cyan(h))
      .replace(/^\s*>\s+(.+)$/gm, (_, q: string) => chalk.gray(q))
  }
}

function loadAsciiArt(name: string): string {
  const candidates = [
    join(process.cwd(), 'assets', `${name}.txt`),
    join(__dirname, '..', '..', '..', '..', 'assets', `${name}.txt`),
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      return readFileSync(p, 'utf-8').trimEnd()
    }
  }
  return ''
}

export function renderAsciiArt(
  name: 'favicon' | 'bodyicon' | 'faceicon',
  _color: 'cyan' | 'magenta' = 'cyan',
): string {
  const art = loadAsciiArt(name)
  if (!art) return ''
  const lines = art.split('\n').filter((l) => l.trim().length > 0 || l.length > 0)
  // For favicon (small crystal), show as-is. For faceicon/bodyicon, trim blank edges
  if (name === 'favicon') {
    const nonEmpty = lines.filter((l) => l.trim().length > 0)
    return nonEmpty.map((l) => chalk.cyan.dim(l)).join('\n')
  }
  if (name === 'bodyicon') {
    return lines
      .slice(0, 30)
      .map((l) => chalk.magenta.dim(l))
      .join('\n')
  }
  // faceicon
  return lines
    .slice(0, 40)
    .map((l) => chalk.cyan.dim(l))
    .join('\n')
}

export function renderMarkdown(text: string): string {
  const renderer = createRenderer()
  return renderer(text)
}

export function renderToolCall(toolName: string, args: Record<string, unknown>): string {
  const argSummary = Object.entries(args)
    .map(([k, v]) => {
      const val = typeof v === 'string' ? (v.length > 60 ? v.slice(0, 60) + '...' : v) : String(v)
      return `${k}=${val}`
    })
    .join(', ')
  return chalk.yellow.bold(`⚡ ${toolName}(${argSummary})`)
}

export function renderToolResult(result: { success: boolean; output: string }): string {
  const lines = result.output.split('\n').slice(0, 10)
  const truncated = lines.join('\n') + (result.output.split('\n').length > 10 ? '\n...' : '')
  return result.success ? chalk.green(`  ✓ ${truncated}`) : chalk.red(`  ✗ ${truncated}`)
}

export function renderWelcomeBanner(mode: string, model: string, provider: string): string {
  // Show favicon (crystal) as small icon + info
  const favicon = renderAsciiArt('favicon')
  const infoLine =
    chalk.bold.cyan('  Dev Chat') +
    chalk.gray(' ⚡ ') +
    chalk.bold(`${model}`) +
    chalk.gray(` (${provider})`)

  if (favicon && detectTerminalColorSupport()) {
    // Show compact form — first few non-empty lines of favicon
    const artLines = favicon.split('\n').slice(0, 8)
    const header = `${artLines.join('\n')}\n\n${infoLine}`
    const statusLine = chalk.gray(
      `  Mode: ${chalk.bold(mode)} | Type your message, /help for commands, /exit to quit`,
    )
    return `${header}\n${statusLine}\n`
  }

  return `${infoLine}\n${chalk.gray('  Mode: ' + chalk.bold(mode) + ' | Type your message, /help for commands, /exit to quit')}\n`
}

export function renderBigBanner(): string {
  const faceicon = renderAsciiArt('faceicon')
  if (faceicon) return faceicon
  return chalk.bold.cyan('\n  Dev Chat — AI Coding Agent\n')
}
