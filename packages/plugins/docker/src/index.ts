import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { createTable, symbols, withSpinner } from '@devcli/ui'
import chalk from 'chalk'
import { execSync } from 'node:child_process'

function runDocker(args: string): string {
  try {
    return execSync(`docker ${args}`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
  } catch {
    return ''
  }
}

function parseContainerTable(): Record<string, string>[] {
  const output = runDocker(
    'ps -a --format "{{.ID}}\t{{.Image}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"',
  )
  if (!output.trim()) return []
  const rows = output.trim().split('\n')
  return rows.map((line) => {
    const [ID, Image, Name, Status, Ports] = line.split('\t')
    return {
      ID: ID ?? '',
      Image: Image ?? '',
      Name: Name ?? '',
      Status: Status ?? '',
      Ports: Ports ?? '',
    }
  })
}

function parseImages(): Record<string, string>[] {
  const output = runDocker('images --format "{{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.ID}}"')
  if (!output.trim()) return []
  const rows = output.trim().split('\n')
  return rows.map((line) => {
    const [Repository, Tag, Size, ID] = line.split('\t')
    return {
      Repository: Repository ?? '',
      Tag: Tag ?? '',
      Size: Size ?? '',
      ID: ID ?? '',
    }
  })
}

function parseVolumes(): Record<string, string>[] {
  const output = runDocker('volume ls --format "{{.Driver}}\t{{.Name}}"')
  if (!output.trim()) return []
  const rows = output.trim().split('\n')
  return rows.map((line) => {
    const [Driver, Name] = line.split('\t')
    return { Driver: Driver ?? '', Name: Name ?? '' }
  })
}

function parseNetworks(): Record<string, string>[] {
  const output = runDocker('network ls --format "{{.ID}}\t{{.Name}}\t{{.Driver}}"')
  if (!output.trim()) return []
  const rows = output.trim().split('\n')
  return rows.map((line) => {
    const [ID, Name, Driver] = line.split('\t')
    return {
      ID: ID ?? '',
      Name: Name ?? '',
      Driver: Driver ?? '',
    }
  })
}

function systemDiskUsage(): string {
  return runDocker('system df')
}

const manifest = {
  name: 'docker',
  description: 'Inspect Docker containers, images, volumes, and networks',
  version: '0.0.0',
  keywords: ['docker', 'containers', 'images', 'volumes', 'networks'],
  category: 'docker' as const,
}

export const createDockerPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      const docker = program.command('docker').description(manifest.description)

      docker.action(async () => {
        const containers = parseContainerTable()
        if (containers.length === 0) {
          console.log(`${symbols.info} No containers found`)
        } else {
          const table = createTable(
            ['ID', 'Image', 'Name', 'Status', 'Ports'],
            containers.map((c) => ({
              ID: (c['ID'] ?? '').slice(0, 12),
              Image: c['Image'] ?? '',
              Name: c['Name'] ?? '',
              Status: c['Status'] ?? '',
              Ports: (c['Ports'] ?? '').slice(0, 40),
            })),
          )
          console.log(table.toString())
        }
      })

      docker
        .command('containers')
        .description('List all containers')
        .action(async () => {
          const data = await withSpinner('Fetching containers...', () =>
            Promise.resolve(parseContainerTable()),
          )
          if (data.length === 0) {
            console.log(`${symbols.info} No containers found`)
            return
          }
          const table = createTable(['ID', 'Image', 'Name', 'Status', 'Ports'], data)
          console.log(table.toString())
        })

      docker
        .command('images')
        .description('List Docker images')
        .action(() => {
          const data = parseImages()
          if (data.length === 0) {
            console.log(`${symbols.info} No images found`)
            return
          }
          const table = createTable(['Repository', 'Tag', 'Size', 'ID'], data)
          console.log(table.toString())
        })

      docker
        .command('volumes')
        .description('List Docker volumes')
        .action(() => {
          const data = parseVolumes()
          if (data.length === 0) {
            console.log(`${symbols.info} No volumes found`)
            return
          }
          const table = createTable(['Driver', 'Name'], data)
          console.log(table.toString())
        })

      docker
        .command('networks')
        .description('List Docker networks')
        .action(() => {
          const data = parseNetworks()
          if (data.length === 0) {
            console.log(`${symbols.info} No networks found`)
            return
          }
          const table = createTable(['ID', 'Name', 'Driver'], data)
          console.log(table.toString())
        })

      docker
        .command('disk')
        .description('Show Docker disk usage (wasted space)')
        .action(() => {
          const usage = systemDiskUsage()
          if (!usage.trim()) {
            console.log(`${symbols.error} Could not get disk usage`)
            return
          }
          console.log(usage)
        })

      docker
        .command('prune')
        .description('Remove unused Docker data (images, containers, networks)')
        .option('-f, --force', 'Skip confirmation')
        .action((options: { force?: boolean }) => {
          if (!options.force) {
            console.log(chalk.yellow('Use --force to skip confirmation'))
            console.log('This will remove all stopped containers, unused networks, dangling images')
            return
          }
          const output = runDocker('system prune -af')
          console.log(output)
        })
    },
  }
}
