import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'

const execMock = vi.fn()
vi.mock('node:child_process', () => ({ execSync: execMock }))

const { createPortsPlugin } = await import('../packages/plugins/ports/src/index')

const origPlatform = process.platform

let logSpy: ReturnType<typeof vi.spyOn>
let program: Command

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  program = new Command()
  createPortsPlugin().register(program)
  execMock.mockReset()
})
afterEach(() => {
  logSpy.mockRestore()
  Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true })
})

function portsCmd(): Command {
  const c = program.commands.find((x) => x.name() === 'ports')
  if (!c) throw new Error('ports not found')
  return c
}
function sub(name: string): Command {
  const c = portsCmd().commands.find((x) => x.name() === name)
  if (!c) throw new Error(`ports ${name} not found`)
  return c
}
async function run(action: string, args: string[] = []): Promise<string[]> {
  logSpy.mockClear()
  if (action === 'root') await portsCmd().parseAsync(['node', 'test', ...args])
  else await sub(action).parseAsync(['node', 'test', ...args])
  return logSpy.mock.calls.map((a) => String(a[0]))
}

// Simulate linux platform for parseUnixPorts tests.
function setLinux() {
  Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
}
function setWin() {
  Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
}

const UNIX_OUTPUT = [
  'COMMAND   PID   USER   FD   TYPE   DEVICE  SIZE/OFF NODE NAME',
  'node      1234 user    7u   IPv4   0x1      0t0   TCP *:3000 (LISTEN)',
  'python    5678 user    3u   IPv6   0x2      0t0   TCP [::]:8080 (LISTEN)',
  'nginx     9999 user    4u   IPv4   0x3      0t0   TCP *:443 (LISTEN)',
].join('\n')

describe('ports plugin registration', () => {
  it('registers ports command with subcommands and correct manifest', () => {
    const p = createPortsPlugin()
    expect(p.manifest.name).toBe('ports')
    expect(p.manifest.category).toBe('utility')
    const prog = new Command()
    p.register(prog)
    const pt = prog.commands.find((c) => c.name() === 'ports')
    expect(pt?.commands.map((c) => c.name()).sort()).toEqual(['free', 'kill'])
  })
})

describe('parseUnixPorts', () => {
  it('parses lsof output into PortInfo rows', async () => {
    setLinux()
    execMock.mockReturnValue(UNIX_OUTPUT)
    const out = await run('root')
    const all = out.join('\n')
    expect(all).toContain('3000')
    expect(all).toContain('1234')
    expect(all).toContain('node')
    expect(all).toContain('8080')
    expect(all).toContain('5678')
    expect(all).toContain('python')
  })

  it('reports no listening ports when output empty', async () => {
    setLinux()
    execMock.mockReturnValue('')
    const out = await run('root')
    expect(out.join('\n')).toMatch(/No listening ports found/)
  })

  it('skips malformed lines with < 9 fields', async () => {
    setLinux()
    execMock.mockReturnValue(
      ['COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME', 'short line'].join('\n'),
    )
    const out = await run('root')
    expect(out.join('\n')).toMatch(/No listening ports found/)
  })

  it('free subcommand lists ports in use', async () => {
    setLinux()
    execMock.mockReturnValue(UNIX_OUTPUT)
    const out = await run('free')
    const all = out.join('\n')
    expect(all).toMatch(/3 port/)
    expect(all).toContain('3000')
  })

  it('free reports all free when none', async () => {
    setLinux()
    execMock.mockReturnValue('')
    const out = await run('free')
    expect(out.join('\n')).toMatch(/All ports are free/)
  })

  it('getPorts swallows exec errors and returns []', async () => {
    setLinux()
    execMock.mockImplementation(() => {
      throw new Error('boom')
    })
    const out = await run('free')
    expect(out.join('\n')).toMatch(/All ports are free/)
  })
})

describe('killPort (unix)', () => {
  it('kill success returns true', async () => {
    setLinux()
    execMock.mockReturnValue('1234')
    const out = await run('kill', ['3000'])
    expect(execMock).toHaveBeenCalledWith(
      'lsof -ti:3000 | xargs kill -9',
      expect.objectContaining({ stdio: 'pipe' }),
    )
    expect(out.join('\n')).toMatch(/Killed process on port 3000/)
  })

  it('kill failure returns false', async () => {
    setLinux()
    execMock.mockImplementation(() => {
      throw new Error('fail')
    })
    const out = await run('kill', ['3000'])
    expect(out.join('\n')).toMatch(/Could not kill process on port 3000/)
  })
})

describe('parseWindowsPorts', () => {
  it('parses netstat + tasklist output', async () => {
    setWin()
    const NETSTAT = [
      '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       1111',
      '  TCP    0.0.0.0:8080           0.0.0.0:0              LISTENING       2222',
    ].join('\n')
    execMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith('netstat')) return NETSTAT
      // tasklist for pid 1111 / 2222
      const m = cmd.match(/PID eq (\d+)/)
      return m?.[1] === '1111' ? '"node.exe","1111","Console"' : '"py.exe","2222","Console"'
    })
    const out = await run('root')
    const all = out.join('\n')
    expect(all).toContain('3000')
    expect(all).toContain('node')
    expect(all).toContain('8080')
  })

  it('windows kill uses taskkill', async () => {
    setWin()
    execMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith('netstat')) return '  TCP 0.0.0.0:3000 0.0.0.0:0 LISTENING 4321'
      return ''
    })
    const out = await run('kill', ['3000'])
    expect(execMock).toHaveBeenCalledWith(
      'taskkill /PID 4321 /F',
      expect.objectContaining({ stdio: 'pipe' }),
    )
    expect(out.join('\n')).toMatch(/Killed/)
  })
})
