import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'

const execMock = vi.fn()
vi.mock('node:child_process', () => ({ execSync: execMock }))

const fsMocks = {
  existsSync: vi.fn<(p: string) => boolean>(() => false),
}
vi.mock('node:fs', () => fsMocks)

const osMocks = {
  platform: vi.fn(() => 'linux'),
  totalmem: vi.fn(() => 8 * 1e9),
  freemem: vi.fn(() => 4 * 1e9),
  cpus: vi.fn(() => [0, 1, 2]),
}
vi.mock('node:os', () => osMocks)

const { createDoctorPlugin } = await import('../packages/plugins/doctor/src/index')

let stdoutSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  execMock.mockReset()
  vi.mocked(fsMocks.existsSync).mockReset()
  vi.mocked(osMocks.platform).mockReturnValue('linux')
  vi.mocked(osMocks.totalmem).mockReturnValue(8 * 1e9)
  vi.mocked(osMocks.freemem).mockReturnValue(4 * 1e9)
  vi.mocked(osMocks.cpus).mockReturnValue([0, 1, 2])
})
afterEach(() => stdoutSpy.mockRestore())

function doctorCmd(program: Command): Command {
  const c = program.commands.find((x) => x.name() === 'doctor')
  if (!c) throw new Error('doctor not found')
  return c
}
async function run(): Promise<string[]> {
  stdoutSpy.mockClear()
  const program = new Command()
  createDoctorPlugin().register(program)
  await doctorCmd(program).parseAsync(['node', 'test'])
  return stdoutSpy.mock.calls.map((c) => String(c[0]))
}

function setFoundBin(version: string) {
  execMock.mockImplementation((cmd: string) => {
    if (cmd.endsWith('--version')) return version
    throw new Error('not found')
  })
}

describe('doctor plugin registration', () => {
  it('registers doctor command with correct manifest', () => {
    const p = createDoctorPlugin()
    expect(p.manifest.name).toBe('doctor')
    expect(p.manifest.category).toBe('dev')
    const prog = new Command()
    p.register(prog)
    expect(prog.commands.map((c) => c.name())).toContain('doctor')
  })
})

describe('runDoctor', () => {
  it('reports found binaries with versions', async () => {
    setFoundBin('v20.0.0')
    fsMocks.existsSync.mockReturnValue(false)
    const out = await run()
    const all = out.join('')
    expect(all).toContain('node')
    expect(all).toContain('npm')
    expect(all).toContain('git')
    expect(all).toContain('v20.0.0')
  })

  it('reports missing binaries', async () => {
    execMock.mockImplementation(() => {
      throw new Error('not found')
    })
    fsMocks.existsSync.mockReturnValue(false)
    const out = await run()
    expect(out.join('')).toContain('docker')
  })

  it('detects .env presence', async () => {
    setFoundBin('v1')
    vi.mocked(fsMocks.existsSync).mockImplementation((p: string) => p.endsWith('/.env'))
    const out = await run()
    expect(out.join('')).toContain('.env')
  })

  it('detects tsconfig.json presence', async () => {
    setFoundBin('v1')
    vi.mocked(fsMocks.existsSync).mockImplementation((p: string) => p.endsWith('tsconfig.json'))
    const out = await run()
    expect(out.join('')).toContain('TypeScript')
    expect(out.join('')).toContain('tsconfig.json found')
  })

  it('prints memory, cpu, platform summary', async () => {
    setFoundBin('v1')
    vi.mocked(fsMocks.existsSync).mockReturnValue(false)
    const all = (await run()).join('')
    expect(all).toContain('Memory')
    expect(all).toContain('8.0GB')
    expect(all).toContain('CPUs')
    expect(all).toContain('3 cores')
    expect(all).toContain('Platform')
    expect(all).toContain('linux')
  })
})
