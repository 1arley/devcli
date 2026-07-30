import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'

// Mock loadConfig so explainError falls into local path deterministically.
const loadConfigMock = vi.fn()
vi.mock('@devcli/config', () => ({ loadConfig: loadConfigMock }))

// Mock global fetch to assert provider path behaviour.
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const { createAiPlugin } = await import('../packages/plugins/ai/src/index')

let logSpy: ReturnType<typeof vi.spyOn>
let program: Command

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  program = new Command()
  createAiPlugin().register(program)
  loadConfigMock.mockReset()
  fetchMock.mockReset()
})
afterEach(() => logSpy.mockRestore())

function aiCmd(): Command {
  const c = program.commands.find((x) => x.name() === 'ai')
  if (!c) throw new Error('ai not found')
  return c
}
function sub(name: string): Command {
  const c = aiCmd().commands.find((x) => x.name() === name)
  if (!c) throw new Error(`ai ${name} not found`)
  return c
}
async function runAi(input: string[]): Promise<string[]> {
  logSpy.mockClear()
  await aiCmd().parseAsync(['node', 'test', ...input])
  return logSpy.mock.calls.map((a) => String(a[0]))
}
async function runConfig(): Promise<string[]> {
  logSpy.mockClear()
  await sub('config').parseAsync(['node', 'test'])
  return logSpy.mock.calls.map((a) => String(a[0]))
}

describe('ai plugin registration', () => {
  it('registers ai command and config subcommand', () => {
    const p = createAiPlugin()
    expect(p.manifest.name).toBe('ai')
    expect(p.manifest.category).toBe('ai')
    const prog = new Command()
    p.register(prog)
    const ai = prog.commands.find((c) => c.name() === 'ai')
    expect(ai).toBeDefined()
    expect(ai?.commands.map((c) => c.name())).toContain('config')
  })
})

describe('inferErrorType + generateSuggestions (local path)', () => {
  async function runNoProvider(input: string): Promise<string[]> {
    loadConfigMock.mockResolvedValue({ ai: undefined })
    return runAi([input])
  }

  it('TypeError', async () => {
    const out = await runNoProvider('TypeError: Cannot read prop x of undefined')
    const all = out.join('\n')
    expect(all).toContain('Type: TypeError')
    expect(all).toMatch(/optional chaining|null checks/)
  })

  it('ReferenceError', async () => {
    const out = await runNoProvider('foo is not defined')
    expect(out.join('\n')).toContain('ReferenceError')
    expect(out.join('\n')).toMatch(/declared before use/)
  })

  it('SyntaxError', async () => {
    const out = await runNoProvider('SyntaxError: Unexpected token }')
    expect(out.join('\n')).toContain('SyntaxError')
    expect(out.join('\n')).toMatch(/missing brackets/)
  })

  it('NetworkError', async () => {
    const out = await runNoProvider('Error: connect ECONNREFUSED 127.0.0.1:5432')
    expect(out.join('\n')).toContain('NetworkError')
  })

  it('FileSystemError', async () => {
    const out = await runNoProvider('ENOENT: no such file or directory ./x')
    expect(out.join('\n')).toContain('FileSystemError')
  })

  it('TimeoutError', async () => {
    const out = await runNoProvider('request ETIMEDOUT after 30000ms')
    expect(out.join('\n')).toContain('TimeoutError')
  })

  it('PermissionError', async () => {
    const out = await runNoProvider('EACCES permission denied /etc')
    expect(out.join('\n')).toContain('PermissionError')
  })

  it('ModuleNotFoundError', async () => {
    const out = await runNoProvider("Cannot find module 'foo'")
    expect(out.join('\n')).toContain('ModuleNotFoundError')
  })

  it('PortInUseError', async () => {
    const out = await runNoProvider('Error: port 3000 in use')
    expect(out.join('\n')).toContain('PortInUseError')
  })

  it('unknown error yields null type and no type line', async () => {
    const out = await runNoProvider('just some random text')
    const all = out.join('\n')
    expect(all).not.toMatch(/^\s*Type: /m)
  })
})

describe('generateSuggestions keyword extras', () => {
  it('adds docker suggestion when input mentions docker', async () => {
    loadConfigMock.mockResolvedValue({ ai: undefined })
    const out = await runAi(['docker: ECONNREFUSED'])
    expect(out.join('\n').toLowerCase()).toContain('docker info')
  })

  it('adds npm suggestion for npm errors', async () => {
    loadConfigMock.mockResolvedValue({ ai: undefined })
    const out = await runAi(['npm ERR! EACCES'])
    expect(out.join('\n').toLowerCase()).toContain('node_modules')
  })

  it('adds git suggestion when input mentions git', async () => {
    loadConfigMock.mockResolvedValue({ ai: undefined })
    const out = await runAi(['git: fatal not a git repository'])
    expect(out.join('\n').toLowerCase()).toContain('git status')
  })
})

describe('no input', () => {
  it('errors when no input provided', async () => {
    const out = await runAi([])
    const all = out.join('\n')
    expect(all).toMatch(/Provide an error message/)
  })
})

describe('provider path (fetch)', () => {
  it('calls fetch with configured provider and returns content', async () => {
    loadConfigMock.mockResolvedValue({
      ai: { provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o-mini' },
    })
    fetchMock.mockResolvedValue({
      json: async () => ({ choices: [{ message: { content: 'AI-explanation' } }] }),
    })
    const out = await runAi(['TypeError: x is not a function'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect((init as RequestInit).method).toBe('POST')
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.model).toBe('gpt-4o-mini')
    expect(out.join('\n')).toContain('AI-explanation')
  })

  it('falls back to local explanation when fetch throws', async () => {
    loadConfigMock.mockResolvedValue({
      ai: { provider: 'openai', apiKey: 'sk-test' },
    })
    fetchMock.mockRejectedValue(new Error('network down'))
    const out = await runAi(['TypeError: cannot read prop'])
    const all = out.join('\n')
    expect(all).toContain('TypeError')
    expect(all).toContain('Analysis')
  })

  it('falls back when choices empty', async () => {
    loadConfigMock.mockResolvedValue({
      ai: { provider: 'openai', apiKey: 'sk-test' },
    })
    fetchMock.mockResolvedValue({ json: async () => ({}) })
    const out = await runAi(['TypeError: cannot read prop'])
    expect(out.join('\n')).toContain('TypeError')
  })
})

describe('ai config subcommand', () => {
  it('shows no provider configured', async () => {
    loadConfigMock.mockResolvedValue({ ai: undefined })
    const out = await runConfig()
    expect(out.join('\n')).toMatch(/No AI provider configured/)
  })

  it('shows provider/model/apiKey when configured', async () => {
    loadConfigMock.mockResolvedValue({
      ai: { provider: 'anthropic', apiKey: 'sk-x', model: 'claude' },
    })
    const out = await runConfig()
    const all = out.join('\n')
    expect(all).toContain('anthropic')
    expect(all).toContain('claude')
    expect(all).toMatch(/Set/)
  })

  it('marks missing apiKey', async () => {
    loadConfigMock.mockResolvedValue({
      ai: { provider: 'openai' },
    })
    const out = await runConfig()
    expect(out.join('\n')).toMatch(/Missing/)
  })
})
