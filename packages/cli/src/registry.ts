import { PluginRegistry } from '@devcli/core'
import type { PluginFactory } from '@devcli/core'

import { createDoctorPlugin } from '@devcli/plugin-doctor'
import { createPortsPlugin } from '@devcli/plugin-ports'
import { createDockerPlugin } from '@devcli/plugin-docker'
import { createGitPlugin } from '@devcli/plugin-git'
import { createJwtPlugin } from '@devcli/plugin-jwt'
import { createJsonPlugin } from '@devcli/plugin-json'
import { createUuidPlugin } from '@devcli/plugin-uuid'
import { createQrPlugin } from '@devcli/plugin-qr'
import { createEnvPlugin } from '@devcli/plugin-env'
import { createRepoPlugin } from '@devcli/plugin-repo'
import { createAiPlugin } from '@devcli/plugin-ai'
import { createSshPlugin } from '@devcli/plugin-ssh'
import { createLogsPlugin } from '@devcli/plugin-logs'
import { createPluginPluginFactory } from '@devcli/plugin-plugin'

export function createRegistry(): PluginRegistry {
  const registry = new PluginRegistry()
  const plugins: [string, PluginFactory][] = [
    ['doctor', createDoctorPlugin],
    ['ports', createPortsPlugin],
    ['docker', createDockerPlugin],
    ['git', createGitPlugin],
    ['jwt', createJwtPlugin],
    ['json', createJsonPlugin],
    ['uuid', createUuidPlugin],
    ['qr', createQrPlugin],
    ['env', createEnvPlugin],
    ['repo', createRepoPlugin],
    ['ai', createAiPlugin],
    ['ssh', createSshPlugin],
    ['logs', createLogsPlugin],
  ]
  for (const [name, factory] of plugins) {
    registry.register(name, factory)
  }
  registry.register('plugin', createPluginPluginFactory(registry))
  return registry
}
