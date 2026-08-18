import { program } from 'commander'
import { loadPlugins } from '@devcli/core'
import { createRegistry } from './registry.js'
import { setupGlobalErrorHandlers, handleError } from './error-handler.js'
import { maybeNotifyUpdate, checkUpdateCommand } from './update-check.js'

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VERSION = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'))
  .version as string

setupGlobalErrorHandlers()

program
  .name('dev')
  .description('The Raycast of the Terminal for Developers')
  .version(VERSION)
  .addHelpText(
    'after',
    `
Examples:
  $ dev                    Interactive command discovery
  $ dev doctor             Check development environment
  $ dev ports              List and manage port usage
  $ dev docker             Docker container management
  $ dev git                Git workflow helpers
  $ dev json               JSON utilities (format, validate, query)
  $ dev uuid               Generate UUIDs
  $ dev qr                 Generate QR codes
  $ dev env                Environment variable management
  $ dev repo               Repository utilities
  $ dev ssh                SSH connection management
  $ dev logs               Log viewing and filtering
  $ dev standup            Daily standup generator
  $ dev context            Context management
  $ dev clean              Clean project artifacts
  $ dev completion zsh     Generate zsh completion
  $ dev completion bash    Generate bash completion
  $ dev plugin             Manage plugins
  $ dev update             Check for and apply updates

More info: https://github.com/1arley/devcli
`,
  )

program
  .command('update')
  .description('Check for and display available updates')
  .action(async () => {
    await checkUpdateCommand()
  })

program.action(async () => {
  const { showDiscovery } = await import('./discovery.js')
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

main()
  .then(maybeNotifyUpdate)
  .catch((err) => {
    handleError(err)
  })
