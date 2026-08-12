import * as readline from 'node:readline'
import chalk from 'chalk'
import { loadConfig } from '@devcli/config'
import { resolveProviderConfig } from './providers'
import { resolvePermissions } from './permissions'
import { ContextManager, fuzzyFileSearch } from './context'
import {
  createSession,
  addMessage,
  saveSession,
  compactMessages,
  type SessionState,
  type ChatMessage,
} from './session'
import { getToolDefinitions, executeTool, type AskPermissionFn } from './tools'
import { streamChat, collectStreamResult, type StreamMessage } from './stream'
import { handleSlashCommand } from './commands'
import {
  renderMarkdown,
  renderToolCall,
  renderToolResult,
  renderBigBanner,
  renderWelcomeBanner,
} from './render'

const MAX_TOOL_ROUNDS = 20

export interface ChatOptions {
  mode?: 'build' | 'plan'
  model?: string
  auto?: boolean
  oneShot?: string
}

export async function startChat(opts: ChatOptions = {}): Promise<void> {
  const config = await loadConfig()
  const providerConfig = resolveProviderConfig(config)

  if (opts.model) {
    providerConfig.model = opts.model
  }

  if (!providerConfig.apiKey && providerConfig.provider !== 'ollama') {
    console.log(chalk.red('✗') + ' No AI provider configured')
    console.log(chalk.gray('  Run: dev ai setup'))
    console.log(chalk.gray('  Or: dev ai set provider openai sk-...'))
    return
  }

  const permissions = resolvePermissions(
    config as { chat?: { permissions?: Record<string, string> } },
    opts.auto ?? false,
  )
  const session = createSession(providerConfig.provider, providerConfig.model, opts.mode ?? 'build')
  const context = new ContextManager()
  context.init()

  if (opts.oneShot) {
    await runOneShot(opts.oneShot, session, context, providerConfig, permissions)
    return
  }

  showWelcome(session.mode, providerConfig.model, providerConfig.provider)
  await replLoop(session, context, providerConfig, permissions)
}

function showWelcome(mode: string, model: string, provider: string): void {
  console.log(renderBigBanner())
  console.log()
  console.log(renderWelcomeBanner(mode, model, provider))
  console.log()
}

async function replLoop(
  session: SessionState,
  context: ContextManager,
  providerConfig: ReturnType<typeof resolveProviderConfig>,
  permissions: ReturnType<typeof resolvePermissions>,
): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const askInput = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve))

  const askPermission: AskPermissionFn = async (
    toolName: string,
    description: string,
  ): Promise<boolean> => {
    console.log()
    console.log(chalk.yellow.bold('⚠ Permission required') + chalk.gray(` (${toolName})`))
    console.log(`  ${chalk.gray(description)}`)
    const answer = await askInput(chalk.yellow('  Allow? [y/N] '))
    return answer.toLowerCase().startsWith('y')
  }

  while (true) {
    let input: string
    try {
      input = await askInput(chalk.cyan.bold('❯ '))
    } catch {
      break
    }

    const trimmed = input.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('!')) {
      const cmdOutput = await runInlineCommand(trimmed.slice(1))
      context.addCommandOutput(cmdOutput)
      console.log(chalk.gray(cmdOutput))
      continue
    }

    if (trimmed.startsWith('@')) {
      const fileRef = trimmed.slice(1).split(/\s+/)[0] ?? ''
      const matches = fuzzyFileSearch(fileRef)
      if (matches.length > 0) {
        context.addFile(matches[0]!)
        console.log(chalk.green('✓') + ' Added to context: ' + chalk.cyan(matches[0]))
      } else {
        console.log(chalk.red('✗') + ' No file found matching: ' + fileRef)
      }
      continue
    }

    if (trimmed.startsWith('/')) {
      const result = await handleSlashCommand(trimmed, session, context, askInput)
      if (result.shouldClear) console.clear()
      if (result.output) console.log(result.output)
      if (result.shouldExit) {
        saveSession(session)
        rl.close()
        return
      }
      if (result.newMode) session.mode = result.newMode
      if (result.newModel) session.model = result.newModel
      continue
    }

    const userMessage: ChatMessage = { role: 'user', content: trimmed }
    addMessage(session, userMessage)

    const fileContext = context.buildFileContext()
    if (fileContext) {
      userMessage.content = `${trimmed}\n\n--- Context ---\n${fileContext}`
    }

    await processConversation(session, context, providerConfig, permissions, askPermission)
  }

  rl.close()
}

