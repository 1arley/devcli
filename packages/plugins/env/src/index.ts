import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { createTable, symbols } from '@devcli/ui'
import chalk from 'chalk'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function parseEnvFile(content: string): Set<string> {
  const vars = new Set<string>()
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([\w.-]+)=/)
    if (match) vars.add(match[1] ?? '')
  }
  return vars
}

function loadEnv(cwd: string): { env: Set<string>; example: Set<string> } {
  const envPath = join(cwd, '.env')
  const examplePath = join(cwd, '.env.example')
  const env = existsSync(envPath) ? parseEnvFile(readFileSync(envPath, 'utf-8')) : new Set<string>()
  const example = existsSync(examplePath)
    ? parseEnvFile(readFileSync(examplePath, 'utf-8'))
    : new Set<string>()
  return { env, example }
}

const manifest = {
  name: 'env',
  description: 'Compare .env and .env.example, detect missing variables',
  version: '0.0.0',
  keywords: ['env', 'environment', 'dotenv', 'variables', 'config'],
  category: 'env' as const,
}

export const createEnvPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      const env = program.command('env').description(manifest.description)

      env.action(() => {
        const { env: envVars, example } = loadEnv(process.cwd())

        const all = new Set([...envVars, ...example])
        const rows: Record<string, string>[] = []

        for (const key of [...all].sort()) {
          rows.push({
            Variable: key,
            'In .env': envVars.has(key) ? chalk.green('✓') : chalk.red('✗'),
            'In .env.example': example.has(key) ? chalk.green('✓') : chalk.red('✗'),
          })
        }

        if (rows.length === 0) {
          console.log(`${symbols.info} No .env or .env.example found`)
          return
        }

        const table = createTable(['Variable', 'In .env', 'In .env.example'], rows)
        console.log(table.toString())

        const missingInEnv = [...example].filter((k) => !envVars.has(k))
        const missingInExample = [...envVars].filter((k) => !example.has(k))

        if (missingInEnv.length > 0) {
          console.log(
            `\n${symbols.warning} Missing in .env: ${chalk.bold(missingInEnv.join(', '))}`,
          )
        }
        if (missingInExample.length > 0) {
          console.log(
            `${symbols.warning} Missing in .env.example: ${chalk.bold(missingInExample.join(', '))}`,
          )
        }
      })

      env
        .command('missing')
        .description('Show variables in .env.example but missing from .env')
        .action(() => {
          const { env: envVars, example } = loadEnv(process.cwd())
          const missing = [...example].filter((k) => !envVars.has(k))
          if (missing.length === 0) {
            console.log(`${symbols.success} All variables defined`)
          } else {
            missing.forEach((k) => console.log(chalk.red(`  ${k}`)))
          }
        })

      env
        .command('diff')
        .description('Show diff between .env and .env.example')
        .action(() => {
          const { env: a, example: b } = loadEnv(process.cwd())

          const onlyInEnv = [...a].filter((k) => !b.has(k))
          const onlyInExample = [...b].filter((k) => !a.has(k))

          if (onlyInEnv.length === 0 && onlyInExample.length === 0) {
            console.log(`${symbols.success} .env and .env.example are in sync`)
          }

          if (onlyInEnv.length > 0) {
            console.log(chalk.yellow('Only in .env:'))
            onlyInEnv.forEach((k) => console.log(`  ${k}`))
          }

          if (onlyInExample.length > 0) {
            console.log(chalk.yellow('Only in .env.example:'))
            onlyInExample.forEach((k) => console.log(`  ${k}`))
          }
        })
    },
  }
}
