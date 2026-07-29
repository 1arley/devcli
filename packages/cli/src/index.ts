import { program } from 'commander'
import { loadPlugins } from '@dev-cli/core'
import { createRegistry } from './registry.js'
import { showDiscovery } from './discovery.js'

const VERSION = '0.0.0'

program.name('dev').description('The Raycast of the Terminal for Developers').version(VERSION)

program.action(() => {
  const registry = createRegistry()
  const manifests = registry.manifests().sort((a, b) => a.name.localeCompare(b.name))
  showDiscovery(manifests, (name: string) => {
    process.stdout.write('\x1b[2J\x1b[H')
    process.argv = ['node', 'dev', name]
    program.parse(['node', 'dev', name, '--help'])
  })
})

async function main() {
  const registry = createRegistry()
  loadPlugins(registry, program)
  await program.parseAsync(process.argv)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
