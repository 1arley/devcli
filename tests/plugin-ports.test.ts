import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'
import { childProcessMockFactory } from './helpers/child-process-mock'

const { execMock } = vi.hoisted(() => ({ execMock: vi.fn() }))
vi.mock('node:child_process', () => childProcessMockFactory(execMock))

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

function setLinux() {
  Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
}
function setWin() {
  Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
}

// Realistic `ss -tlnpH` output: process name + pid in the users:() block.
const SS_OUTPUT = [
  'State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process',
  'LISTEN 0      128    0.0.0.0:3000       0.0.0.0:*    users:(("node",pid=1234,fd=7))',
  'LISTEN 0      128    [::]:8080         [::]:*        users:(("python",pid=5678,fd=3))',
  'LISTEN 0      128    0.0.0.0:443       0.0.0.0:*    users:(("nginx",pid=9999,fd=4))',
].join('\n')

/**
 * Build a unix mock dispatcher. `ss` is the primary source. Provide either a
 * full ss response or a per-port users:() block via the override map.
 */
type UnixMock = {
  ss?: string
  ssUdp?: string
  lsof?: string
  fuser?: string
  /** pid -> returns ss listening line for that port (post-kill verify) */
  listeningPorts?: string[]
}

function mockUnix(cfg: UnixMock) {
  execMock.mockImplementation((cmd: string) => {
    if (cmd.includes('ss -tlnpH') || cmd.includes('ss -tlnp ')) {
      if (cmd.includes('( dport')) return cfg.ss ?? '' // targeted query
      return cfg.ss ?? ''
    }
    if (cmd.includes('ss -ulnp')) return cfg.ssUdp ?? ''
    if (cmd.startsWith('lsof -iTCP')) return cfg.lsof ?? ''
    if (cmd.startsWith('lsof -ti')) return cfg.lsof ?? ''
    if (cmd.startsWith('fuser')) return cfg.fuser ?? ''
    if (cmd.startsWith('sleep')) return ''
    if (cmd.startsWith('kill -TERM')) return ''
    if (cmd.startsWith('kill -9')) return ''
    return ''
  })
}

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
  it('parses ss output into PortInfo rows', async () => {
    setLinux()
    mockUnix({ ss: SS_OUTPUT })
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
    mockUnix({ ss: '' })
    const out = await run('root')
    expect(out.join('\n')).toMatch(/No listening ports found/)
  })

  it('skips malformed lines', async () => {
    setLinux()
    mockUnix({ ss: ['garbage line', 'still not ports'].join('\n') })
    const out = await run('root')
    expect(out.join('\n')).toMatch(/No listening ports found/)
  })

  it('free subcommand lists ports in use', async () => {
    setLinux()
    mockUnix({ ss: SS_OUTPUT })
    const out = await run('free')
    const all = out.join('\n')
    expect(all).toMatch(/3 port/)
    expect(all).toContain('3000')
  })

  it('free reports all free when none', async () => {
    setLinux()
    mockUnix({ ss: '' })
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

  it('backfills pid from lsof when ss omits users block', async () => {
    setLinux()
    // ss reports the port but no users:() (foreign process, no perms)
    const ssNoPid = [
      'LISTEN 0 128 0.0.0.0:5432 0.0.0.0:*',
      'LISTEN 0 128 0.0.0.0:8080 0.0.0.0:* users:(("python",pid=5678,fd=3))',
    ].join('\n')
    const lsof = [
      'COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME',
      'postgres 7777 db 5u IPv4 0 0t0 TCP *:5432 (LISTEN)',
    ].join('\n')
    mockUnix({ ss: ssNoPid, lsof })
    const out = await run('root')
    const all = out.join('\n')
    expect(all).toContain('5432')
    expect(all).toContain('7777')
    expect(all).toContain('postgres')
  })
})

