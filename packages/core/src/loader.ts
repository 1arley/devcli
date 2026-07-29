import type { Command } from 'commander'
import type { PluginRegistry } from './registry.js'

export function loadPlugins(registry: PluginRegistry, program: Command): void {
  for (const plugin of registry.all()) {
    try {
      plugin.register(program)
    } catch (error) {
      console.error(`Failed to load plugin "${plugin.manifest.name}":`, error)
    }
  }
}
