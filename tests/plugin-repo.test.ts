import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'

type Fs = {
  existsSync: (p: string) => boolean
  readFileSync: (p: string, enc: string) => string
  readdirSync: (p: string) => string[]
  statSync: (p: string) => { isDirectory(): boolean }
}

const fsMocks: Fs = {
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ''),
  readdirSync: vi.fn(() => []),
  statSync: vi.fn(() => ({ isDirectory: () => false })),
}

vi.mock('node:fs', () => fsMocks)

const { createRepoPlugin } = await import('../packages/plugins/repo/src/index')

let logSpy: ReturnType<typeof vi.spyOn>
let program: Command

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  program = new Command()
  createRepoPlugin().register(program)
  vi.mocked(fsMocks.existsSync).mockReset()
  vi.mocked(fsMocks.readFileSync).mockReset()
  vi.mocked(fsMocks.readdirSync).mockReset()
  vi.mocked(fsMocks.statSync).mockReset()
})
afterEach(() => logSpy.mockRestore())

function repoCmd(): Command {
  const c = program.commands.find((x) => x.name() === 'repo')
  if (!c) throw new Error('repo not found')
  return c
}
async function run(path: string = '/fake'): Promise<string[]> {
  logSpy.mockClear()
  await repoCmd().parseAsync(['node', 'test', path])
  return logSpy.mock.calls.map((a) => String(a[0]))
}

/**
 * Configure fs mocks so that:
 *  - `existsSync` returns true only for given absolute paths (files).
 *  - `readFileSync` returns the provided package.json content (for analyze).
 *  - `readdirSync` returns `topDirs` only at the project root and `[]` anywhere
 *    else, which keeps `countFiles` recursion (walk) finite in tests.
 *  - `statSync` marks the given `dirNames` (top-level dirs) as directories only.
 */
function setupProject(opts: {
  files?: string[]
  pkg?: Record<string, unknown>
  topDirs?: string[]
  dirs?: string[] // absolute subdirs reported by readdirSync AND treated as dirs
}): void {
  const files = new Set(opts.files ?? [])
  const topDirs = opts.topDirs ?? []
  const dirNames = new Set(opts.dirs ?? [])
  vi.mocked(fsMocks.existsSync).mockImplementation((p) => files.has(p))
  vi.mocked(fsMocks.readFileSync).mockImplementation((p) =>
    p.endsWith('package.json') ? JSON.stringify(opts.pkg ?? {}) : '',
  )
  vi.mocked(fsMocks.readdirSync).mockImplementation((p) => (p === '/fake' ? topDirs : []))
  vi.mocked(fsMocks.statSync).mockImplementation((p) => ({
    // treat paths matching a tracked dir name as directories; everything else a file
    isDirectory: () =>
      [...files].some((f) => f === p)
        ? false
        : dirNames.has(p) || topDirs.includes(p.split('/').pop() ?? ''),
  }))
}

describe('repo plugin registration', () => {
  it('registers repo command with correct manifest', () => {
    const p = createRepoPlugin()
    expect(p.manifest.name).toBe('repo')
    expect(p.manifest.category).toBe('dev')
    const prog = new Command()
    p.register(prog)
    expect(prog.commands.map((c) => c.name())).toContain('repo')
  })
})

describe('detectFramework (via analyze output)', () => {
  it('detects Next.js', async () => {
    setupProject({
      files: ['/fake/package.json'],
      pkg: { dependencies: { next: '14.0.0', react: '18' } },
    })
    const out = await run('/fake')
    expect(out.join('\n')).toContain('Next.js')
  })

  it('detects Express', async () => {
    setupProject({
      files: ['/fake/package.json'],
      pkg: { dependencies: { express: '4.18' } },
    })
    const out = await run('/fake')
    expect(out.join('\n')).toContain('Express')
  })

  it('detects React alone', async () => {
    setupProject({
      files: ['/fake/package.json'],
      pkg: { dependencies: { react: '18' } },
    })
    const out = await run('/fake')
    expect(out.join('\n')).toContain('React')
  })

  it('reports Unknown when no known framework deps', async () => {
    setupProject({ files: ['/fake/package.json'], pkg: { dependencies: { lodash: '4' } } })
    const out = await run('/fake')
    expect(out.join('\n')).toContain('Unknown')
  })
})

describe('detectLanguage (via analyze output)', () => {
  it('TypeScript when tsconfig.json present', async () => {
    setupProject({ files: ['/fake/package.json', '/fake/tsconfig.json'] })
    const out = await run('/fake')
    expect(out.join('\n')).toContain('TypeScript')
  })

  it('Go when go.mod present', async () => {
    setupProject({ files: ['/fake/go.mod'] })
    const out = await run('/fake')
    expect(out.join('\n')).toContain('Go')
  })

  it('Python when requirements.txt present', async () => {
    setupProject({ files: ['/fake/requirements.txt'] })
    const out = await run('/fake')
    expect(out.join('\n')).toContain('Python')
  })

  it('Unknown when nothing detectable', async () => {
    setupProject({ files: [] })
    const out = await run('/fake')
    expect(out.join('\n')).toContain('Unknown')
  })
})

describe('detectPackageManager (via analyze output)', () => {
  it('pnpm when pnpm-lock.yaml present', async () => {
    setupProject({ files: ['/fake/package.json', '/fake/pnpm-lock.yaml'] })
    const out = await run('/fake')
    expect(out.join('\n')).toContain('pnpm')
  })

  it('yarn when yarn.lock present', async () => {
    setupProject({ files: ['/fake/package.json', '/fake/yarn.lock'] })
    const out = await run('/fake')
    expect(out.join('\n')).toContain('yarn')
  })

  it('npm when package-lock.json present', async () => {
    setupProject({ files: ['/fake/package.json', '/fake/package-lock.json'] })
    const out = await run('/fake')
    expect(out.join('\n')).toMatch(/npm/)
  })

  it('unknown when no lockfile', async () => {
    setupProject({ files: ['/fake/package.json'] })
    const out = await run('/fake')
    expect(out.join('\n')).toContain('unknown')
  })
})

describe('detectArchitecture (via analyze output)', () => {
  it('Monorepo when pnpm-workspace.yaml present', async () => {
    setupProject({
      files: ['/fake/package.json', '/fake/pnpm-workspace.yaml'],
      topDirs: [],
    })
    const out = await run('/fake')
    expect(out.join('\n')).toContain('Monorepo')
  })

  it('src/ with tests when src+tests dirs exist', async () => {
    setupProject({
      files: ['/fake/package.json'],
      topDirs: ['src', 'tests'],
      dirs: ['/fake/src', '/fake/tests'],
    })
    const out = await run('/fake')
    expect(out.join('\n')).toContain('src/ with tests')
  })

  it('src/ only when src dir exists', async () => {
    setupProject({
      files: ['/fake/package.json'],
      topDirs: ['src'],
      dirs: ['/fake/src'],
    })
    const out = await run('/fake')
    expect(out.join('\n')).toContain('src/')
    expect(out.join('\n')).not.toContain('src/ with tests')
  })

  it('flat when no special dirs', async () => {
    setupProject({ files: ['/fake/package.json'], topDirs: [] })
    const out = await run('/fake')
    expect(out.join('\n')).toContain('flat')
  })
})
