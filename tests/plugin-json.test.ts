import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'
import { createJsonPlugin } from '../packages/plugins/json/src/index'

let logSpy: ReturnType<typeof vi.spyOn>

function freshProgram(): Command {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  const program = new Command()
  createJsonPlugin().register(program)
  return program
}
function cmd(program: Command, ...names: string[]) {
  let c: Command | undefined = program
  for (const n of names) c = c.commands.find((x) => x.name() === n)
  if (!c) throw new Error(`command ${names.join(' ')} not found`)
  return c
}
async function run(program: Command, chain: string[], args: string[]): Promise<string[]> {
  logSpy.mockClear()
  const c = cmd(program, ...chain)
  await c.parseAsync(['node', 'test', ...args])
  return logSpy.mock.calls.map((a) => String(a[0]))
}

describe('json plugin registration', () => {
  it('registers json command with correct manifest', () => {
    const p = createJsonPlugin()
    expect(p.manifest.name).toBe('json')
    expect(p.manifest.category).toBe('data')
    const program = new Command()
    p.register(program)
    const json = program.commands.find((c) => c.name() === 'json')
    expect(json).toBeDefined()
    expect(json?.commands.map((c) => c.name()).sort()).toEqual([
      'format',
      'from-yaml',
      'minify',
      'to-yaml',
      'validate',
    ])
  })
})

describe('json format', () => {
  let program: Command
  beforeEach(() => (program = freshProgram()))
  afterEach(() => {
    logSpy.mockRestore()
    process.exitCode = 0
  })

  it('formats stdin TTY absence yields invalid JSON message', async () => {
    // No file arg + TTY stdin -> readInput resolves '' -> tryParse('') returns null.
    const out = await run(program, ['json', 'format'], [])
    expect(out.join('\n')).toMatch(/Invalid JSON/)
  })

  it('formats inline JSON via parseAsync consumeGlobalAction targeting file', async () => {
    // Use the validate command path via a real tmp file to drive file-based code.
    const { writeFileSync, rmSync, mkdtempSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'json-'))
    const file = join(dir, 'in.json')
    writeFileSync(file, '{"z":9,"a":1}', 'utf-8')
    try {
      const out = await run(program, ['json', 'format'], ['-i', '4', file])
      const body = out.join('\n')
      expect(body).toContain('"z": 9')
      expect(body).toContain('"a": 1')
      // 4-space indent
      expect(body).toContain('    "z"')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('json minify', () => {
  let program: Command
  beforeEach(() => (program = freshProgram()))
  afterEach(() => {
    logSpy.mockRestore()
    process.exitCode = 0
  })

  it('minifies JSON from a file into a single line', async () => {
    const { writeFileSync, mkdtempSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'json-'))
    const file = join(dir, 'fat.json')
    const content = JSON.stringify({ a: 1, b: [1, 2] }, null, 4)
    writeFileSync(file, content, 'utf-8')
    try {
      const out = await run(program, ['json', 'minify'], [file])
      expect(out.join('\n')).toBe('{"a":1,"b":[1,2]}')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('reports invalid JSON for minify', async () => {
    const { writeFileSync, mkdtempSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'json-'))
    const file = join(dir, 'bad.json')
    writeFileSync(file, '{not json', 'utf-8')
    try {
      const out = await run(program, ['json', 'minify'], [file])
      expect(out.join('\n')).toMatch(/Invalid JSON/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('json validate', () => {
  let program: Command
  beforeEach(() => (program = freshProgram()))
  afterEach(() => {
    logSpy.mockRestore()
    process.exitCode = 0
  })

  it('validates well-formed JSON', async () => {
    const { writeFileSync, mkdtempSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'json-'))
    const file = join(dir, 'ok.json')
    writeFileSync(file, '{"ok":true}', 'utf-8')
    try {
      const out = await run(program, ['json', 'validate'], [file])
      expect(out.join('\n')).toMatch(/Valid JSON/)
      expect(process.exitCode).toBe(0)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('sets exitCode 1 on invalid JSON', async () => {
    const { writeFileSync, mkdtempSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'json-'))
    const file = join(dir, 'bad.json')
    writeFileSync(file, '}{', 'utf-8')
    try {
      const out = await run(program, ['json', 'validate'], [file])
      expect(out.join('\n')).toMatch(/Invalid JSON/)
      expect(process.exitCode).toBe(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('json to-yaml', () => {
  let program: Command
  beforeEach(() => (program = freshProgram()))
  afterEach(() => logSpy.mockRestore())

  it('converts a nested object to YAML', async () => {
    const { writeFileSync, mkdtempSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'json-'))
    const file = join(dir, 'n.json')
    writeFileSync(file, JSON.stringify({ name: 'x', nested: { a: 1 } }), 'utf-8')
    try {
      const out = await run(program, ['json', 'to-yaml'], [file])
      const body = out.join('\n')
      expect(body).toContain('name: x')
      expect(body).toContain('nested:')
      expect(body).toContain('a: 1')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('serialises null values', async () => {
    const { writeFileSync, mkdtempSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'json-'))
    const file = join(dir, 'n.json')
    writeFileSync(file, JSON.stringify({ v: null }), 'utf-8')
    try {
      const out = await run(program, ['json', 'to-yaml'], [file])
      expect(out.join('\n')).toContain('v: null')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('json from-yaml (parseYamlValue coverage)', () => {
  let program: Command
  beforeEach(() => (program = freshProgram()))
  afterEach(() => logSpy.mockRestore())

  it('parses bool, null, int, float, and string values', async () => {
    const { writeFileSync, mkdtempSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'json-'))
    const file = join(dir, 'y.yml')
    const yaml = [
      'boolt: true',
      'boolf: false',
      'nullv: null',
      'tildev: ~',
      'intv: 42',
      'negv: -7',
      'floatv: 3.14',
      'strv: hello',
      'quoted: "with space"',
    ].join('\n')
    writeFileSync(file, yaml, 'utf-8')
    try {
      const out = await run(program, ['json', 'from-yaml'], [file])
      const obj = JSON.parse(out.join('\n'))
      expect(obj.boolt).toBe(true)
      expect(obj.boolf).toBe(false)
      expect(obj.nullv).toBeNull()
      expect(obj.tildev).toBeNull()
      expect(obj.intv).toBe(42)
      expect(obj.negv).toBe(-7)
      expect(obj.floatv).toBeCloseTo(3.14)
      expect(obj.strv).toBe('hello')
      expect(obj.quoted).toBe('with space')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('parses nested keys under a parent block', async () => {
    const { writeFileSync, mkdtempSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const dir = mkdtempSync(join(tmpdir(), 'json-'))
    const file = join(dir, 'y.yml')
    const yaml = ['server:', '  host: localhost', '  port: 8080'].join('\n')
    writeFileSync(file, yaml, 'utf-8')
    try {
      const out = await run(program, ['json', 'from-yaml'], [file])
      const obj = JSON.parse(out.join('\n'))
      expect(obj.server).toEqual({ host: 'localhost', port: 8080 })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
