import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { tryExec, isSafeIdentifier } from '@devcli/core'
import { symbols, banner } from '@devcli/ui'
import chalk from 'chalk'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

function safeLines(lines: unknown, fallback = 50): number {
  const n = typeof lines === 'number' ? lines : parseInt(String(lines), 10)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(n, 10000)
}

function safeContainer(name: string): string | null {
  return isSafeIdentifier(name) ? name : null
}

function getSystemLogs(lines: number = 50): string | null {
  const n = safeLines(lines)
  const journalctl = tryExec('journalctl', ['-n', String(n), '--no-pager'])
  if (journalctl) return journalctl
  return (
    tryExec('tail', ['-n', String(n), '/var/log/syslog']) ??
    tryExec('tail', ['-n', String(n), '/var/log/messages'])
  )
}

function getDockerLogs(container: string | undefined, lines: number = 50): string | null {
  const n = safeLines(lines)
  if (container) {
    const safe = safeContainer(container)
    if (!safe) {
      console.log(chalk.red(`Invalid container name: ${container}`))
      return null
    }
    return tryExec('docker', ['logs', '--tail', String(n), safe])
  }
  const containers = tryExec('docker', ['ps', '--format', '{{.Names}}'])
  if (!containers) return null
  const names = containers.split('\n').filter(Boolean)
  if (names.length === 0) return null
  const output: string[] = []
  for (const name of names.slice(0, 5)) {
    const logs = tryExec('docker', ['logs', '--tail', String(Math.floor(n / names.length)), name])
    if (logs) output.push(chalk.bold(`--- ${name} ---`), logs)
  }
  return output.join('\n') || null
}

function getPm2Logs(lines: number = 50): string | null {
  const n = safeLines(lines)
  const logDir = join(homedir(), '.pm2', 'logs')
  if (!existsSync(logDir)) return null
  let files: string[] = []
  try {
    files = readdirSync(logDir)
      .filter((f) => f.endsWith('.log'))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 3)
      .map((f) => join(logDir, f))
  } catch {
    return null
  }
  if (files.length === 0) return null
  const output: string[] = []
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8').split('\n').slice(-n).join('\n')
      output.push(chalk.bold(`--- ${file.split('/').pop()} ---`), content)
    } catch {
      continue
    }
  }
  return output.join('\n')
}

const manifest = {
  name: 'logs',
  description: 'Aggregated log viewer for system, Docker, and PM2 logs',
  version: '0.0.0',
  keywords: ['logs', 'system', 'docker', 'pm2', 'journalctl'],
  category: 'dev' as const,
}

export const createLogsPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      const logs = program.command('logs').description(manifest.description)

      logs.action(() => {
        console.log(banner('Log Sources'))
        const system = getSystemLogs(10)
        if (system) console.log(`${chalk.bold(chalk.cyan('System'))}\n${system.slice(0, 500)}\n`)

        const docker = getDockerLogs(undefined, 10)
        if (docker) console.log(`${chalk.bold(chalk.cyan('Docker'))}\n${docker.slice(0, 500)}\n`)

        const pm2 = getPm2Logs(10)
        if (pm2) console.log(`${chalk.bold(chalk.cyan('PM2'))}\n${pm2.slice(0, 500)}\n`)

        if (!system && !docker && !pm2) {
          console.log(`${symbols.info} No log sources available`)
        }
      })

      logs
        .command('system [lines]')
        .description('Show system logs (journalctl or syslog)')
        .action((lines: number = 50) => {
          const output = getSystemLogs(lines)
          if (!output) {
            console.log(`${symbols.error} No system log source found`)
            return
          }
          console.log(output)
        })

      logs
        .command('docker [container]')
        .description('Show Docker container logs')
        .option('-n, --lines <count>', 'Number of lines', '50')
        .action((container: string | undefined, options: { lines: string }) => {
          const output = getDockerLogs(container, parseInt(options.lines, 10))
          if (!output) {
            console.log(`${symbols.error} No Docker logs found`)
            return
          }
          console.log(output)
        })

      logs
        .command('pm2 [lines]')
        .description('Show PM2 process logs')
        .action((lines: number = 50) => {
          const output = getPm2Logs(lines)
          if (!output) {
            console.log(`${symbols.info} No PM2 logs found`)
            return
          }
          console.log(output)
        })
    },
  }
}
