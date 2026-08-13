import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import chalk from 'chalk'

const NPM_REGISTRY = 'https://registry.npmjs.org'
const CACHE_DIR = path.join(os.homedir(), '.cache', 'devcli')
const CACHE_FILE = path.join(CACHE_DIR, 'update-check.json')
const NPM_PACKAGE_NAME = '@1arley/devcli'
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

interface UpdateInfo {
  current: string
  latest: string
  checkedAt: number
}

function getCurrentVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8')) as {
      version: string
    }
    return pkg.version
  } catch {
    return '0.0.0'
  }
}

async function getCachedInfo(): Promise<UpdateInfo | null> {
  try {
    const raw = await readFile(CACHE_FILE, 'utf-8')
    const info = JSON.parse(raw) as UpdateInfo
    if (Date.now() - info.checkedAt < CHECK_INTERVAL_MS) return info
    return null
  } catch {
    return null
  }
}

async function saveCache(info: UpdateInfo): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true })
    await writeFile(CACHE_FILE, JSON.stringify(info))
  } catch {
    // Cache is best-effort; ignore failures.
  }
}

async function fetchLatestVersion(): Promise<string> {
  const url = `${NPM_REGISTRY}/${NPM_PACKAGE_NAME}/latest`
  const res = await fetch(url, {
    headers: { 'user-agent': `devcli/${getCurrentVersion()}` },
  })
  if (!res.ok) throw new Error(`registry responded ${res.status}`)
  const data = (await res.json()) as { version?: string }
  if (!data.version) throw new Error('no version field in registry response')
  return data.version
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

export function formatUpdateMessage(info: UpdateInfo): string {
  return [
    '',
    chalk.bgYellow.black(' UPDATE AVAILABLE '),
    chalk.yellow(`  You are using devcli ${chalk.bold(info.current)}`),
    chalk.yellow(`  Latest version is  ${chalk.bold(info.latest)}`),
    '',
    `  Run ${chalk.cyan('npm i -g @1arley/devcli')} to update.`,
    '',
  ].join('\n')
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    const cached = await getCachedInfo()
    const current = getCurrentVersion()
    if (cached) {
      return compareVersions(cached.latest, current) > 0 ? cached : null
    }
    const latest = await fetchLatestVersion()
    const info: UpdateInfo = { current, latest, checkedAt: Date.now() }
    await saveCache(info)
    return compareVersions(latest, current) > 0 ? info : null
  } catch {
    return null
  }
}

export async function maybeNotifyUpdate(): Promise<void> {
  if (process.env.DEVCLI_NO_UPDATE_CHECK !== undefined) return
  if (!process.stdout.isTTY) return
  if (process.argv.includes('--version') || process.argv.includes('-v')) return
  try {
    const info = await checkForUpdates()
    if (info) process.stdout.write(formatUpdateMessage(info) + '\n')
  } catch {
    // Never fail the command because of an update check.
  }
}

export async function checkUpdateCommand(): Promise<void> {
  try {
    const info = await checkForUpdates()
    if (info) process.stdout.write(formatUpdateMessage(info))
    else process.stdout.write(chalk.green('devcli is up to date.\n'))
  } catch {
    process.stdout.write(chalk.yellow('Could not check for updates.\n'))
  }
}
