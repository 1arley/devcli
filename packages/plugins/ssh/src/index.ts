import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { isSafeIdentifier } from '@devcli/core'
import { createTable, symbols } from '@devcli/ui'
import chalk from 'chalk'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const SSH_DIR = join(homedir(), '.ssh')
const SSH_CONFIG = join(SSH_DIR, 'config')

interface HostEntry {
  host: string
  hostName?: string
  user?: string
  port?: string
  identityFile?: string
}

function parseSshConfig(): HostEntry[] {
  if (!existsSync(SSH_CONFIG)) return []
  const content = readFileSync(SSH_CONFIG, 'utf-8')
  const entries: HostEntry[] = []
  let current: Partial<HostEntry> | null = null

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const hostMatch = trimmed.match(/^Host\s+(.+)$/i)
    if (hostMatch) {
      if (current && current.host) entries.push(current as HostEntry)
      current = { host: hostMatch[1]!.trim() }
      continue
    }

    if (!current) continue
    const valMatch = trimmed.match(/^(\w+)\s+(.+)$/)
    if (valMatch) {
      const key = valMatch[1]!.toLowerCase()
      const val = valMatch[2]!.trim().replace(/"/g, '')
      if (key === 'hostname') current.hostName = val
      else if (key === 'user') current.user = val
      else if (key === 'port') current.port = val
      else if (key === 'identityfile') current.identityFile = val
    }
  }
  if (current && current.host) entries.push(current as HostEntry)
  return entries
}

function normalizeEntries(entries: HostEntry[]): HostEntry[] {
  const expanded: HostEntry[] = []
  for (const e of entries) {
    if (e.host.includes('*') || e.host.includes('?')) {
      for (const h of enumerateWildcard(e, entries)) {
        if (!expanded.find((x) => x.host === h.host)) expanded.push(h)
      }
    } else {
      if (!expanded.find((x) => x.host === e.host)) expanded.push(e)
    }
  }
  return expanded
}

function enumerateWildcard(wc: HostEntry, all: HostEntry[]): HostEntry[] {
  return all.filter((e) => e.host !== wc.host && !e.host.includes('*') && !e.host.includes('?'))
}

const manifest = {
  name: 'ssh',
  description: 'SSH connection manager: list, connect, and manage hosts',
  version: '0.0.0',
  keywords: ['ssh', 'connect', 'remote', 'server', 'hosts'],
  category: 'dev' as const,
}

export const createSshPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      const ssh = program.command('ssh').description(manifest.description)

      ssh.action(() => {
        const entries = normalizeEntries(parseSshConfig())
        if (entries.length === 0) {
          console.log(`${symbols.info} No SSH hosts configured in ~/.ssh/config`)
          return
        }
        const rows = entries.map((e) => ({
          Host: e.host,
          'Host Name': e.hostName ?? '-',
          User: e.user ?? '-',
          Port: e.port ?? '22',
        }))
        const table = createTable(['Host', 'Host Name', 'User', 'Port'], rows)
        console.log(table.toString())
      })

      ssh
        .command('connect <host>')
        .description('Connect to an SSH host')
        .option('-p, --port <port>', 'Port number')
        .option('-l, --user <user>', 'Username')
        .action((host: string, options: { port?: string; user?: string }) => {
          if (!isSafeIdentifier(host)) {
            console.log(`${symbols.error} Invalid host name: ${host}`)
            return
          }
          const entries = parseSshConfig()
          const entry = entries.find(
            (e) => e.host === host || e.hostName === host || e.host === `*`,
          )
          const user = options.user ?? entry?.user ?? ''
          const port = options.port ?? entry?.port ?? ''
          const hostName = entry?.hostName ?? host
          // No shell: every value is an argv element, so user/port/host can't
          // be interpreted as ssh options or shell syntax.
          const sshArgs: string[] = []
          if (port) {
            if (!/^\d+$/.test(port)) {
              console.log(`${symbols.error} Invalid port: ${port}`)
              return
            }
            sshArgs.push('-p', port)
          }
          if (user) sshArgs.push(`${user}@${hostName}`)
          else sshArgs.push(hostName)
          console.log(`${symbols.info} Connecting to ${chalk.bold(hostName)}...`)
          try {
            execFileSync('ssh', sshArgs, { stdio: 'inherit' })
          } catch {
            process.exit(1)
          }
        })

      ssh
        .command('add <host>')
        .description('Add a host to SSH config')
        .option('-u, --user <user>', 'Username')
        .option('-p, --port <port>', 'Port number')
        .option('-i, --identity <file>', 'Identity file path')
        .action((host: string, options: { user?: string; port?: string; identity?: string }) => {
          if (!isSafeIdentifier(host)) {
            console.log(`${symbols.error} Invalid host name: ${host}`)
            return
          }
          if (!existsSync(SSH_DIR)) mkdirSync(SSH_DIR, { recursive: true })
          const lines: string[] = ['', `Host ${host}`, `  HostName ${host}`]
          if (options.user) lines.push(`  User ${options.user}`)
          if (options.port) lines.push(`  Port ${options.port}`)
          if (options.identity) lines.push(`  IdentityFile ${options.identity}`)
          appendFileSync(SSH_CONFIG, lines.join('\n') + '\n')
          console.log(`${symbols.success} Added host ${chalk.bold(host)} to SSH config`)
        })
    },
  }
}
