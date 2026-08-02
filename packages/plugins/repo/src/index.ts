import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { infoBox, banner, createTable, symbols } from '@devcli/ui'
import chalk from 'chalk'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

interface RepoAnalysis {
  framework: string
  language: string
  packageManager: string
  dependencies: number
  devDependencies: number
  architecture: string
  files: number
}

function readJson(filePath: string): Record<string, unknown> | null {
  if (!existsSync(filePath)) return null
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

function detectFramework(pkg: Record<string, unknown>): string {
  const deps = {
    ...((pkg['dependencies'] as Record<string, string>) ?? {}),
    ...((pkg['devDependencies'] as Record<string, string>) ?? {}),
  }
  if (deps['next']) return 'Next.js'
  if (deps['nuxt']) return 'Nuxt'
  if (deps['@remix-run/react']) return 'Remix'
  if (deps['@nestjs/core']) return 'NestJS'
  if (deps['express']) return 'Express'
  if (deps['fastify']) return 'Fastify'
  if (deps['ink']) return 'Ink'
  if (deps['react']) return 'React'
  if (deps['vue']) return 'Vue'
  if (deps['svelte']) return 'Svelte'
  if (deps['astro']) return 'Astro'
  if (deps['@angular/core']) return 'Angular'
  if (deps['oclif']) return 'oclif'
  if (deps['yargs']) return 'Yargs'
  if (deps['commander'] || deps['Commander']) return 'Commander.js'
  if (deps['inquirer']) return 'Inquirer'
  return 'Unknown'
}

function collectWorkspacePackages(cwd: string): Record<string, unknown>[] {
  const workspaceFiles = [
    join(cwd, 'pnpm-workspace.yaml'),
    join(cwd, 'pnpm-workspace.yml'),
    join(cwd, 'lerna.json'),
    join(cwd, 'turbo.json'),
    join(cwd, 'package.json'),
  ]

  const patterns: string[] = []

  for (const wf of workspaceFiles) {
    if (!existsSync(wf)) continue
    const basename = wf.split('/').pop()!

    if (basename === 'pnpm-workspace.yaml' || basename === 'pnpm-workspace.yml') {
      const content = readFileSync(wf, 'utf-8')
      for (const line of content.split('\n')) {
        const m = line.match(/^\s*-\s+['"]?([^'"#]+?)['"]?\s*$/)
        if (m && m[1]) patterns.push(m[1].trim())
      }
    } else if (basename === 'lerna.json') {
      const lerna = readJson(wf)
      const pkgs = (lerna?.['packages'] as string[]) ?? []
      patterns.push(...pkgs)
    } else if (basename === 'turbo.json') {
      // turbo doesn't define packages itself — fall back to common patterns
      patterns.push('packages/*')
    } else if (basename === 'package.json') {
      const rootPkg = readJson(wf)
      const workspaces = (rootPkg?.['workspaces'] as string[] | { packages?: string[] }) ?? null
      if (!workspaces) continue
      if (Array.isArray(workspaces)) patterns.push(...workspaces)
      else if (workspaces.packages) patterns.push(...workspaces.packages)
    }
  }

  if (patterns.length === 0) return []

  const allPackages: Record<string, unknown>[] = []
  const seen = new Set<string>()

  for (const pattern of patterns) {
    const parent = pattern.includes('/') ? pattern.slice(0, pattern.lastIndexOf('/')) : '.'
    const matcher = pattern.includes('/') ? pattern.slice(pattern.lastIndexOf('/') + 1) : pattern

    const parentDir = join(cwd, parent)
    if (!existsSync(parentDir)) continue

    let entries: string[] = []
    try {
      entries = readdirSync(parentDir)
    } catch {
      continue
    }

    for (const entry of entries) {
      try {
        if (!statSync(join(parentDir, entry)).isDirectory()) continue
      } catch {
        continue
      }
      if (matcher === '*') {
        const pkgPath = join(parentDir, entry, 'package.json')
        if (existsSync(pkgPath)) {
          const resolved = join(parentDir, entry)
          if (seen.has(resolved)) continue
          seen.add(resolved)
          const p = readJson(pkgPath)
          if (p) allPackages.push(p)
        }
      } else if (matcher === '**' || matcher === '*/*') {
        // one level deeper
        const subDir = join(parentDir, entry)
        let subEntries: string[] = []
        try {
          subEntries = readdirSync(subDir)
        } catch {
          continue
        }
        for (const sub of subEntries) {
          const pkgPath = join(subDir, sub, 'package.json')
          if (existsSync(pkgPath)) {
            const resolved = join(subDir, sub)
            if (seen.has(resolved)) continue
            seen.add(resolved)
            const p = readJson(pkgPath)
            if (p) allPackages.push(p)
          }
        }
      }
    }
  }

  return allPackages
}

function detectFrameworkMonorepo(cwd: string): string {
  const allDeps: Record<string, string> = {}
  const allDevDeps: Record<string, string> = {}

  const rootPkg = readJson(join(cwd, 'package.json'))
  if (rootPkg) {
    Object.assign(allDeps, rootPkg['dependencies'] ?? {})
    Object.assign(allDevDeps, rootPkg['devDependencies'] ?? {})
  }

  for (const pkg of collectWorkspacePackages(cwd)) {
    Object.assign(allDeps, pkg['dependencies'] ?? {})
    Object.assign(allDevDeps, pkg['devDependencies'] ?? {})
  }

  return detectFramework({ dependencies: allDeps, devDependencies: allDevDeps })
}

function detectLanguage(cwd: string): string {
  if (existsSync(join(cwd, 'tsconfig.json'))) return 'TypeScript'
  if (existsSync(join(cwd, 'package.json'))) return 'JavaScript'
  if (existsSync(join(cwd, 'go.mod'))) return 'Go'
  if (existsSync(join(cwd, 'Cargo.toml'))) return 'Rust'
  if (existsSync(join(cwd, 'pom.xml'))) return 'Java'
  if (existsSync(join(cwd, 'build.gradle'))) return 'Java/Kotlin'
  if (existsSync(join(cwd, 'requirements.txt')) || existsSync(join(cwd, 'pyproject.toml')))
    return 'Python'
  if (existsSync(join(cwd, 'composer.json'))) return 'PHP'
  if (existsSync(join(cwd, 'Gemfile'))) return 'Ruby'
  return 'Unknown'
}

function detectPackageManager(cwd: string): string {
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn'
  if (existsSync(join(cwd, 'bun.lockb')) || existsSync(join(cwd, 'bun.lock'))) return 'bun'
  if (existsSync(join(cwd, 'package-lock.json'))) return 'npm'
  if (existsSync(join(cwd, 'go.mod'))) return 'go modules'
  if (existsSync(join(cwd, 'Cargo.toml'))) return 'cargo'
  if (existsSync(join(cwd, 'composer.json'))) return 'composer'
  return 'unknown'
}

function detectArchitecture(cwd: string): string {
  const hasMonorepo =
    existsSync(join(cwd, 'pnpm-workspace.yaml')) ||
    existsSync(join(cwd, 'lerna.json')) ||
    existsSync(join(cwd, 'turbo.json'))
  if (hasMonorepo) return 'Monorepo'

  const dirs = readdirSync(cwd).filter((d) => {
    try {
      return statSync(join(cwd, d)).isDirectory() && !d.startsWith('.') && d !== 'node_modules'
    } catch {
      return false
    }
  })

  const hasSrc = dirs.includes('src')
  const hasLib = dirs.includes('lib')
  const hasTests = dirs.includes('tests') || dirs.includes('test')
  const hasPackages = dirs.includes('packages')

  if (hasSrc && hasTests) return 'src/ with tests'
  if (hasSrc) return 'src/'
  if (hasLib) return 'lib/'
  if (hasPackages) return 'packages/'
  return 'flat'
}

function countFiles(dir: string, ext: string[], depth: number = 0): number {
  let count = 0
  function walk(d: string, dep: number) {
    if (dep > 20) return
    const entries = readdirSync(d)
    for (const entry of entries) {
      const path = join(d, entry)
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue
      try {
        const stat = statSync(path)
        if (stat.isDirectory()) {
          walk(path, dep + 1)
        } else if (ext.some((e) => entry.endsWith(e))) {
          count++
        }
      } catch {
        continue
      }
    }
  }
  try {
    walk(dir, depth)
  } catch {
    /* ignore */
  }
  return count
}

function analyze(cwd: string = process.cwd()): RepoAnalysis {
  const pkg = readJson(join(cwd, 'package.json'))

  const allDeps: Record<string, unknown> = {}
  const allDevDeps: Record<string, unknown> = {}
  const collectDeps = (p: Record<string, unknown> | null) => {
    if (!p) return
    const d = (p['dependencies'] as Record<string, unknown>) ?? {}
    const dd = (p['devDependencies'] as Record<string, unknown>) ?? {}
    Object.assign(allDeps, d)
    Object.assign(allDevDeps, dd)
  }

  collectDeps(pkg)
  for (const wp of collectWorkspacePackages(cwd)) collectDeps(wp)

  return {
    framework: detectFrameworkMonorepo(cwd),
    language: detectLanguage(cwd),
    packageManager: detectPackageManager(cwd),
    dependencies: Object.keys(allDeps).length,
    devDependencies: Object.keys(allDevDeps).length,
    architecture: detectArchitecture(cwd),
    files: countFiles(cwd, ['.ts', '.tsx', '.js', '.jsx', '.json'], 0),
  }
}

function getDependencyTree(cwd: string): { name: string; deps: Record<string, string> }[] {
  const rootPkg = readJson(join(cwd, 'package.json'))
  if (!rootPkg) return []

  const entries: { name: string; deps: Record<string, string> }[] = []
  const rootName = (rootPkg['name'] as string) ?? 'root'
  const rootDeps = (rootPkg['dependencies'] as Record<string, string>) ?? {}
  entries.push({ name: rootName, deps: rootDeps })

  for (const wp of collectWorkspacePackages(cwd)) {
    const name = (wp['name'] as string) ?? 'unknown'
    const deps = (wp['dependencies'] as Record<string, string>) ?? {}
    entries.push({ name, deps })
  }
  return entries
}

function printDepTree(
  entries: { name: string; deps: Record<string, string> }[],
  indent: string = '',
): void {
  for (const entry of entries) {
    const depCount = Object.keys(entry.deps).length
    console.log(`${indent}${chalk.cyan(entry.name)} ${chalk.dim(`(${depCount} deps)`)}`)
    for (const [dep, ver] of Object.entries(entry.deps).slice(0, 20)) {
      console.log(`${indent}  ${chalk.dim('└─')} ${dep}${chalk.gray(`@${ver}`)}`)
    }
    if (Object.keys(entry.deps).length > 20) {
      console.log(`${indent}  ${chalk.dim(`... and ${Object.keys(entry.deps).length - 20} more`)}`)
    }
  }
}

interface BundleEntry {
  file: string
  size: number
  sizeLabel: string
}

function analyzeBundle(dir: string): BundleEntry[] {
  const distDir = join(dir, 'dist')
  if (!existsSync(distDir)) return []

  const results: BundleEntry[] = []

  function walk(d: string) {
    const entries = readdirSync(d)
    for (const entry of entries) {
      const path = join(d, entry)
      try {
        const stat = statSync(path)
        if (stat.isDirectory()) {
          walk(path)
        } else if (entry.endsWith('.js') || entry.endsWith('.mjs') || entry.endsWith('.cjs')) {
          const sizeKB = stat.size / 1024
          const label =
            sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${sizeKB.toFixed(1)} KB`
          results.push({
            file: path.replace(distDir, '').replace(/^\//, ''),
            size: stat.size,
            sizeLabel: label,
          })
        }
      } catch {
        /* skip */
      }
    }
  }

  try {
    walk(distDir)
  } catch {
    /* skip */
  }
  results.sort((a, b) => b.size - a.size)
  return results
}

const manifest = {
  name: 'repo',
  description: 'Analyze a project: framework, language, dependencies, architecture',
  version: '0.0.0',
  keywords: ['repo', 'analyze', 'framework', 'project', 'inspect'],
  category: 'dev' as const,
}

export const createRepoPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      const repo = program.command('repo').description(manifest.description)

      repo.argument('[path]', 'Project path', process.cwd()).action((path: string) => {
        const result = analyze(path)
        console.log(banner('Repo Analysis', path))
        console.log(
          infoBox(
            'Overview',
            [
              `${chalk.bold('Framework'.padEnd(18))} ${result.framework}`,
              `${chalk.bold('Language'.padEnd(18))} ${result.language}`,
              `${chalk.bold('Package Manager'.padEnd(18))} ${result.packageManager}`,
              `${chalk.bold('Architecture'.padEnd(18))} ${result.architecture}`,
              `${chalk.bold('Dependencies'.padEnd(18))} ${result.dependencies}`,
              `${chalk.bold('Dev Dependencies'.padEnd(18))} ${result.devDependencies}`,
              `${chalk.bold('Source Files'.padEnd(18))} ${result.files}`,
            ].join('\n'),
          ),
        )
      })

      repo
        .command('deps [path]')
        .description('Show dependency tree for the project')
        .action((path: string = process.cwd()) => {
          const tree = getDependencyTree(path)
          if (tree.length === 0) {
            console.log(`${symbols.error} No package.json found at ${path}`)
            return
          }
          console.log(banner('Dependency Tree', path))
          printDepTree(tree)
        })

      repo
        .command('bundle [path]')
        .description('Analyze bundle size (dist/ directory)')
        .action((path: string = process.cwd()) => {
          const bundles = analyzeBundle(path)
          if (bundles.length === 0) {
            console.log(`${symbols.info} No dist/ directory found at ${path}`)
            return
          }
          console.log(banner('Bundle Analysis', path))
          const table = createTable(
            ['File', 'Size'],
            bundles.slice(0, 30).map((b) => ({
              File: b.file,
              Size:
                b.size > 1024 * 1024
                  ? chalk.red(b.sizeLabel)
                  : b.size > 100 * 1024
                    ? chalk.yellow(b.sizeLabel)
                    : chalk.green(b.sizeLabel),
            })),
          )
          console.log(table.toString())
          const totalSize = bundles.reduce((sum, b) => sum + b.size, 0)
          const totalLabel =
            totalSize > 1024 * 1024
              ? `${(totalSize / (1024 * 1024)).toFixed(2)} MB`
              : `${(totalSize / 1024).toFixed(1)} KB`
          console.log(`\n${chalk.bold('Total:')} ${totalLabel} (${bundles.length} files)`)
          if (bundles.length > 30) {
            console.log(chalk.dim(`... and ${bundles.length - 30} more files`))
          }
        })
    },
  }
}
