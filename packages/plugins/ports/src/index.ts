import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@dev-cli/core'
import { createTable, symbols, withSpinner } from '@dev-cli/ui'
import chalk from 'chalk'
import { execSync } from 'node:child_process'

interface PortInfo {
  port: string
  pid: string
  process: string
}

function getPorts(): PortInfo[] {
  const isWin = process.platform === 'win32'

  try {
    if (isWin) {
      return parseWindowsPorts()
    }
    return parseUnixPorts()
  } catch {
    return []
  }
}

function parseUnixPorts(): PortInfo[] {
  const output = execSync('lsof -iTCP -sTCP:LISTEN -P -n', { encoding: 'utf-8' })
  const lines = output.trim().split('\n').slice(1)
  const ports: PortInfo[] = []

  for (const line of lines) {
    const parts = line.split(/\s+/)
    if (parts.length < 9) continue
    const process = parts[0] ?? ''
    const pid = parts[1] ?? ''
    const addr = parts[8] ?? ''
    const port = addr.split(':').pop() ?? ''
    if (port) ports.push({ port, pid, process })
  }

  return ports
}

function parseWindowsPorts(): PortInfo[] {
  const output = execSync('netstat -ano | findstr LISTENING', { encoding: 'utf-8' })
  const lines = output.trim().split('\n')
  const ports: PortInfo[] = []

  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 4) continue
    const addr = parts[1] ?? ''
    const port = addr.split(':').pop() ?? ''
    const pid = parts[4] ?? ''
    const process =
      execSync(`tasklist /fi "PID eq ${pid}" /nh /fo csv`, { encoding: 'utf-8' })
        .trim()
        .replace(/"/g, '')
        .split(',')[0] ?? ''
    if (port) ports.push({ port, pid, process })
  }

  return ports
}

function killPort(port: string): boolean {
  try {
    const isWin = process.platform === 'win32'
    if (isWin) {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' })
        .trim()
        .split('\n')[0]
      const pid = out?.split(/\s+/).pop() ?? ''
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' })
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'pipe' })
    }
    return true
  } catch {
    return false
  }
}

const manifest = {
  name: 'ports',
  description: 'List, inspect, and kill processes on ports',
  version: '0.0.0',
  keywords: ['ports', 'process', 'kill', 'lsof', 'listen'],
  category: 'utility' as const,
}

export const createPortsPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      const ports = program.command('ports').description(manifest.description)

      ports.action(async () => {
        const data = await withSpinner('Scanning ports...', () => Promise.resolve(getPorts()))
        if (data.length === 0) {
          console.log(`${symbols.info} No listening ports found`)
          return
        }
        const table = createTable(
          ['Port', 'PID', 'Process'],
          data.map((p) => ({ Port: p.port, PID: p.pid, Process: p.process })),
        )
        console.log(table.toString())
      })

      ports
        .command('kill <port>')
        .description('Kill the process listening on a port')
        .action((port: string) => {
          const result = killPort(port)
          if (result) {
            console.log(`${symbols.success} Killed process on port ${chalk.bold(port)}`)
          } else {
            console.log(`${symbols.error} Could not kill process on port ${port}`)
          }
        })

      ports
        .command('free')
        .description('Show only ports that are in use')
        .action(async () => {
          const data = getPorts()
          if (data.length === 0) {
            console.log(`${symbols.success} All ports are free`)
            return
          }
          console.log(`${symbols.warning} ${data.length} port(s) in use`)
          data.forEach((p) => console.log(`  ${chalk.bold(p.port).padEnd(8)} ${p.process}`))
        })
    },
  }
}
