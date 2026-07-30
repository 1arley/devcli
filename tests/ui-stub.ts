// Lightweight stub of @devcli/ui for tests.
// Avoids loading ink/react/yoga-wasm (heavy + WASM crashes under vitest workers),
// while providing the symbols the plugins actually use.
import chalk from 'chalk'

export const symbols = {
  success: chalk.green('✓'),
  error: chalk.red('✗'),
  warning: chalk.yellow('⚠'),
  info: chalk.blue('ℹ'),
  arrow: chalk.gray('→'),
  bullet: chalk.gray('•'),
}

export const logSymbols = {
  success: symbols.success,
  error: symbols.error,
  warning: symbols.warning,
  info: symbols.info,
}

export function banner(title: string, subtitle?: string): string {
  return subtitle ? `${title}\n${subtitle}` : title
}

export function infoBox(title: string, body: string): string {
  return `[${title}]\n${body}`
}

export function createTable(headers: string[], rows: Record<string, unknown>[]) {
  const headerLine = headers.join(' | ')
  const sep = headers.map(() => '---').join(' | ')
  const body = rows.map((r) => headers.map((h) => String(r[h] ?? '')).join(' | ')).join('\n')
  return {
    toString: () => `${headerLine}\n${sep}\n${body}`,
  }
}

export const boxen = (s: string): string => s

export const ora = () => ({
  start() {
    return this
  },
  succeed() {
    return this
  },
  fail() {
    return this
  },
  stop() {
    return this
  },
  text: '',
})

export async function withSpinner<T>(message: string, fn: () => Promise<T>): Promise<T> {
  return fn()
}

export type {}

// component stubs (not used by plugins but exported by ui index)
export const Select = (): null => null
export const SearchInput = (): null => null
