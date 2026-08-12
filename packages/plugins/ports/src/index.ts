import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { createTable, symbols, withSpinner } from '@devcli/ui'
import chalk from 'chalk'
import { killPort, listPorts } from '@devcli/core'

const manifest = {
  name: 'ports',
  description: 'List, inspect, and kill processes on ports',
  version: '0.0.0',
  keywords: ['ports', 'process', 'kill', 'lsof', 'ss', 'fuser', 'listen'],
  category: 'utility' as const,
}

export const createPortsPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      const ports = program.command('ports').description(manifest.description)

      ports.action(async () => {
        const data = await withSpinner('Scanning ports...', () => Promise.resolve(listPorts()))
        if (data.length === 0) {
          console.log(`${symbols.info} No listening ports found`)
          return
        }
        const table = createTable(
          ['Port', 'PID', 'Process', 'Proto', 'Address'],
          data.map((p) => ({
            Port: p.port,
            PID: p.pid || '-',
            Process: p.process,
            Proto: p.protocol,
            Address: p.address,
          })),
        )
        console.log(table.toString())
      })

      ports
        .command('kill <port>')
        .description('Kill the process listening on a port')
        .action((port: string) => {
          const result = killPort(port)
          switch (result.kind) {
            case 'killed':
              console.log(
                `${symbols.success} Killed process on port ${chalk.bold(port)} (pid ${result.pids.join(', ')})`,
              )
              break
            case 'free':
              console.log(`${symbols.info} Port ${chalk.bold(port)} is already free`)
              break
            case 'permission':
              console.log(
                `${symbols.error} Port ${chalk.bold(port)} still listening after kill attempt.`,
              )
              if (result.pids.length > 0) {
                console.log(`  ${chalk.dim(`pid ${result.pids.join(', ')} not owned by you`)}`)
              }
              console.log(
                `  ${chalk.dim(`try: sudo kill -9 $(sudo lsof -ti:${port}) or sudo fuser -k ${port}/tcp`)}`,
              )
              break
            case 'unknown':
              console.log(
                `${symbols.warning} Port ${chalk.bold(port)}: kill commands ran but result is uncertain`,
              )
              break
            case 'error':
              console.log(
                `${symbols.error} Could not kill process on port ${port}: ${result.message}`,
              )
              break
          }
        })

      ports
        .command('free')
        .description('Show only ports that are in use')
        .action(async () => {
          const data = await withSpinner('Scanning ports...', () => Promise.resolve(listPorts()))
          if (data.length === 0) {
            console.log(`${symbols.success} All ports are free`)
            return
          }
          console.log(`${symbols.warning} ${data.length} port(s) in use`)
          data.forEach((p) =>
            console.log(
              `  ${chalk.bold(p.port).padEnd(8)} ${p.process.padEnd(20)} ${p.pid || '-'}`,
            ),
          )
        })
    },
  }
}
