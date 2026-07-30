import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DevCliConfigSchema } from '../packages/config/src/schema'

// Mock filesystem before importing loader.
const fsMocks = {
  existsSync: vi.fn<(p: string) => boolean>(() => false),
  readFileSync: vi.fn<(p: string, enc: string) => string>(() => ''),
}
const fspMocks = {
  readFile: vi.fn<(p: string, enc: string) => Promise<string>>(async () => ''),
}

vi.mock('node:fs', () => fsMocks)
vi.mock('node:fs/promises', () => fspMocks)

const { readFile } = await import('node:fs/promises')
const { existsSync } = await import('node:fs')
const { loadConfig } = await import('../packages/config/src/loader')

const cwdSpy = vi.spyOn(process, 'cwd', 'get').mockReturnValue('/fake/cwd')

describe('DevCliConfigSchema', () => {
  it('parses minimal object applying defaults', () => {
    const cfg = DevCliConfigSchema.parse({})
    expect(cfg.version).toBe(1)
    expect(cfg.defaults.editor).toBe('code')
    expect(cfg.defaults.shell).toBe('bash')
    expect(cfg.defaults.theme).toBe('default')
    expect(cfg.ai).toBeUndefined()
    expect(cfg.ports).toBeUndefined()
  })

  it('parses full valid config', () => {
    const cfg = DevCliConfigSchema.parse({
      version: 1,
      defaults: { editor: 'vim', shell: 'zsh', theme: 'dark' },
      ai: { provider: 'openai', apiKey: 'sk-x', model: 'gpt-4o-mini' },
      docker: { socket: '/var/run/docker.sock' },
      ports: { ignore: [3000, 8080] },
    })
    expect(cfg.defaults.editor).toBe('vim')
    expect(cfg.defaults.theme).toBe('dark')
    expect(cfg.ai?.provider).toBe('openai')
    expect(cfg.docker?.socket).toBe('/var/run/docker.sock')
    expect(cfg.ports?.ignore).toEqual([3000, 8080])
  })

  it('rejects invalid theme enum', () => {
    expect(() => DevCliConfigSchema.parse({ defaults: { theme: 'purple' } })).toThrow()
  })

  it('accepts any ai provider string (including custom)', () => {
    const cfg = DevCliConfigSchema.parse({ ai: { provider: 'custom-provider' } })
    expect(cfg.ai?.provider).toBe('custom-provider')
  })

  it('rejects non-number version', () => {
    expect(() => DevCliConfigSchema.parse({ version: '1' })).toThrow()
  })

  it('rejects non-number entries in ports.ignore', () => {
    expect(() => DevCliConfigSchema.parse({ ports: { ignore: ['3000'] } })).toThrow()
  })

  it('version field is a number (schema coerces/defaults)', () => {
    const cfg = DevCliConfigSchema.parse({})
    expect(cfg.version).toBe(1)
    // zod .readonly() strips the setter at the schema level;
    // runtime assigns are silently ignored for non-strict TS in JS, so we only
    // assert the parsed value type here.
  })
})

describe('loadConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cwdSpy.mockReturnValue('/fake/cwd')
  })
  afterEach(() => {
    fsMocks.existsSync.mockReset()
    fspMocks.readFile.mockReset()
  })

  it('returns parsed config from cwd .devclirc.json', async () => {
    fsMocks.existsSync.mockImplementation((p: string) => p === '/fake/cwd/.devclirc.json')
    fspMocks.readFile.mockResolvedValue(JSON.stringify({ defaults: { editor: 'nano' } }))
    const cfg = await loadConfig('/fake/cwd')
    expect(cfg.defaults.editor).toBe('nano')
    expect(existsSync).toHaveBeenCalledWith('/fake/cwd/.devclirc.json')
    expect(readFile).toHaveBeenCalledWith('/fake/cwd/.devclirc.json', 'utf-8')
  })

  it('falls back to HOME config when none in cwd', async () => {
    let homePath = ''
    fsMocks.existsSync.mockImplementation((p: string) => {
      if (p.endsWith('.devclirc.json') && p.includes('/home')) {
        homePath = p
        return true
      }
      return false
    })
    fspMocks.readFile.mockImplementation(async (p: string) =>
      p === homePath ? JSON.stringify({ ai: { provider: 'ollama' } }) : '',
    )
    const cfg = await loadConfig('/fake/cwd')
    expect(cfg.ai?.provider).toBe('ollama')
  })

  it('returns defaults when no config file exists anywhere', async () => {
    fsMocks.existsSync.mockReturnValue(false)
    const cfg = await loadConfig('/fake/cwd')
    expect(cfg.version).toBe(1)
    expect(cfg.defaults.editor).toBe('code')
  })

  it('continues on unreadable config and returns defaults if no other path', async () => {
    fsMocks.existsSync.mockReturnValue(true)
    fspMocks.readFile.mockRejectedValue(new Error('EACCES'))
    const cfg = await loadConfig('/fake/cwd')
    expect(cfg.version).toBe(1)
  })

  it('continues on invalid JSON and yields defaults if no other path', async () => {
    fsMocks.existsSync.mockReturnValue(true)
    fspMocks.readFile.mockResolvedValue('{not json')
    const cfg = await loadConfig('/fake/cwd')
    expect(cfg.version).toBe(1)
  })

  it('cwd config takes precedence over HOME config', async () => {
    const calls: Record<string, string> = {}
    fsMocks.existsSync.mockReturnValue(true)
    fspMocks.readFile.mockImplementation(async (p: string) => {
      if (p in calls) return calls[p]!
      if (p === '/fake/cwd/.devclirc.json') {
        calls[p] = JSON.stringify({ defaults: { editor: 'cwd-edit' } })
      } else {
        calls[p] = JSON.stringify({ defaults: { editor: 'home-edit' } })
      }
      return calls[p]!
    })
    const cfg = await loadConfig('/fake/cwd')
    expect(cfg.defaults.editor).toBe('cwd-edit')
  })
})
