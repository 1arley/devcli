import type { Command } from 'commander'

export interface PluginContext {
  cwd: string
  args: string[]
  flags: Record<string, unknown>
}

export interface PluginManifest {
  name: string
  description: string
  version: string
  keywords: string[]
  category: PluginCategory
}

export type PluginCategory =
  'dev' | 'docker' | 'git' | 'security' | 'data' | 'utility' | 'infra' | 'env'

export interface Plugin {
  manifest: PluginManifest
  register(program: Command): void
}

export type PluginFactory = () => Plugin
