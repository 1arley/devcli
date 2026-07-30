import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  sourcemap: true,
  treeshake: true,
  noExternal: [
    '@devcli/core',
    '@devcli/config',
    '@devcli/ui',
    '@devcli/plugin-doctor',
    '@devcli/plugin-ports',
    '@devcli/plugin-docker',
    '@devcli/plugin-git',
    '@devcli/plugin-jwt',
    '@devcli/plugin-json',
    '@devcli/plugin-uuid',
    '@devcli/plugin-qr',
    '@devcli/plugin-env',
    '@devcli/plugin-repo',
    '@devcli/plugin-ai',
  ],
  external: ['react', 'ink', 'commander'],
  banner: {
    js: '#!/usr/bin/env node',
  },
})