describe('killPort (unix)', () => {
  it('kill success kills process (SIGTERM then verify)', async () => {
    setLinux()
    // ss finds pid 1234, lsof/fuser empty. After kill, ss reports nothing.
    let killed = false
    const ssListening = 'LISTEN 0 128 0.0.0.0:3000 0.0.0.0:* users:(("node",pid=1234,fd=7))'
    execMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith('sleep')) return ''
      if (cmd.startsWith('kill')) {
        killed = true
        return ''
      }
      if (cmd.startsWith('ss')) return killed ? '' : ssListening
      if (cmd.startsWith('lsof -ti')) return killed ? '' : '1234'
      if (cmd.startsWith('fuser')) return killed ? '' : '1234'
      if (cmd.startsWith('lsof -iTCP')) return ''
      return ''
    })
    const out = await run('kill', ['3000'])
    expect(out.join('\n')).toMatch(/Killed process on port 3000/)
  })

  it('kill on free port reports already free', async () => {
    setLinux()
    // every source returns nothing → resolvePids empty, ss says not listening
    execMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith('sleep')) return ''
      if (cmd.startsWith('ss -tlnpH 2>/dev/null')) return ''
      if (cmd.includes('( dport')) return ''
      return ''
    })
    const out = await run('kill', ['9999'])
    expect(out.join('\n')).toMatch(/already free/)
  })

  it('kill escalates to SIGKILL if SIGTERM not enough', async () => {
    setLinux()
    let termSent = false
    let killedSent = false
    const ssListening = 'LISTEN 0 128 0.0.0.0:3000 0.0.0.0:* users:(("node",pid=1234,fd=7))'
    execMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith('sleep')) return ''
      if (cmd.startsWith('kill -TERM')) {
        termSent = true
        return ''
      }
      if (cmd.startsWith('kill -9')) {
        killedSent = true
        return ''
      }
      const live = !killedSent
      if (cmd.startsWith('ss') && cmd.includes('( dport'))
        return live ? 'users:(("node",pid=1234,fd=7))' : ''
      if (cmd.startsWith('ss -tlnpH 2>/dev/null')) return live ? ssListening : ''
      if (cmd.startsWith('lsof -ti')) return live ? '1234' : ''
      if (cmd.startsWith('fuser')) return live ? '1234' : ''
      return ''
    })
    const out = await run('kill', ['3000'])
    expect(termSent).toBe(true)
    expect(killedSent).toBe(true)
    expect(out.join('\n')).toMatch(/Killed process on port 3000/)
  })

  it('kill reports permission barrier when pid unresolvable but port listening', async () => {
    setLinux()
    // foreign process: all pid resolvers return nothing, but ss still shows LISTEN
    const ssListening = 'LISTEN 0 128 0.0.0.0:5432 0.0.0.0:*'
    execMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith('sleep')) return ''
      if (cmd.startsWith('kill')) return ''
      // portStillListening runs `ss -tlnpH` (no shell/no redirect)
      if (cmd === 'ss -tlnpH') return ssListening
      if (cmd.includes('( dport')) return ssListening
      return '' // lsof/fuser empty → no pid from user's perspective
    })
    const out = await run('kill', ['5432'])
    expect(out.join('\n')).toMatch(/still listening/)
  })

  it('kill handles multiple PIDs on same port', async () => {
    setLinux()
    let killed = false
    const ssListening = [
      'LISTEN 0 128 0.0.0.0:13469 0.0.0.0:* users:(("main",pid=11819,fd=82))',
      'LISTEN 0 128 0.0.0.0:13469 0.0.0.0:* users:(("wineserver",pid=11962,fd=1093))',
    ].join('\n')
    execMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith('sleep')) return ''
      if (cmd.startsWith('kill')) killed = true
      if (cmd.startsWith('ss') && cmd.includes('( dport')) return killed ? '' : ssListening
      if (cmd.startsWith('ss -tlnpH 2>/dev/null')) return killed ? '' : ssListening
      return ''
    })
    const out = await run('kill', ['13469'])
    expect(out.join('\n')).toMatch(/Killed process on port 13469/)
  })
})

describe('parseWindowsPorts', () => {
  const NETSTAT = [
    '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       1111',
    '  TCP    0.0.0.0:8080           0.0.0.0:0              LISTENING       2222',
  ].join('\n')

  it('parses netstat + tasklist output', async () => {
    setWin()
    execMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith('netstat') && cmd.endsWith('findstr LISTENING')) return NETSTAT
      if (cmd.startsWith('netstat') && cmd.includes('findstr :3000')) {
        return '  TCP 0.0.0.0:3000 0.0.0.0:0 LISTENING 1111'
      }
      if (cmd.startsWith('tasklist')) {
        const m = cmd.match(/PID eq (\d+)/)
        return m?.[1] === '1111' ? '"node.exe","1111","Console"' : '"py.exe","2222","Console"'
      }
      return ''
    })
    const out = await run('root')
    const all = out.join('\n')
    expect(all).toContain('3000')
    expect(all).toContain('node')
    expect(all).toContain('8080')
  })

  it('windows kill uses taskkill', async () => {
    setWin()
    let killed = false
    execMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith('netstat')) {
        return killed
          ? ''
          : '  TCP 0.0.0.0:3000 0.0.0.0:0 LISTENING 4321  \n  TCP 0.0.0.0:3000 0.0.0.0:0 LISTENING 4321'
      }
      if (cmd.startsWith('taskkill')) {
        killed = true
        return ''
      }
      return ''
    })
    const out = await run('kill', ['3000'])
    expect(execMock).toHaveBeenCalledWith(
      'taskkill /PID 4321 /F',
      expect.objectContaining({ stdio: 'pipe' }),
    )
    expect(out.join('\n')).toMatch(/Killed/)
  })

  it('windows kill handles multiple PIDs', async () => {
    setWin()
    let killed = false
    execMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith('netstat')) {
        return killed
          ? ''
          : '  TCP 0.0.0.0:3000 0.0.0.0:0 LISTENING 4321\n  TCP 0.0.0.0:3000 0.0.0.0:0 LISTENING 5555'
      }
      if (cmd.startsWith('taskkill')) {
        killed = true
        return ''
      }
      return ''
    })
    const out = await run('kill', ['3000'])
    expect(execMock).toHaveBeenCalledWith(
      'taskkill /PID 4321 /F',
      expect.objectContaining({ stdio: 'pipe' }),
    )
    expect(execMock).toHaveBeenCalledWith(
      'taskkill /PID 5555 /F',
      expect.objectContaining({ stdio: 'pipe' }),
    )
    expect(out.join('\n')).toMatch(/Killed/)
  })
})
