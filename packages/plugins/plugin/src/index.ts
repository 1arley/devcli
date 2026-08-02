import { Command } from 'commander'
import type { Plugin, PluginFactory, PluginRegistry } from '@devcli/core'
import { exec } from '@devcli/core'
import { createTable, symbols, withSpinner } from '@devcli/ui'
import chalk from 'chalk'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

const PLUGIN_PREFIX = '@devcli/plugin-'

function searchNpm(query: string): { name: string; description: string; version: string }[] {
  const output = exec('npm', ['search', query, '--json'], { timeout: 10000 })
  if (!output) return []
  try {
    const results = JSON.parse(output)
    if (!Array.isArray(results)) return []
    return results
      .filter((r: { name?: string }) => r.name?.startsWith(PLUGIN_PREFIX))
      .map((r: { name?: string; description?: string; version?: string }) => ({
        name: r.name ?? 'unknown',
        description: r.description ?? '',
        version: r.version ?? '0.0.0',
      }))
  } catch {
    return []
  }
}

function getInstalledPlugins(
  registry: PluginRegistry,
): { name: string; version: string; description: string }[] {
  return registry.all().map((p) => {
    const m = p.manifest
    return { name: m.name, version: m.version, description: m.description }
  })
}

function findProjectRoot(start: string): string | null {
  let dir = start
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
  return null
}

function toPascalCase(name: string): string {
  return name
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('')
}

function validatePluginName(name: string): string | null {
  const stripped = name.startsWith(PLUGIN_PREFIX) ? name.slice(PLUGIN_PREFIX.length) : name
  if (!/^[a-z][a-z0-9-]*$/.test(stripped)) return null
  return stripped
}

function generateScaffold(root: string, pluginName: string) {
  const dir = join(root, 'packages', 'plugins', pluginName)
  if (existsSync(dir)) return `Plugin directory already exists: ${dir}`

  mkdirSync(join(dir, 'src'), { recursive: true })
  const pkg = join(dir, 'package.json')
  const tsconfig = join(dir, 'tsconfig.json')
  const tsup = join(dir, 'tsup.config.ts')
  const src = join(dir, 'src', 'index.ts')

  const fullPackageName = `${PLUGIN_PREFIX}${pluginName}`
  const pascalName = toPascalCase(pluginName)

  writeFileSync(
    pkg,
    JSON.stringify(
      {
        name: fullPackageName,
        version: '0.0.0',
        description: `Dev CLI ${pluginName} plugin`,
        type: 'module',
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        exports: { '.': { import: './dist/index.js', types: './dist/index.d.ts' } },
        scripts: {
          build: 'tsup',
          dev: 'tsup --watch',
          typecheck: 'tsc --noEmit',
          clean: 'rm -rf dist',
        },
        dependencies: {
          '@devcli/core': 'workspace:*',
          '@devcli/ui': 'workspace:*',
          chalk: '^5.3.0',
          commander: '^12.1.0',
        },
        devDependencies: {
          tsup: '^8.3.0',
          typescript: '^5.6.0',
        },
      },
      null,
      2,
    ) + '\n',
  )

  writeFileSync(
    tsconfig,
    `{\n  "extends": "../../../tsconfig.base.json",\n  "compilerOptions": {\n    "composite": true\n  },\n  "include": ["src"]\n}\n`,
  )
  writeFileSync(
    tsup,
    `import { defineConfig } from 'tsup'\n\nexport default defineConfig({\n  entry: ['src/index.ts'],\n  format: ['esm'],\n  dts: true,\n  clean: true,\n  sourcemap: true,\n  treeshake: true,\n})\n`,
  )
  writeFileSync(
    src,
    `import { Command } from 'commander'\nimport type { Plugin, PluginFactory } from '@devcli/core'\nimport { symbols } from '@devcli/ui'\nimport chalk from 'chalk'\n\nconst manifest = {\n  name: '${pluginName}',\n  description: '${pluginName} plugin',\n  version: '0.0.0',\n  keywords: ['${pluginName}'],\n  category: 'dev' as const,\n}\n\nexport const create${pascalName}Plugin: PluginFactory = (): Plugin => {\n  return {\n    manifest,\n    register(program: Command) {\n      program\n        .command('${pluginName}')\n        .description(manifest.description)\n        .action(() => {\n          console.log(\`\${symbols.info} ${pluginName} command \`)\n        })\n    },\n  }\n}\n`,
  )

  return null
}

