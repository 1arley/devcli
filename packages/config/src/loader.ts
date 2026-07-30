import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { DevCliConfigSchema, type DevCliConfig } from './schema.js'

const CONFIG_FILE = '.devclirc.json'

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

export async function writeConfig(
  key: string,
  value: string,
  cwd: string = process.cwd(),
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
  const parsed: unknown =
    value === 'true'
      ? true
      : value === 'false'
        ? false
        : value === 'null'
          ? null
          : /^\d+$/.test(value)
            ? parseInt(value, 10)
            : /^\d+\.\d+$/.test(value)
              ? parseFloat(value)
              : value
  current[lastKey] = parsed

  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n')
}
