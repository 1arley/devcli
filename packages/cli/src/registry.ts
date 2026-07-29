import { PluginRegistry } from '@dev-cli/core'
import type { PluginFactory } from '@dev-cli/core'

import { createDoctorPlugin } from '@dev-cli/plugin-doctor'
import { createPortsPlugin } from '@dev-cli/plugin-ports'
import { createDockerPlugin } from '@dev-cli/plugin-docker'
import { createGitPlugin } from '@dev-cli/plugin-git'
import { createJwtPlugin } from '@dev-cli/plugin-jwt'
import { createJsonPlugin } from '@dev-cli/plugin-json'
import { createUuidPlugin } from '@dev-cli/plugin-uuid'
import { createQrPlugin } from '@dev-cli/plugin-qr'
import { createEnvPlugin } from '@dev-cli/plugin-env'
import { createRepoPlugin } from '@dev-cli/plugin-repo'
import { createAiPlugin } from '@dev-cli/plugin-ai'

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
  ]
  for (const [name, factory] of plugins) {
    registry.register(name, factory)
  }
  return registry
}
