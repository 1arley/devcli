import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { symbols } from '@devcli/ui'
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { platform, totalmem, freemem, cpus } from 'node:os'
import chalk from 'chalk'

interface CheckResult {
  name: string
  found: boolean
  version?: string
  detail?: string
}

function checkBin(cmd: string): CheckResult {
  try {
    const version = execSync(`${cmd} --version`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    return { name: cmd, found: true, version }
  } catch {
    return { name: cmd, found: false }
  }
}

function runDoctor(cwd: string = process.cwd()): void {
  const checks: CheckResult[] = [
    checkBin('node'),
    checkBin('npm'),
    checkBin('pnpm'),
    checkBin('git'),
    checkBin('docker'),
    checkBin('docker-compose'),
    {
      name: '.env',
      found: existsSync(`${cwd}/.env`),
      detail: existsSync(`${cwd}/.env`) ? 'present' : 'missing',
    },
    {
      name: 'TypeScript',
      found: existsSync(`${cwd}/tsconfig.json`),
      detail: existsSync(`${cwd}/tsconfig.json`) ? 'tsconfig.json found' : 'no tsconfig.json',
    },
  ]

  for (const c of checks) {
    const icon = c.found ? symbols.success : symbols.error
    const name = c.name.padEnd(15)
    const ver = c.version ? chalk.gray(c.version.slice(0, 30)) : ''
    const detail = c.detail ? chalk.gray(`(${c.detail})`) : ''
    process.stdout.write(`  ${icon} ${chalk.bold(name)} ${ver} ${detail}\n`)
  }

  const memTotal = totalmem()
  const memFree = freemem()
  const memUsed = ((memTotal - memFree) / memTotal) * 100
  const cpuCount = cpus().length

  process.stdout.write(`\n`)
  process.stdout.write(
    `  ${chalk.bold('Memory'.padEnd(15))} ${(memTotal / 1e9).toFixed(1)}GB total, ${memUsed.toFixed(0)}% in use\n`,
  )
  process.stdout.write(`  ${chalk.bold('CPUs'.padEnd(15))} ${cpuCount} cores\n`)
  process.stdout.write(`  ${chalk.bold('Platform'.padEnd(15))} ${platform()}\n`)
}

const manifest = {
  name: 'doctor',
  description: 'Diagnose your development environment',
  version: '0.0.0',
  keywords: ['doctor', 'health', 'check', 'diagnostics', 'environment'],
  category: 'dev' as const,
}

export const createDoctorPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      program
        .command('doctor')
        .description(manifest.description)
        .action(() => {
          runDoctor()
        })
    },
  }
}
