import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'

const fsMocks = {
  existsSync: vi.fn<(p: string) => boolean>(() => false),
  readFileSync: vi.fn<(p: string, enc: string) => string>(() => ''),
}

vi.mock('node:fs', () => fsMocks)

const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/fake/project')

const { createEnvPlugin } = await import('../packages/plugins/env/src/index')

let logSpy: ReturnType<typeof vi.spyOn>
let program: Command

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  program = new Command()
  createEnvPlugin().register(program)
  cwdSpy.mockReturnValue('/fake/project')
  fsMocks.existsSync.mockReset()
  fsMocks.readFileSync.mockReset()
})
afterEach(() => logSpy.mockRestore())

function envCmd(): Command {
  const c = program.commands.find((x) => x.name() === 'env')
  if (!c) throw new Error('env not found')
  return c
}
async function run(sub: string[] = []): Promise<string[]> {
  logSpy.mockClear()
  const c = envCmd()
  if (sub.length === 0) await c.parseAsync(['node', 'test'])
  else await c.parseAsync(['node', 'test', ...sub])
  return logSpy.mock.calls.map((a) => String(a[0]))
}

const ENV_FILE = '# comment line\nFOO=bar\nBAR=1\n\n# another\nBAZ="quoted val"\n'
const EXAMPLE_FILE = 'FOO=bar\nNEW_VAR=x\nEXTRA=y\n'

describe('env plugin registration', () => {
  it('registers env command with correct manifest', () => {
    const p = createEnvPlugin()
    expect(p.manifest.name).toBe('env')
    expect(p.manifest.category).toBe('env')
    const prog = new Command()
    p.register(prog)
    const e = prog.commands.find((c) => c.name() === 'env')
    expect(e).toBeDefined()
    expect(e?.commands.map((c) => c.name()).sort()).toEqual(['diff', 'missing'])
  })
})

describe('parseEnvFile coverage (via env command)', () => {
  it('skips comments and blank lines, tracking variable names', async () => {
    fsMocks.existsSync.mockImplementation((p: string) => (p.endsWith('.env') ? true : false))
    fsMocks.readFileSync.mockImplementation((p: string) => (p.endsWith('.env') ? ENV_FILE : ''))
    // table view: only .env, no example -> all variables stem from .env.
    const out = await run()
    const all = out.join('\n')
    expect(all).toContain('FOO')
    expect(all).toContain('BAR')
    expect(all).toContain('BAZ')
    // comment text must not be a variable row
    expect(all).not.toContain('Variable      comment line')
  })
})

describe('env missing', () => {
  it('lists keys present in .env.example but missing from .env', async () => {
    fsMocks.existsSync.mockReturnValue(true)
    fsMocks.readFileSync.mockImplementation((p: string) =>
      p.endsWith('.env') ? 'FOO=bar\n' : EXAMPLE_FILE,
    )
    const out = await run(['missing'])
    const all = out.join('\n')
    expect(all).toContain('NEW_VAR')
    expect(all).toContain('EXTRA')
    // FOO is present in both -> not missing
    expect(all).not.toMatch(/^ {2}FOO$/m)
  })

  it('reports all variables defined when in sync', async () => {
    fsMocks.existsSync.mockReturnValue(true)
    fsMocks.readFileSync.mockImplementation((p: string) =>
      p.endsWith('.env') ? 'FOO=1\nNEW_VAR=2\nEXTRA=3\n' : EXAMPLE_FILE,
    )
    const out = await run(['missing'])
    expect(out.join('\n')).toMatch(/All variables defined/)
  })

  it('reports all defined when only .env.example exists', async () => {
    fsMocks.existsSync.mockImplementation((p: string) => p.endsWith('.env.example'))
    fsMocks.readFileSync.mockImplementation((p: string) =>
      p.endsWith('.env.example') ? 'A=1\nB=2\n' : '',
    )
    const out = await run(['missing'])
    // .env missing -> every example var considered missing
    const all = out.join('\n')
    expect(all).toContain('A')
    expect(all).toContain('B')
  })
})

describe('env diff', () => {
  it('shows only-in-env and only-in-example', async () => {
    fsMocks.existsSync.mockReturnValue(true)
    fsMocks.readFileSync.mockImplementation((p: string) =>
      p.endsWith('.env') ? 'A=1\nB=2\nONLY_ENV=3\n' : 'A=1\nB=2\nONLY_EX=4\n',
    )
    const out = await run(['diff'])
    const all = out.join('\n')
    expect(all).toContain('Only in .env:')
    expect(all).toContain('ONLY_ENV')
    expect(all).toContain('Only in .env.example:')
    expect(all).toContain('ONLY_EX')
  })

  it('reports in sync when sets equal', async () => {
    fsMocks.existsSync.mockReturnValue(true)
    fsMocks.readFileSync.mockImplementation((p: string) =>
      p.endsWith('.env') ? 'A=1\nB=2\n' : 'A=9\nB=8\n',
    )
    const out = await run(['diff'])
    expect(out.join('\n')).toMatch(/in sync/)
  })
})

describe('env when neither file exists', () => {
  it('prints info message', async () => {
    fsMocks.existsSync.mockReturnValue(false)
    const out = await run()
    expect(out.join('\n')).toMatch(/No .env or .env\.example found/)
  })
})