function wirePluginIntoCLI(root: string, pluginName: string): string[] {
  const errors: string[] = []
  const cliDir = join(root, 'packages', 'cli')
  const fullName = `${PLUGIN_PREFIX}${pluginName}`
  const pascal = toPascalCase(pluginName)
  const registryPath = join(cliDir, 'src', 'registry.ts')
  const pkgPath = join(cliDir, 'package.json')
  const tsupPath = join(cliDir, 'tsup.config.ts')
  const tsconfigPath = join(cliDir, 'tsconfig.json')

  // Fix registry.ts — append import after the last existing plugin import,
  // and append the entry to the end of the entries array.
  try {
    let content = readFileSync(registryPath, 'utf-8')
    const importLine = `import { create${pascal}Plugin } from '${fullName}'`
    if (!content.includes(importLine)) {
      content = content.replace(
        /(import \{ createPluginPluginFactory \} from '@devcli\/plugin-plugin'\n)/,
        `$1${importLine}\n`,
      )
      content = content.replace(
        /( {2}\['logs', createLogsPlugin\],?\n)(?! {2}\] as const)/,
        `$1  ['${pluginName}', create${pascal}Plugin],\n`,
      )
      writeFileSync(registryPath, content)
    }
  } catch {
    errors.push('registry.ts')
  }

  // Fix package.json — append after the last @devcli/plugin-* dep.
  try {
    let content = readFileSync(pkgPath, 'utf-8')
    const depLine = `"${fullName}": "workspace:*"`
    if (!content.includes(depLine)) {
      content = content.replace(
        /("@devcli\/plugin-[^"]+": "workspace:\*",\n)(?!.*"@devcli\/plugin-)/s,
        `$1    ${depLine},\n`,
      )
      writeFileSync(pkgPath, content)
    }
  } catch {
    errors.push('package.json')
  }

  // Fix tsup.config.ts — append after the last @devcli/plugin-* entry.
  try {
    let content = readFileSync(tsupPath, 'utf-8')
    const entry = `    '${fullName}',`
    if (!content.includes(entry)) {
      content = content.replace(/( {4}'@devcli\/plugin-[^']+',)(\n {2}\])/, `$1\n${entry}$2`)
      writeFileSync(tsupPath, content)
    }
  } catch {
    errors.push('tsup.config.ts')
  }

  // Fix tsconfig.json — append path mappings after the last plugin path.
  try {
    let content = readFileSync(tsconfigPath, 'utf-8')
    const pathEntry = `"@devcli/plugin-${pluginName}": ["../plugins/${pluginName}/src"]`
    const pathEntryGlob = `"@devcli/plugin-${pluginName}/*": ["../plugins/${pluginName}/src/*"]`
    if (!content.includes(pathEntry)) {
      content = content.replace(
        /("@devcli\/plugin-[^"]+": \[\.\.\/plugins\/[^/]+\/src\/\*\](,?)\n)/,
        `$1      ${pathEntry},\n      ${pathEntryGlob}\n`,
      )
      writeFileSync(tsconfigPath, content)
    }
  } catch {
    errors.push('tsconfig.json')
  }

  return errors
}

const manifest = {
  name: 'plugin',
  description: 'Manage Dev CLI plugins: list, add, remove, create',
  version: '0.0.0',
  keywords: ['plugin', 'manage', 'add', 'remove', 'install', 'create', 'scaffold'],
  category: 'dev' as const,
}

