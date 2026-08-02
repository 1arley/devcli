import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { createTable, symbols, withSpinner } from '@devcli/ui'
import chalk from 'chalk'
import { readdirSync, statSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

interface DirInfo {
  path: string
  sizeBytes: number
  sizeLabel: string
}

const TARGETS = [
  'node_modules',
  'dist',
  '.next',
  'build',
  'out',
  '.turbo',
  '.cache',
  '.nyc_output',
  'coverage',
  '.parcel-cache',
  '.eslintcache',
  'tsconfig.tsbuildinfo',
]

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function dirSize(dir: string): number {
  let size = 0
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const path = join(dir, entry)
      try {
        const stat = statSync(path)
        if (stat.isDirectory()) {
          if (entry === 'node_modules') {
            size += dirSizeQuick(path)
          } else {
            size += dirSize(path)
          }
        } else {
          size += stat.size
        }
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
  return size
}

function dirSizeQuick(dir: string): number {
  try {
    const out = execSync(`du -sb "${dir}" 2>/dev/null`, { encoding: 'utf-8' }).trim()
    const size = parseInt(out.split(/\s+/)[0] ?? '0', 10)
    if (size > 0) return size
  } catch {
    /* fall through to recursive walk */
  }
  return dirSize(dir)
}

function findTargets(root: string): DirInfo[] {
  const results: DirInfo[] = []
  function walk(dir: string, depth: number = 0) {
    if (depth > 4) return
    let entries: string[] = []
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      const path = join(dir, entry)
      if (entry.startsWith('.') && entry !== '.next' && entry !== '.turbo' && entry !== '.cache')
        continue
      try {
        if (!statSync(path).isDirectory()) continue
      } catch {
        continue
      }
      if (TARGETS.includes(entry)) {
        const size = entry === 'node_modules' ? dirSizeQuick(path) : dirSize(path)
        results.push({ path, sizeBytes: size, sizeLabel: formatSize(size) })
      } else if (entry !== 'node_modules') {
        walk(path, depth + 1)
      }
    }
  }
  walk(root)
  return results.sort((a, b) => b.sizeBytes - a.sizeBytes)
}

const manifest = {
  name: 'clean',
  description: 'Find and remove build artifacts, node_modules, and caches',
  version: '0.0.0',
  keywords: ['clean', 'prune', 'artifacts', 'disk', 'cache'],
  category: 'utility' as const,
}

export const createCleanPlugin: PluginFactory = (): Plugin => ({
  manifest,
  register(program: Command) {
    program
      .command('clean')
      .description(manifest.description)
      .option('-d, --dry-run', 'List files without deleting')
      .option('-f, --force', 'Skip confirmation')
      .option('--targets <items>', 'Comma-separated target dirs')
      .option('-p, --path <dir>', 'Root directory', process.cwd())
      .action((options: { dryRun?: boolean; force?: boolean; targets?: string; path: string }) => {
        const targets = options.targets ? options.targets.split(',').map((s) => s.trim()) : TARGETS
        const dirs = findTargets(options.path)
        const filtered = dirs.filter((d) => targets.some((t) => d.path.endsWith(t)))

        if (filtered.length === 0) {
          console.log(`${symbols.success} Nothing to clean`)
          return
        }

        const totalSize = filtered.reduce((s, d) => s + d.sizeBytes, 0)

        if (options.dryRun) {
          console.log(chalk.bold(`\nFound ${filtered.length} target(s), ${formatSize(totalSize)}`))
          const rows = filtered.slice(0, 30).map((d) => ({
            Directory: d.path.replace(options.path, '.').slice(0, 60),
            Size:
              d.sizeBytes > 100 * 1024 * 1024
                ? chalk.red(d.sizeLabel)
                : d.sizeBytes > 10 * 1024 * 1024
                  ? chalk.yellow(d.sizeLabel)
                  : d.sizeLabel,
          }))
          const table = createTable(['Directory', 'Size'], rows)
          console.log(table.toString())
          if (filtered.length > 30) console.log(chalk.dim(`... and ${filtered.length - 30} more`))
          return
        }

        const proceed = options.force
        if (!proceed) {
          console.log(
            `${symbols.warning} Will delete ${filtered.length} target(s) (${formatSize(totalSize)})`,
          )
          console.log(
            `${symbols.info} Use ${chalk.cyan('--force')} to confirm, or ${chalk.cyan('--dry-run')} to preview`,
          )
          return
        }

        const deleted = withSpinner(`Cleaning ${filtered.length} target(s)...`, async () => {
          let count = 0
          for (const d of filtered) {
            try {
              rmSync(d.path, { recursive: true, force: true })
              count++
            } catch {
              /* skip */
            }
          }
          return count
        })

        deleted.then((count) => {
          console.log(
            `${symbols.success} Removed ${count} target(s), freed ${formatSize(totalSize)}`,
          )
        })
      })
  },
})