async function processConversation(
  session: SessionState,
  context: ContextManager,
  providerConfig: ReturnType<typeof resolveProviderConfig>,
  permissions: ReturnType<typeof resolvePermissions>,
  askPermission: AskPermissionFn,
): Promise<void> {
  const tools = getToolDefinitions(session.mode)
  compactMessages(session)
  let rounds = 0

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++
    const streamMessages: StreamMessage[] = [
      { role: 'system', content: context.buildSystemPrompt() },
      ...session.messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system' | 'tool',
        content: m.content,
        toolCallId: m.toolCallId,
        toolCalls: m.toolCalls?.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: tc.function,
        })),
        name: m.name,
      })),
    ]

    console.log()
    console.log(chalk.magenta.bold('🤖 ') + chalk.gray('(streaming...)'))
    console.log()

    const gen = streamChat(streamMessages, providerConfig, tools)
    let result: {
      content: string
      toolCalls: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
      }>
    }

    try {
      result = await collectStreamResult(gen, (chunk) => {
        if (chunk.type === 'content' && chunk.content) {
          process.stdout.write(chunk.content)
        } else if (chunk.type === 'tool_calls' && chunk.toolCalls) {
          for (const tc of chunk.toolCalls) {
            if (tc.function?.name) {
              try {
                const args = JSON.parse(tc.function.arguments || '{}')
                console.log(renderToolCall(tc.function.name, args))
              } catch {
                console.log(renderToolCall(tc.function?.name ?? 'unknown', {}))
              }
            }
          }
        }
      })
    } catch (err) {
      console.log()
      console.log(chalk.red('✗ Error: ') + (err instanceof Error ? err.message : String(err)))
      return
    }

    console.log()
    console.log()

    if (result.content) {
      const rendered = renderMarkdown(result.content)
      console.log(rendered)
    } else if (result.toolCalls.length === 0) {
      addMessage(session, { role: 'assistant', content: '(no response)' })
      return
    }

    addMessage(session, {
      role: 'assistant',
      content: result.content || '',
      toolCalls: result.toolCalls.length > 0 ? result.toolCalls : undefined,
    })

    for (const tc of result.toolCalls) {
      let parsedArgs: Record<string, unknown> = {}
      try {
        parsedArgs = JSON.parse(tc.function.arguments || '{}')
      } catch {
        // malformed args
      }

      const toolResult = await executeTool(
        tc.function.name,
        parsedArgs,
        permissions,
        askPermission,
        process.cwd(),
      )
      console.log(renderToolResult(toolResult))

      const toolMessage: ChatMessage = {
        role: 'tool',
        content: toolResult.output,
        toolCallId: tc.id,
        name: tc.function.name,
      }
      addMessage(session, toolMessage)
    }
  }

  if (rounds >= MAX_TOOL_ROUNDS) {
    console.log(chalk.yellow('⚠') + ' Max tool rounds reached')
  }
}

async function runOneShot(
  prompt: string,
  session: SessionState,
  context: ContextManager,
  providerConfig: ReturnType<typeof resolveProviderConfig>,
  permissions: ReturnType<typeof resolvePermissions>,
): Promise<void> {
  addMessage(session, { role: 'user', content: prompt })
  const askPermission: AskPermissionFn = async () => true
  await processConversation(session, context, providerConfig, permissions, askPermission)
}

async function runInlineCommand(command: string): Promise<string> {
  const { exec } = await import('@devcli/core')
  try {
    const result = exec('bash', ['-c', command])
    return result || '(empty output)'
  } catch {
    return 'Command failed'
  }
}