export function createPluginPluginFactory(registry: PluginRegistry): PluginFactory {
  return (): Plugin => ({
    manifest,
    register(program: Command) {
      const plugin = program.command('plugin').description(manifest.description)

      plugin
        .command('list')
        .description('List all installed plugins')
        .action(() => {
          const plugins = getInstalledPlugins(registry)
          if (plugins.length === 0) {
            console.log(`${symbols.info} No plugins installed`)
            return
          }
          const rows = plugins.map((p) => ({
            Name: p.name,
            Description: p.description,
            Version: p.version,
          }))
          const table = createTable(['Name', 'Description', 'Version'], rows)
          console.log(table.toString())
        })

      plugin
        .command('add <name>')
        .description('Search npm and install @devcli/plugin-<name>')
        .action(async (name: string) => {
          const fullName = name.startsWith(PLUGIN_PREFIX) ? name : `${PLUGIN_PREFIX}${name}`

          const found = await withSpinner(`Searching npm for ${fullName}...`, () =>
            Promise.resolve(searchNpm(name)),
          )

          const match = found.find((p) => p.name === fullName)
          if (!match) {
            console.log(`${symbols.error} Plugin ${chalk.bold(fullName)} not found on npm`)
            if (found.length > 0) {
              console.log(`  ${symbols.info} Available plugins:`)
              found.forEach((p) => console.log(`  ${chalk.cyan(p.name)} — ${p.description}`))
            }
            return
          }

          console.log(`${symbols.info} Installing ${chalk.bold(fullName)}...`)
          console.log(`  ${symbols.info} Run: ${chalk.cyan(`npm install -g ${fullName}`)}`)
          console.log(
            `  ${symbols.info} Then register in ${chalk.cyan('packages/cli/src/registry.ts')}`,
          )
        })

      plugin
        .command('remove <name>')
        .description('Uninstall a plugin')
        .action((name: string) => {
          const fullName = name.startsWith(PLUGIN_PREFIX) ? name : `${PLUGIN_PREFIX}${name}`
          console.log(`  ${symbols.info} Run: ${chalk.cyan(`npm uninstall -g ${fullName}`)}`)
          console.log(
            `  ${symbols.info} Then remove from ${chalk.cyan('packages/cli/src/registry.ts')}`,
          )
        })

      plugin
        .command('search <query>')
        .description('Search npm for available plugins')
        .action(async (query: string) => {
          const results = await withSpinner(`Searching npm for "${query}"...`, () =>
            Promise.resolve(searchNpm(query)),
          )

          if (results.length === 0) {
            console.log(`${symbols.info} No plugins found matching "${query}"`)
            return
          }
          const rows = results.map((r) => ({
            Name: r.name,
            Description: r.description.slice(0, 60),
            Version: r.version,
          }))
          const table = createTable(['Name', 'Description', 'Version'], rows)
          console.log(table.toString())
        })

      plugin
        .command('create <name>')
        .description('Scaffold a new plugin in packages/plugins/ and wire into CLI')
        .option('-d, --dir <path>', 'Project root directory', process.cwd())
        .action((name: string, options: { dir: string }) => {
          const pluginName = validatePluginName(name)
          if (!pluginName) {
            console.log(
              `${symbols.error} Invalid plugin name. Use kebab-case (e.g., ${chalk.cyan('my-plugin')})`,
            )
            return
          }

          const root = findProjectRoot(options.dir)
          if (!root) {
            console.log(
              `${symbols.error} Could not find project root (no pnpm-workspace.yaml found)`,
            )
            return
          }

          const scaffoldErr = generateScaffold(root, pluginName)
          if (scaffoldErr) {
            console.log(`${symbols.error} ${scaffoldErr}`)
            return
          }
          console.log(`${symbols.success} Created ${chalk.bold(`packages/plugins/${pluginName}/`)}`)

          const errors = wirePluginIntoCLI(root, pluginName)
          if (errors.length === 0) {
            console.log(`${symbols.success} Wired into CLI config files`)
          } else {
            console.log(
              `${symbols.warning} Partially wired. Manual edits needed in: ${errors.join(', ')}`,
            )
          }

          const fullPkg = `${PLUGIN_PREFIX}${pluginName}`
          console.log(`\n${symbols.info} Next steps:`)
          console.log(`  ${chalk.cyan(`cd packages/plugins/${pluginName}`)}`)
          console.log(`  ${chalk.cyan('pnpm install')}  (link workspace dependency)`)
          console.log(`  ${chalk.cyan(`pnpm --filter ${fullPkg} run build`)}`)
          console.log(`  ${chalk.cyan('pnpm --filter @1arley/devcli run build')}  (rebundle CLI)`)
          console.log(
            `\n${symbols.info} Edit your plugin: ${chalk.cyan(`packages/plugins/${pluginName}/src/index.ts`)}`,
          )
        })
    },
  })
}
