import logSymbols from 'log-symbols'
import chalk from 'chalk'

export { logSymbols }

export const symbols = {
  success: chalk.green('✓'),
  error: chalk.red('✗'),
  warning: chalk.yellow('⚠'),
  info: chalk.blue('ℹ'),
  arrow: chalk.gray('→'),
  bullet: chalk.gray('•'),
}
