import chalk from 'chalk'
import { CliError, toCliError } from './errors.js'

const SYMBOLS = {
  error: chalk.red('✖'),
  warning: chalk.yellow('⚠'),
  info: chalk.cyan('ℹ'),
  success: chalk.green('✔'),
  arrow: chalk.cyan('→'),
}

function isDebug(): boolean {
  return (
    process.env.DEBUG === '1' || process.env.DEBUG === 'true' || process.argv.includes('--debug')
  )
}

function supportsColor(): boolean {
  if (process.env.NO_COLOR !== undefined) return false
  if (process.env.FORCE_COLOR === '1') return true
  return Boolean(process.stdout.isTTY)
}

function formatUnknown(err: unknown): string {
  if (err instanceof Error) {
    const name = err.name && err.name !== 'Error' ? err.name : null
    return name ? `${name}: ${err.message}` : err.message
  }
  return String(err)
}

export function handleError(err: unknown): never {
  const cliErr = toCliError(err)
  const debug = isDebug()
  const color = supportsColor()
  const red = color ? chalk.red : (s: string) => s
  const yellow = color ? chalk.yellow : (s: string) => s
  const gray = color ? chalk.gray : (s: string) => s
  const cyan = color ? chalk.cyan : (s: string) => s

  process.stderr.write('\n')
  process.stderr.write(`${red(SYMBOLS.error)}  ${red('Error')}: ${formatUnknown(cliErr)}\n`)

  if (cliErr instanceof CliError && cliErr.suggestion) {
    process.stderr.write(`\n`)
    process.stderr.write(`${yellow(SYMBOLS.arrow)}  ${gray('Suggestion')}: ${cliErr.suggestion}\n`)
  }

  if (debug && cliErr.stack) {
    process.stderr.write(`\n`)
    process.stderr.write(`${gray(cliErr.stack)}\n`)
    if (cliErr.cause instanceof Error && cliErr.cause.stack) {
      process.stderr.write(`\n${gray('Caused by:')}\n`)
      process.stderr.write(`${gray(cliErr.cause.stack)}\n`)
    }
  } else if (debug && cliErr.cause instanceof Error) {
    process.stderr.write(`\n${gray('Caused by: ' + formatUnknown(cliErr.cause))}\n`)
  }

  if (!debug) {
    process.stderr.write(`\n${gray('Run with --debug for more details.')}\n`)
  }

  process.stderr.write(`\n${cyan(SYMBOLS.info)}  ${gray('Need help?')} dev --help\n\n`)

  process.exit(cliErr.code ?? 1)
}

export function setupGlobalErrorHandlers(): void {
  process.on('uncaughtException', (err) => {
    handleError(err)
  })
  process.on('unhandledRejection', (reason) => {
    handleError(reason)
  })
}
