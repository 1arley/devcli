import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { symbols } from '@devcli/ui'

function tryParse(input: string): unknown | null {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

function readInput(): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      resolve('')
      return
    }
    let data = ''
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', (chunk) => (data += chunk))
    process.stdin.on('end', () => resolve(data))
  })
}

function yamlToJsonObject(yamlStr: string): Record<string, unknown> {
  const lines = yamlStr.split('\n').filter((l) => l.trim() && !l.startsWith('#'))
  const result: Record<string, unknown> = {}
  let currentKey = ''

  for (const line of lines) {
    const match = line.match(/^(\s*)([\w-]+):\s*(.*)$/)
    if (!match) continue
    const [, indent, key, value] = match
    if (indent === '' || indent === undefined) {
      if (!value) {
        currentKey = key ?? ''
        result[currentKey] = {}
      } else {
        result[key ?? ''] = parseYamlValue(value ?? '')
      }
    } else if (currentKey) {
      const target = result[currentKey]
      if (typeof target === 'object' && target !== null) {
        ;(target as Record<string, unknown>)[key ?? ''] = parseYamlValue(value ?? '')
      }
    }
  }

  return result
}

function parseYamlValue(value: string): unknown {
  const v = value.trim().replace(/^['"]|['"]$/g, '')
  if (v === 'true') return true
  if (v === 'false') return false
  if (v === 'null' || v === '~') return null
  if (/^-?\d+$/.test(v)) return parseInt(v, 10)
  if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v)
  return v
}

function jsonToYamlInner(obj: unknown, indent: number = 0): string {
  const pad = '  '.repeat(indent)
  if (obj === null || obj === undefined) return 'null'
  if (typeof obj !== 'object') return String(obj)
  if (Array.isArray(obj)) {
    return obj.map((item) => `${pad}- ${jsonToYamlInner(item, indent + 1)}`).join('\n')
  }
  const entries = Object.entries(obj as Record<string, unknown>)
  return entries
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${pad}${key}:\n${jsonToYamlInner(value, indent + 1)}`
      }
      return `${pad}${key}: ${jsonToYamlInner(value, indent + 1)}`
    })
    .join('\n')
}

const manifest = {
  name: 'json',
  description: 'Format, minify, validate, and convert JSON',
  version: '0.0.0',
  keywords: ['json', 'format', 'minify', 'validate', 'yaml'],
  category: 'data' as const,
}

export const createJsonPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      const json = program.command('json').description(manifest.description)

      json
        .command('format [file]')
        .description('Pretty-print JSON from file or stdin')
        .option('-i, --indent <n>', 'Indentation spaces', '2')
        .action(async (file?: string, options?: { indent?: string }) => {
          const input = file
            ? (await import('node:fs/promises')).readFile(file, 'utf-8')
            : readInput()
          const content = await input
          const parsed = tryParse(content)
          if (parsed === null) {
            console.log(`${symbols.error} Invalid JSON`)
            return
          }
          const indent = parseInt(options?.indent ?? '2', 10)
          console.log(JSON.stringify(parsed, null, indent))
        })

      json
        .command('minify [file]')
        .description('Minify JSON from file or stdin')
        .action(async (file?: string) => {
          const input = file
            ? (await import('node:fs/promises')).readFile(file, 'utf-8')
            : readInput()
          const content = await input
          const parsed = tryParse(content)
          if (parsed === null) {
            console.log(`${symbols.error} Invalid JSON`)
            return
          }
          console.log(JSON.stringify(parsed))
        })

      json
        .command('validate [file]')
        .description('Validate JSON from file or stdin')
        .action(async (file?: string) => {
          const input = file
            ? (await import('node:fs/promises')).readFile(file, 'utf-8')
            : readInput()
          const content = await input
          const parsed = tryParse(content)
          if (parsed === null) {
            console.log(`${symbols.error} Invalid JSON`)
            process.exitCode = 1
            return
          }
          console.log(`${symbols.success} Valid JSON`)
        })

      json
        .command('to-yaml [file]')
        .description('Convert JSON to YAML')
        .action(async (file?: string) => {
          const input = file
            ? (await import('node:fs/promises')).readFile(file, 'utf-8')
            : readInput()
          const content = await input
          const parsed = tryParse(content)
          if (parsed === null) {
            console.log(`${symbols.error} Invalid JSON`)
            return
          }
          console.log(jsonToYamlInner(parsed))
        })

      json
        .command('from-yaml [file]')
        .description('Convert YAML to JSON')
        .action(async (file?: string) => {
          const input = file
            ? (await import('node:fs/promises')).readFile(file, 'utf-8')
            : readInput()
          const content = await input
          const parsed = yamlToJsonObject(content)
          console.log(JSON.stringify(parsed, null, 2))
        })
    },
  }
}
