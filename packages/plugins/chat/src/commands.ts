import chalk from 'chalk'
import { writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { exec } from '@devcli/core'
import { ContextManager } from './context'
import {
  clearMessages,
  compactMessages,
  exportToMarkdown,
  listSessions,
  loadSession,
  saveSession,
  type SessionState,
} from './session'
import { renderAsciiArt } from './render'
import { consumePendingStashRef } from './tools'

export interface SlashCommandResult {
  output: string
  shouldExit: boolean
  shouldClear: boolean
  newMode?: 'build' | 'plan'
  newModel?: string
}

export type AskInputFn = (prompt: string) => Promise<string>

export async function handleSlashCommand(
  input: string,
  session: SessionState,
  context: ContextManager,
  _askInput: AskInputFn,
): Promise<SlashCommandResult> {
  const parts = input.slice(1).split(/\s+/)
  const cmd = parts[0] ?? ''
  const args = parts.slice(1).join(' ')

  switch (cmd) {
    case 'exit':
    case 'quit':
    case 'q':
      return { output: chalk.gray('Goodbye!'), shouldExit: true, shouldClear: false }

    case 'help':
      return {
        output: formatHelp(),
        shouldExit: false,
        shouldClear: false,
      }

    case 'clear':
    case 'new':
      clearMessages(session)
      context.clear()
      context.init()
      return {
        output: chalk.green('✓') + ' Context cleared',
        shouldExit: false,
        shouldClear: true,
      }

    case 'compact':
      compactMessages(session)
      return {
        output:
          chalk.green('✓') +
          ' Compacted to ' +
          chalk.bold(String(session.messages.length)) +
          ' messages',
        shouldExit: false,
        shouldClear: false,
      }

    case 'file': {
      if (!args)
        return {
          output: chalk.yellow('Usage: /file <path>'),
          shouldExit: false,
          shouldClear: false,
        }
      const added = context.addFile(args)
      if (added) {
        return {
          output: chalk.green('✓') + ' Added to context: ' + chalk.cyan(args),
          shouldExit: false,
          shouldClear: false,
        }
      }
      return {
        output: chalk.red('✗') + ' File not found or too large: ' + args,
        shouldExit: false,
        shouldClear: false,
      }
    }

    case 'mode': {
      const newMode = session.mode === 'build' ? 'plan' : 'build'
      session.mode = newMode
      return {
        output: chalk.green('✓') + ' Mode: ' + chalk.bold(newMode),
        shouldExit: false,
        shouldClear: false,
        newMode,
      }
    }

    case 'model': {
      if (!args) {
        return {
          output: chalk.gray('Current model: ' + chalk.bold(session.model)),
          shouldExit: false,
          shouldClear: false,
        }
      }
      session.model = args
      return {
        output: chalk.green('✓') + ' Model: ' + chalk.bold(args),
        shouldExit: false,
        shouldClear: false,
        newModel: args,
      }
    }

    case 'save': {
      const name = args || `session-${Date.now()}`
      saveSession(session, name)
      return {
        output: chalk.green('✓') + ' Saved as: ' + chalk.cyan(name),
        shouldExit: false,
        shouldClear: false,
      }
    }

    case 'load': {
      if (!args)
        return {
          output: chalk.yellow('Usage: /load <name>'),
          shouldExit: false,
          shouldClear: false,
        }
      const loaded = loadSession(args)
      if (!loaded) {
        return {
          output: chalk.red('✗') + ' Session not found: ' + args,
          shouldExit: false,
          shouldClear: false,
        }
      }
      Object.assign(session, loaded)
      return {
        output:
          chalk.green('✓') +
          ' Loaded: ' +
          chalk.cyan(args) +
          ` (${loaded.messages.length} messages)`,
        shouldExit: false,
        shouldClear: true,
      }
    }

    case 'sessions': {
      const sessions = listSessions()
      if (sessions.length === 0) {
        return { output: chalk.gray('No saved sessions'), shouldExit: false, shouldClear: false }
      }
      const lines = sessions.map((s) => `  ${chalk.cyan(s.name)} — ${s.updatedAt}`)
      return { output: 'Sessions:\n' + lines.join('\n'), shouldExit: false, shouldClear: false }
    }

    case 'export': {
      const md = exportToMarkdown(session)
      const exportPath = resolve(`devchat-export-${Date.now()}.md`)
      writeFileSync(exportPath, md)
      return {
        output: chalk.green('✓') + ' Exported to: ' + chalk.cyan(exportPath),
        shouldExit: false,
        shouldClear: false,
      }
    }

    case 'undo': {
      const isRepo = exec('git', ['rev-parse', '--is-inside-work-tree']) === 'true'
      if (!isRepo) {
        return {
          output: chalk.red('✗') + ' Not a git repository — cannot undo',
          shouldExit: false,
          shouldClear: false,
        }
      }
      try {
        const stashRef = consumePendingStashRef()
        if (stashRef) {
          exec('git', ['stash', 'pop', stashRef])
          return {
            output: chalk.green('✓') + ' Undid last file changes (git stash pop)',
            shouldExit: false,
            shouldClear: false,
          }
        }
        exec('git', ['stash', 'pop'])
        return {
          output: chalk.green('✓') + ' Undid last change (git stash pop)',
          shouldExit: false,
          shouldClear: false,
        }
      } catch {
        return {
          output: chalk.yellow('⚠') + ' Nothing to undo',
          shouldExit: false,
          shouldClear: false,
        }
      }
    }

    case 'init': {
      const agentsPath = join(process.cwd(), 'AGENTS.md')
      const body = renderAsciiArt('bodyicon')
      const header = body ? body + '\n\n' : ''
      const content = header + generateAgentsMd()
      writeFileSync(agentsPath, content)
      return {
        output: chalk.green('✓') + ' Created ' + chalk.cyan('AGENTS.md'),
        shouldExit: false,
        shouldClear: false,
      }
    }

    case 'art': {
      const art = renderAsciiArt((args as 'favicon' | 'bodyicon' | 'faceicon') || 'faceicon')
      return { output: art || chalk.gray('No art found'), shouldExit: false, shouldClear: false }
    }

    default:
      return {
        output:
          chalk.red('✗') +
          ' Unknown command: /' +
          (cmd || '') +
          '\nType /help for available commands',
        shouldExit: false,
        shouldClear: false,
      }
  }
}

function formatHelp(): string {
  const commands = [
    ['file <path>', 'Add file to context'],
    ['mode', 'Toggle build/plan mode'],
    ['model [name]', 'Set or show model'],
    ['save [name]', 'Save current session'],
    ['load <name>', 'Load a saved session'],
    ['sessions', 'List saved sessions'],
    ['export', 'Export conversation to markdown'],
    ['undo', 'Undo last file change (git)'],
    ['init', 'Generate AGENTS.md for this project'],
    ['clear', 'Clear conversation context'],
    ['compact', 'Compact conversation (summarize older messages)'],
    ['art [name]', 'Show ASCII art (favicon/bodyicon/faceicon)'],
    ['exit', 'Exit dev chat'],
  ]
  const lines = commands.map(
    ([cmd, desc]) => `  ${chalk.cyan('/' + (cmd ?? '').padEnd(16))} ${chalk.gray(desc)}`,
  )
  return chalk.bold.cyan('\nDev Chat Commands:\n') + lines.join('\n') + '\n'
}

function generateAgentsMd(): string {
  return `# Project Instructions

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
}
