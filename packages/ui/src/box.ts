import boxen from 'boxen'
import chalk from 'chalk'

export function banner(title: string, subtitle?: string): string {
  const content = subtitle
    ? `${chalk.bold.white(title)}\n${chalk.gray(subtitle)}`
    : chalk.bold.white(title)

  return boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
    textAlignment: 'center',
  })
}

export function infoBox(title: string, body: string): string {
  return boxen(body, {
    title: chalk.cyan(title),
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderStyle: 'single',
    borderColor: 'gray',
  })
}

export { boxen }
