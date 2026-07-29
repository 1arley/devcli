import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@dev-cli/core'
import { createTable, symbols, banner } from '@dev-cli/ui'
import chalk from 'chalk'
import { execSync } from 'node:child_process'

function git(args: string): string {
  try {
    return execSync(`git ${args}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch {
    return ''
  }
}

function isRepo(): boolean {
  return git('rev-parse --is-inside-work-tree') === 'true'
}

const manifest = {
  name: 'git',
  description: 'Inspect Git branch, status, stashes, and more',
  version: '0.0.0',
  keywords: ['git', 'branch', 'status', 'stash', 'vcs'],
  category: 'git' as const,
}

export const createGitPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      const gitCmd = program.command('git').description(manifest.description)

      gitCmd.action(() => {
        if (!isRepo()) {
          console.log(`${symbols.error} Not a Git repository`)
          return
        }
        const branch = git('rev-parse --abbrev-ref HEAD')
        const ahead = git('rev-list --count @{u}..HEAD') || '0'
        const behind = git('rev-list --count HEAD..@{u}') || '0'
        const stashCount = git('stash list').split('\n').filter(Boolean).length
        const modified = git('status --porcelain').split('\n').filter(Boolean).length

        console.log(banner('Git Status'))
        console.log(`  ${chalk.bold('Branch'.padEnd(12))} ${chalk.cyan(branch)}`)
        console.log(`  ${chalk.bold('Ahead'.padEnd(12))} ${ahead}`)
        console.log(`  ${chalk.bold('Behind'.padEnd(12))} ${behind}`)
        console.log(`  ${chalk.bold('Stashes'.padEnd(12))} ${stashCount}`)
        console.log(`  ${chalk.bold('Modified'.padEnd(12))} ${modified}`)
      })

      gitCmd
        .command('branches')
        .description('List all branches with tracking info')
        .action(() => {
          if (!isRepo()) {
            console.log(`${symbols.error} Not a Git repository`)
            return
          }
          const output = git('branch -vv')
          const rows = output
            .split('\n')
            .filter(Boolean)
            .map((line) => {
              const current = line.startsWith('*')
              const name = line.replace('*', '').trim().split(/\s+/)[0] ?? ''
              return {
                Current: current ? '✓' : '',
                Branch: name,
                Detail: line.trim().slice(name.length).trim(),
              }
            })
          const table = createTable(['Current', 'Branch', 'Detail'], rows)
          console.log(table.toString())
        })

      gitCmd
        .command('status')
        .description('Show working tree status')
        .action(() => {
          if (!isRepo()) {
            console.log(`${symbols.error} Not a Git repository`)
            return
          }
          const output = git('status --porcelain')
          if (!output.trim()) {
            console.log(`${symbols.success} Working tree clean`)
            return
          }
          const rows = output
            .split('\n')
            .filter(Boolean)
            .map((line) => {
              const status = line.slice(0, 2)
              const file = line.slice(3)
              return { Status: status, File: file }
            })
          const table = createTable(['Status', 'File'], rows)
          console.log(table.toString())
        })

      gitCmd
        .command('log [count]')
        .description('Show recent commits')
        .action((count: number = 10) => {
          if (!isRepo()) {
            console.log(`${symbols.error} Not a Git repository`)
            return
          }
          const output = git(`log --oneline -${count}`)
          console.log(output)
        })

      gitCmd
        .command('stash')
        .description('List stashes')
        .action(() => {
          if (!isRepo()) {
            console.log(`${symbols.error} Not a Git repository`)
            return
          }
          const output = git('stash list')
          if (!output.trim()) {
            console.log(`${symbols.success} No stashes`)
            return
          }
          output.split('\n').forEach((line) => console.log(`  ${chalk.gray(line)}`))
        })
    },
  }
}
