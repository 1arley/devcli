import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'
import { childProcessMockFactory } from './helpers/child-process-mock'

const { execMock } = vi.hoisted(() => ({ execMock: vi.fn() }))
vi.mock('node:child_process', () => childProcessMockFactory(execMock))

const { createGitPlugin } = await import('../packages/plugins/git/src/index')

let logSpy: ReturnType<typeof vi.spyOn>
let program: Command

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  execMock.mockReset()
  program = new Command()
  createGitPlugin().register(program)
})
afterEach(() => logSpy.mockRestore())

function gitCmd(): Command {
  const c = program.commands.find((x) => x.name() === 'git')
  if (!c) throw new Error('git not found')
  return c
}
function sub(name: string): Command {
  const c = gitCmd().commands.find((x) => x.name() === name)
  if (!c) throw new Error(`git ${name} not found`)
  return c
}
async function run(action: string, args: string[] = []): Promise<string[]> {
  logSpy.mockClear()
  if (action === 'root') await gitCmd().parseAsync(['node', 'test', ...args])
  else await sub(action).parseAsync(['node', 'test', ...args])
  return logSpy.mock.calls.map((a) => String(a[0]))
}

describe('git plugin registration', () => {
  it('registers git command with subcommands and correct manifest', () => {
    const p = createGitPlugin()
    expect(p.manifest.name).toBe('git')
    expect(p.manifest.category).toBe('git')
    const prog = new Command()
    p.register(prog)
    const g = prog.commands.find((c) => c.name() === 'git')
    expect(g?.commands.map((c) => c.name()).sort()).toEqual(['branches', 'log', 'stash', 'status'])
  })
})

describe('isRepo false paths', () => {
  it('root action not-a-repo message', async () => {
    execMock.mockReturnValue('')
    const out = await run('root')
    expect(out.join('\n')).toMatch(/Not a Git repository/)
  })

  it('branches not-a-repo', async () => {
    execMock.mockReturnValue('')
    const out = await run('branches')
    expect(out.join('\n')).toMatch(/Not a Git repository/)
  })

  it('status not-a-repo', async () => {
    execMock.mockReturnValue('')
    const out = await run('status')
    expect(out.join('\n')).toMatch(/Not a Git repository/)
  })

  it('log not-a-repo', async () => {
    execMock.mockReturnValue('')
    const out = await run('log', ['5'])
    expect(out.join('\n')).toMatch(/Not a Git repository/)
  })

  it('stash not-a-repo', async () => {
    execMock.mockReturnValue('')
    const out = await run('stash')
    expect(out.join('\n')).toMatch(/Not a Git repository/)
  })
})

describe('isRepo true paths', () => {
  function inRepo(map: Record<string, string>) {
    execMock.mockImplementation((cmd: string) => {
      const key = Object.keys(map).find((k) => cmd === `git ${k}`)
      return key ? map[key]! : ''
    })
  }

  it('root prints branch/ahead/behind/stash/modified', async () => {
    inRepo({
      'rev-parse --is-inside-work-tree': 'true',
      'rev-parse --abbrev-ref HEAD': 'main',
      'rev-list --count @{u}..HEAD': '2',
      'rev-list --count HEAD..@{u}': '3',
      'stash list': 'stash@{0}: WIP\nstash@{1}: WIP',
      'status --porcelain': 'M file.ts\n A other.ts',
    })
    const all = (await run('root')).join('\n')
    expect(all).toContain('main')
    expect(all).toContain('Branch')
    expect(all).toMatch(/Ahead.*2/)
    expect(all).toMatch(/Behind.*3/)
    expect(all).toMatch(/Stashes.*2/)
    expect(all).toMatch(/Modified.*2/)
  })

  it('branches lists entries marking current', async () => {
    inRepo({
      'rev-parse --is-inside-work-tree': 'true',
      'branch -vv': '* main 123abc [origin/main]\n  feat 456def',
    })
    const out = await run('branches')
    const all = out.join('\n')
    expect(all).toContain('main')
    expect(all).toContain('feat')
  })

  it('status clean tree', async () => {
    inRepo({
      'rev-parse --is-inside-work-tree': 'true',
      'status --porcelain': '',
    })
    const out = await run('status')
    expect(out.join('\n')).toMatch(/Working tree clean/)
  })

  it('status dirty list', async () => {
    inRepo({
      'rev-parse --is-inside-work-tree': 'true',
      'status --porcelain': 'M  a.ts\n?? b.ts',
    })
    const out = await run('status')
    const all = out.join('\n')
    expect(all).toContain('a.ts')
    expect(all).toContain('b.ts')
  })

  it('log prints commits', async () => {
    inRepo({
      'rev-parse --is-inside-work-tree': 'true',
      'log --oneline -10': 'abc123 first\ndef456 second',
    })
    const out = await run('log', ['10'])
    expect(out.join('\n')).toContain('abc123')
    expect(out.join('\n')).toContain('def456')
  })

  it('stash empty message', async () => {
    inRepo({
      'rev-parse --is-inside-work-tree': 'true',
      'stash list': '',
    })
    const out = await run('stash')
    expect(out.join('\n')).toMatch(/No stashes/)
  })

  it('stash lists entries', async () => {
    inRepo({
      'rev-parse --is-inside-work-tree': 'true',
      'stash list': 'stash@{0}: WIP on main',
    })
    const out = await run('stash')
    expect(out.join('\n')).toContain('WIP on main')
  })
})
