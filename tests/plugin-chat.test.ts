import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'

vi.mock('@devcli/config', () => ({
  loadConfig: vi.fn().mockResolvedValue({ ai: { provider: 'ollama', model: 'llama3.2' } }),
}))

const { createChatPlugin } = await import('../packages/plugins/chat/src/index')

let logSpy: ReturnType<typeof vi.spyOn>
let program: Command

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  program = new Command()
  createChatPlugin().register(program)
})

afterEach(() => logSpy.mockRestore())

function chatCmd(): Command {
  const c = program.commands.find((x) => x.name() === 'chat')
  if (!c) throw new Error('chat not found')
  return c
}

describe('chat plugin manifest', () => {
  it('registers with correct name', () => {
    const plugin = createChatPlugin()
    expect(plugin.manifest.name).toBe('chat')
    expect(plugin.manifest.category).toBe('utility')
    expect(plugin.manifest.keywords).toContain('repl')
  })
})

describe('chat command', () => {
  it('registers chat command', () => {
    const chat = chatCmd()
    expect(chat.name()).toBe('chat')
    expect(chat.description()).toContain('Interactive REPL')
  })

  it('has --plan option', () => {
    const chat = chatCmd()
    expect(chat.options.find((o) => o.long === '--plan')).toBeDefined()
  })

  it('has --model option', () => {
    const chat = chatCmd()
    expect(chat.options.find((o) => o.long === '--model')).toBeDefined()
  })

  it('has --auto option', () => {
    const chat = chatCmd()
    expect(chat.options.find((o) => o.long === '--auto')).toBeDefined()
  })

  it('registers sessions subcommand', () => {
    const chat = chatCmd()
    const sessions = chat.commands.find((c) => c.name() === 'sessions')
    expect(sessions).toBeDefined()
  })

  it('registers init subcommand', () => {
    const chat = chatCmd()
    const init = chat.commands.find((c) => c.name() === 'init')
    expect(init).toBeDefined()
  })
})

describe('chat sessions subcommand', () => {
  it('handles no sessions gracefully', async () => {
    const chat = chatCmd()
    const sessions = chat.commands.find((c) => c.name() === 'sessions')
    expect(sessions).toBeDefined()
    await sessions!.parseAsync([], { from: 'user' })
    expect(logSpy).toHaveBeenCalled()
  })
})
