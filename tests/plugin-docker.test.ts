import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'

const execMock = vi.fn()
vi.mock('node:child_process', () => ({ execSync: execMock }))

const { createDockerPlugin } = await import('../packages/plugins/docker/src/index')

let logSpy: ReturnType<typeof vi.spyOn>
let program: Command

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  program = new Command()
  createDockerPlugin().register(program)
  execMock.mockReset()
})
afterEach(() => logSpy.mockRestore())

function dockerCmd(): Command {
  const c = program.commands.find((x) => x.name() === 'docker')
  if (!c) throw new Error('docker not found')
  return c
}
function sub(name: string): Command {
  const c = dockerCmd().commands.find((x) => x.name() === name)
  if (!c) throw new Error(`docker ${name} not found`)
  return c
}
async function run(action: string, args: string[] = []): Promise<string[]> {
  logSpy.mockClear()
  if (action === 'root') await dockerCmd().parseAsync(['node', 'test', ...args])
  else await sub(action).parseAsync(['node', 'test', ...args])
  return logSpy.mock.calls.map((a) => String(a[0]))
}

describe('docker plugin registration', () => {
  it('registers docker command with subcommands and correct manifest', () => {
    const p = createDockerPlugin()
    expect(p.manifest.name).toBe('docker')
    expect(p.manifest.category).toBe('docker')
    const prog = new Command()
    p.register(prog)
    const d = prog.commands.find((c) => c.name() === 'docker')
    expect(d?.commands.map((c) => c.name()).sort()).toEqual([
      'containers',
      'disk',
      'images',
      'networks',
      'prune',
      'volumes',
    ])
  })
})

describe('parseContainerTable', () => {
  const CONTAINERS = [
    'abc123\tnginx\tweb\tUp 2 hours\t0.0.0.0:80->80/tcp',
    'def456\tredis\tcache\tExited (0) 1h ago\t',
  ].join('\n')

  it('parses rows into ID/Image/Name/Status/Ports', async () => {
    execMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith('docker ps')) return CONTAINERS
      return ''
    })
    const out = await run('containers')
    const all = out.join('\n')
    expect(all).toContain('abc123')
    expect(all).toContain('nginx')
    expect(all).toContain('web')
    expect(all).toContain('redis')
  })

  it('handles empty output', async () => {
    execMock.mockReturnValue('')
    const out = await run('containers')
    expect(out.join('\n')).toMatch(/No containers found/)
  })

  it('root docker action lists containers', async () => {
    execMock.mockImplementation((cmd: string) => (cmd.startsWith('docker ps') ? CONTAINERS : ''))
    const out = await run('root')
    expect(out.join('\n')).toContain('abc123')
  })
})

describe('parseImages', () => {
  const IMAGES = ['node\t18\t950MB\txyz', 'redis\t7\t138MB\tqqq'].join('\n')
  it('parses Repository/Tag/Size/ID', async () => {
    execMock.mockImplementation((c: string) => (c.startsWith('docker images') ? IMAGES : ''))
    const out = await run('images')
    const all = out.join('\n')
    expect(all).toContain('node')
    expect(all).toContain('18')
    expect(all).toContain('redis')
  })
  it('empty -> no images', async () => {
    execMock.mockReturnValue('')
    const out = await run('images')
    expect(out.join('\n')).toMatch(/No images found/)
  })
})

describe('parseVolumes', () => {
  const VOLS = ['local\tapp_data', 'local\tlogs'].join('\n')
  it('parses Driver/Name', async () => {
    execMock.mockImplementation((c: string) => (c.startsWith('docker volume') ? VOLS : ''))
    const out = await run('volumes')
    const all = out.join('\n')
    expect(all).toContain('app_data')
    expect(all).toContain('logs')
  })
  it('empty -> no volumes', async () => {
    execMock.mockReturnValue('')
    const out = await run('volumes')
    expect(out.join('\n')).toMatch(/No volumes found/)
  })
})

describe('parseNetworks', () => {
  const NETS = ['n1\tbridge\tbridge', 'n2\tmynet\toverlay'].join('\n')
  it('parses ID/Name/Driver', async () => {
    execMock.mockImplementation((c: string) => (c.startsWith('docker network') ? NETS : ''))
    const out = await run('networks')
    const all = out.join('\n')
    expect(all).toContain('bridge')
    expect(all).toContain('mynet')
  })
  it('empty -> no networks', async () => {
    execMock.mockReturnValue('')
    const out = await run('networks')
    expect(out.join('\n')).toMatch(/No networks found/)
  })
})

describe('disk / prune', () => {
  it('disk prints usage if available', async () => {
    execMock.mockImplementation((c: string) =>
      c.startsWith('docker system df') ? 'TYPE TOTAL SIZE\nImages 1 100MB' : '',
    )
    const out = await run('disk')
    expect(out.join('\n')).toContain('Images')
  })
  it('disk errors when empty', async () => {
    execMock.mockReturnValue('')
    const out = await run('disk')
    expect(out.join('\n')).toMatch(/Could not get disk usage/)
  })
  it('prune without --force warns', async () => {
    const out = await run('prune', [])
    expect(out.join('\n')).toMatch(/--force/)
    expect(execMock).not.toHaveBeenCalledWith('docker system prune -af')
  })
  it('prune --force runs command', async () => {
    execMock.mockReturnValue('pruned output')
    const out = await run('prune', ['--force'])
    expect(execMock).toHaveBeenCalledWith(
      'docker system prune -af',
      expect.objectContaining({ encoding: 'utf-8' }),
    )
    expect(out.join('\n')).toContain('pruned output')
  })
})
