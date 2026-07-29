import type { Plugin, PluginFactory } from './types.js'

export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map()
  private factories: Map<string, PluginFactory> = new Map()

  register(name: string, factory: PluginFactory): void {
    this.factories.set(name, factory)
    const plugin = factory()
    this.plugins.set(name, plugin)
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name)
  }

  has(name: string): boolean {
    return this.plugins.has(name)
  }

  all(): Plugin[] {
    return [...this.plugins.values()]
  }

  manifests() {
    return this.all().map((p) => p.manifest)
  }

  getFactory(name: string): PluginFactory | undefined {
    return this.factories.get(name)
  }

  clear(): void {
    this.plugins.clear()
    this.factories.clear()
  }
}
