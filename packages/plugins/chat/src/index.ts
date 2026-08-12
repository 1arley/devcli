import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { symbols } from '@devcli/ui'
import chalk from 'chalk'
import { startChat } from './repl'
import { listSessions } from './session'

const manifest = {
  name: 'chat',
  description: 'AI coding agent — interactive REPL with streaming, tools, and permissions',
  version: '0.0.0',
  keywords: ['chat', 'ai', 'agent', 'coding', 'assistant', 'repl', 'streaming', 'tools'],
  category: 'ai' as const,
}

export const createChatPlugin: PluginFactory = (): Plugin => ({
  manifest,
  register(program: Command) {
    const chat = program.command('chat').description(manifest.description)

    chat
      .option('--plan', 'Start in plan mode (read-only, no file modifications)')
      .option('--model <name>', 'Override AI model for this session')
      .option('--auto', 'Auto-approve all tool permissions (except explicit deny)')
      .argument('[prompt...]', 'One-shot prompt — if provided, runs non-interactively')
      .action(
        async (prompt: string[], options: { plan?: boolean; model?: string; auto?: boolean }) => {
          const oneShot = prompt.length > 0 ? prompt.join(' ').trim() : undefined
          await startChat({
            mode: options.plan ? 'plan' : 'build',
            model: options.model,
            auto: options.auto,
            oneShot,
          })
        },
      )

    chat
      .command('sessions')
      .description('List saved chat sessions')
      .action(() => {
        const sessions = listSessions()
        if (sessions.length === 0) {
          console.log(chalk.gray('No saved sessions'))
          return
        }
        console.log(chalk.bold('\nSaved sessions:\n'))
        for (const s of sessions) {
          console.log(`  ${chalk.cyan(s.name.padEnd(30))} ${chalk.gray(s.updatedAt)}`)
        }
        console.log()
      })

    chat
      .command('init')
      .description('Generate AGENTS.md for the current project')
      .action(async () => {
        const { writeFileSync } = await import('node:fs')
        const { join } = await import('node:path')
        const { renderAsciiArt } = await import('./render')
        const body = renderAsciiArt('bodyicon')
        const header = body ? body + '\n\n' : ''
        const content =
          header +
          `# Project Instructions

## Environment
- Working directory: ${process.cwd()}
- Platform: ${process.platform}

## Build & Test Commands
Run these in order:
\`\`\`
pnpm install --frozen-lockfile
pnpm build
pnpm test:run
\`\`\`

## Architecture
Describe your project structure here.

## Conventions
- Follow existing code style
- Use TypeScript strict mode
- Prefer functional patterns
- No unused exports
`
        const agentsPath = join(process.cwd(), 'AGENTS.md')
        writeFileSync(agentsPath, content)
        console.log(`${symbols.success} Created ${chalk.cyan('AGENTS.md')}`)
      })
  },
})
