import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { tryExec, listPorts } from '@devcli/core'
import { infoBox, banner, symbols } from '@devcli/ui'
import chalk from 'chalk'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

interface GitStatus {
  branch: string
  ahead: string
  behind: string
  modified: number
  untracked: number
}

interface DockerInfo {
  running: number
  names: string[]
}

interface ContextPort {
  port: string
  process: string
}

interface DepsInfo {
  total: number
  outdated: number
  outOfDate: number
  major: number
}

function getGitStatus(): GitStatus | null {
  if (tryExec('git', ['rev-parse', '--is-inside-work-tree']) !== 'true') return null
  const branch = tryExec('git', ['rev-parse', '--abbrev-ref', 'HEAD']) ?? 'unknown'
  const ahead = tryExec('git', ['rev-list', '--count', '@{u}..HEAD']) ?? '0'
  const behind = tryExec('git', ['rev-list', '--count', 'HEAD..@{u}']) ?? '0'
  const status = tryExec('git', ['status', '--porcelain']) ?? ''
  const modified = status.split('\n').filter(Boolean).length
  const untracked =
    tryExec('git', ['ls-files', '--others', '--exclude-standard'])?.split('\n').filter(Boolean)
      .length ?? 0
  return { branch, ahead, behind, modified, untracked }
}

function getDockerInfo(): DockerInfo | null {
  const ps = tryExec('docker', ['ps', '--format', '{{.Names}}'])
  if (!ps) return null
  const names = ps.split('\n').filter(Boolean)
  return { running: names.length, names }
}

/**
 * Listening ports via the shared core logic (ss primary, lsof fallback).
 * Dedupes by port so the dashboard doesn't show tcp/tcp6 duplicates.
 */
function getPorts(): ContextPort[] {
  const all = listPorts()
  const seen = new Set<string>()
  const out: ContextPort[] = []
  for (const p of all) {
    if (seen.has(p.port)) continue
    seen.add(p.port)
    out.push({ port: p.port, process: p.process })
  }
  return out
}

function getDepInfo(): DepsInfo | null {
  const pkgPath = join(process.cwd(), 'package.json')
  if (!existsSync(pkgPath)) return null
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  const total = Object.keys(deps).length
  const outdated = tryExec('npm', ['outdated', '--json'])
  if (!outdated) return { total, outdated: 0, outOfDate: 0, major: 0 }
  try {
    const json = JSON.parse(outdated)
    const entries = Object.values(json) as { current?: string; wanted?: string; latest?: string }[]
    return {
      total,
      outdated: entries.length,
      outOfDate: entries.filter((e) => e.current !== e.wanted).length,
      major: entries.filter((e) => e.current?.split('.')[0] !== e.latest?.split('.')[0]).length,
    }
  } catch {
    return { total, outdated: 0, outOfDate: 0, major: 0 }
  }
}

const manifest = {
  name: 'context',
  description: 'Project dashboard: branch, deps, Docker, ports at a glance',
  version: '0.0.0',
  keywords: ['context', 'dashboard', 'status', 'overview', 'project'],
  category: 'dev' as const,
}

export const createContextPlugin: PluginFactory = (): Plugin => ({
  manifest,
  register(program: Command) {
    program
      .command('context')
      .description(manifest.description)
      .option('--json', 'Output as JSON')
      .action((options: { json?: boolean }) => {
        const git = getGitStatus()
        const docker = getDockerInfo()
        const ports = getPorts()
        const deps = getDepInfo()
        const cwd = process.cwd()
        const project = cwd.split('/').pop() ?? 'unknown'

        if (options.json) {
          console.log(JSON.stringify({ project, git, docker, ports, deps }, null, 2))
          return
        }

        console.log(banner('Project Context', project))

        if (git) {
          const gitLines = [
            `${chalk.bold('Branch'.padEnd(12))} ${chalk.cyan(git.branch)}`,
            `${chalk.bold('Ahead/Behind'.padEnd(12))} ${git.ahead}/${git.behind}`,
            `${chalk.bold('Modified'.padEnd(12))} ${git.modified} file(s)`,
            git.untracked > 0
              ? `${chalk.bold('Untracked'.padEnd(12))} ${git.untracked} file(s)`
              : '',
          ]
            .filter(Boolean)
            .join('\n')
          console.log(infoBox('Git', gitLines))
        }

        if (docker) {
          const dockerLines = [
            `${chalk.bold('Running'.padEnd(12))} ${docker.running} container(s)`,
            docker.names.length > 0
              ? `${chalk.bold('Names'.padEnd(12))} ${docker.names.slice(0, 5).join(', ')}${docker.names.length > 5 ? '...' : ''}`
              : '',
          ]
            .filter(Boolean)
            .join('\n')
          console.log(infoBox('Docker', dockerLines))
        }

        if (deps) {
          const depsColor = deps.outdated > 0 ? chalk.yellow : chalk.green
          const depsLines = [
            `${chalk.bold('Total'.padEnd(12))} ${deps.total}`,
            `${chalk.bold('Outdated'.padEnd(12))} ${depsColor(deps.outdated)}`,
          ].join('\n')
          console.log(infoBox('Dependencies', depsLines))
        }

        if (ports.length > 0) {
          const portLines = ports
            .slice(0, 10)
            .map((p) => `  ${chalk.cyan(p.port.padEnd(8))} ${p.process}`)
            .join('\n')
          const suffix =
            ports.length > 10 ? `\n  ${chalk.dim(`...and ${ports.length - 10} more`)}` : ''
          console.log(infoBox(`Ports (${ports.length})`, portLines + suffix))
        }

        if (deps && deps.major > 0) {
          console.log(`${symbols.warning} ${deps.major} major update(s) available`)
        }
      })
  },
})
