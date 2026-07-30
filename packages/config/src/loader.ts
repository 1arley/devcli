import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { DevCliConfigSchema, type DevCliConfig } from './schema.js'

const CONFIG_FILE = '.devclirc.json'

/** Keys under these dotted paths hold free-form strings (API keys, models, URLs, names).
 *  They MUST be preserved verbatim: coercing them would mangle keys like "true",
 *  "null", or numeric-only tokens. */
const STRING_KEYS = new Set([
  'ai.provider',
  'ai.apiKey',
  'ai.model',
  'ai.baseUrl',
  'defaults.editor',
  'defaults.shell',
  'defaults.theme',
  'docker.socket',
])

function getConfigPath(cwd: string = process.cwd()): string {
  const local = join(cwd, CONFIG_FILE)
  if (existsSync(local)) return local
  return join(process.env['HOME'] ?? '', CONFIG_FILE)
}

export async function loadConfig(cwd: string = process.cwd()): Promise<DevCliConfig> {
  const configPaths = [join(cwd, CONFIG_FILE), join(process.env['HOME'] ?? '', CONFIG_FILE)]

  for (const p of configPaths) {
    if (!existsSync(p)) continue
    try {
      const content = await readFile(p, 'utf-8')
      const parsed = JSON.parse(content)
      return DevCliConfigSchema.parse(parsed)
    } catch {
      continue
    }
  }

  return DevCliConfigSchema.parse({})
}

/**
 * Persist a single dotted config key. The value is written verbatim as a string
 * by default. For keys known to be free-form strings (ai.apiKey, ai.model, etc.)
 * the value is ALWAYS preserved verbatim to avoid mangling keys such as "true",
 * "null", or numeric-only tokens.
 *
 * @param coerce When true, attempt JSON-ish coercion of the value before writing
 *   (booleans, null, integers, decimals). Only honoured for keys not in
 *   {@link STRING_KEYS}. Off by default.
 */
export async function writeConfig(
  key: string,
  value: string,
  cwd: string = process.cwd(),
  coerce: boolean = false,
): Promise<void> {
  const configPath = getConfigPath(cwd)
  let config: Record<string, unknown> = {}

  if (existsSync(configPath)) {
    try {
      config = JSON.parse(await readFile(configPath, 'utf-8'))
    } catch {
      /* start fresh */
    }
  }

  const keys = key.split('.')
  let current = config
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]!
    if (typeof current[k] !== 'object' || current[k] === null) current[k] = {}
    current = current[k] as Record<string, unknown>
  }
  const lastKey = keys[keys.length - 1]!

  let parsed: unknown = value
  if (coerce && !STRING_KEYS.has(key)) {
    if (value === 'true') parsed = true
    else if (value === 'false') parsed = false
    else if (value === 'null') parsed = null
    else if (/^-?\d+$/.test(value)) parsed = parseInt(value, 10)
    else if (/^-?\d+\.\d+$/.test(value)) parsed = parseFloat(value)
  }
  current[lastKey] = parsed

  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n')
}
