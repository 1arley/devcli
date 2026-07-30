import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { symbols } from '@devcli/ui'
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

interface CommitEntry {
  hash: string
  author: string
  date: string
  message: string
  body: string
}

function getCommits(since: string, author?: string): CommitEntry[] {
  const authorFilter = author ? `--author=${author}` : ''
  const log = git(
    `log --since="${since}" ${authorFilter} --format="%h|||%an|||%ai|||%s|||%b===" --no-merges`,
  )
  if (!log) return []
  return log
    .split('===')
    .filter(Boolean)
    .map((block) => {
      const [hash, author, date, message, body = ''] = block.trim().split('|||')
      return {
        hash: hash ?? '',
        author: author ?? '',
        date: date ?? '',
        message: message ?? '',
        body: body.trim(),
      }
    })
    .filter((e) => e.hash)
}

function groupByAuthor(commits: CommitEntry[]): Map<string, CommitEntry[]> {
  const groups = new Map<string, CommitEntry[]>()
  for (const c of commits) {
    const existing = groups.get(c.author) ?? []
    existing.push(c)
    groups.set(c.author, existing)
  }
  return groups
}

function formatMarkdown(commits: CommitEntry[], projectName: string, since: string): string {
  const groups = groupByAuthor(commits)
  const lines: string[] = []
  lines.push(`# Standup — ${projectName}`)
  lines.push(
    `\n_${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}_`,
  )
  lines.push(`\nSince: ${since}\n`)
  lines.push(`**${commits.length}** commits by **${groups.size}** contributor(s)\n`)

  for (const [author, entries] of groups) {
    lines.push(`## ${author}`)
    for (const c of entries) {
      const scope = c.message.match(/\(([^)]+)\)/)
      const type = c.message.split(/[(:]/)[0]?.trim() ?? ''
      const desc = c.message.replace(/^(\w+)(\([^)]+\))?:\s*/, '').trim()
      const badge = getTypeBadge(type)
      const scopeStr = scope ? `**${scope[1]}**` : ''
      lines.push(`- ${badge} ${scopeStr} ${desc} (\`${c.hash}\`)`)
      if (c.body) lines.push(`  - ${c.body.split('\n')[0]}`)
    }
    lines.push('')
  }

  lines.push('---')
  const types = [
    ...new Set(commits.map((c) => c.message.split(/[(:]/)[0]?.trim() ?? '').filter(Boolean)),
  ]
  if (types.length > 0) lines.push(`\nCategories: ${types.join(', ')}`)
  return lines.join('\n')
}

function getTypeBadge(type: string): string {
  const badges: Record<string, string> = {
    feat: '✨',
    fix: '🐛',
    docs: '📝',
    style: '💄',
    refactor: '♻️',
    perf: '⚡',
    test: '✅',
    chore: '🔧',
    ci: '👷',
    build: '📦',
  }
  return chalk.cyan(badges[type] ?? '🔹')
}

const manifest = {
  name: 'standup',
  description: 'Generate markdown standup notes from git commits',
  version: '0.0.0',
  keywords: ['standup', 'git', 'report', 'daily', 'commits'],
  category: 'git' as const,
}

export const createStandupPlugin: PluginFactory = (): Plugin => ({
  manifest,
  register(program: Command) {
    program
      .command('standup')
      .description(manifest.description)
      .option('-s, --since <time>', 'Time range', 'yesterday')
      .option('-a, --author <name>', 'Filter by author')
      .option('--json', 'Output as JSON')
      .action((options: { since: string; author?: string; json?: boolean }) => {
        if (!isRepo()) {
          console.log(`${symbols.error} Not a Git repository`)
          return
        }
        const projectName = git('rev-parse --show-toplevel').split('/').pop() ?? 'unknown'
        const commits = getCommits(options.since, options.author)

        if (commits.length === 0) {
          console.log(`${symbols.info} No commits since "${options.since}"`)
          return
        }

        if (options.json) {
          console.log(JSON.stringify(commits, null, 2))
          return
        }

        console.log(formatMarkdown(commits, projectName, options.since))
      })
  },
})
