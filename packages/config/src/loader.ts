import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { DevCliConfigSchema, type DevCliConfig } from './schema.js'

const CONFIG_FILE = '.devclirc.json'

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
