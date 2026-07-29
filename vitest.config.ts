import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      threshold: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      exclude: [
        '**/dist/**',
        '**/node_modules/**',
        '**/*.config.*',
        '**/*.test.*',
        '**/*.spec.*',
        '**/test/**',
      ],
    },
    alias: {
      '@dev-cli/core': resolve(__dirname, 'packages/core/src'),
      '@dev-cli/config': resolve(__dirname, 'packages/config/src'),
      '@dev-cli/ui': resolve(__dirname, 'tests/ui-stub.ts'),
      commander: resolve(__dirname, 'packages/plugins/jwt/node_modules/commander'),
      chalk: resolve(__dirname, 'packages/plugins/jwt/node_modules/chalk'),
    },
  },
})
