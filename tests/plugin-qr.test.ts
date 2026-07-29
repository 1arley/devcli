import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'
import { createQrPlugin } from '../packages/plugins/qr/src/index'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let logSpy: ReturnType<typeof vi.spyOn>
let program: Command

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  program = new Command()
  createQrPlugin().register(program)
})
afterEach(() => logSpy.mockRestore())

function qrCmd(): Command {
  const c = program.commands.find((x) => x.name() === 'qr')
  if (!c) throw new Error('qr not found')
  return c
}
async function run(args: string[]): Promise<string[]> {
  logSpy.mockClear()
  await qrCmd().parseAsync(['node', 'test', ...args])
  return logSpy.mock.calls.map((a) => String(a[0]))
}

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'qr-'))
}

describe('qr plugin registration', () => {
  it('registers qr command with correct manifest', () => {
    const p = createQrPlugin()
    expect(p.manifest.name).toBe('qr')
    expect(p.manifest.category).toBe('utility')
    const prog = new Command()
    p.register(prog)
    expect(prog.commands.map((c) => c.name())).toContain('qr')
  })
})

describe('qr matrix shape (via renderQrTerminal)', () => {
  it('terminal render is a square multiline block for short text', async () => {
    const out = await run(['hello'])
    const strip = (s: string) =>
      s.replace(/\u001b\[[0-9;]*m/g, '').replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
    // console.log(rendered) emits one multiline string; join everything then split.
    const body = out.join('\n')
    const rows = strip(body)
      .split('\n')
      .filter((l) => l.length > 0)
    expect(rows.length).toBeGreaterThanOrEqual(21)
    const width = rows[0]!.length
    expect(width % 2).toBe(0)
    rows.forEach((l) => expect(l.length).toBe(width))
  })
})

describe('qr ascii save (-o)', () => {
  it('writes an ASCII square file of `██` and `  ` cells', async () => {
    const dir = tmpDir()
    const file = join(dir, 'qr.txt')
    try {
      const out = await run(['test data', '-o', file])
      expect(existsSync(file)).toBe(true)
      expect(out.join('\n')).toMatch(/saved to/)
      const content = readFileSync(file, 'utf-8')
      const rows = content.split('\n').filter((l) => l.length > 0)
      expect(rows.length).toBeGreaterThanOrEqual(21)
      const w = rows[0]!.length
      expect(w % 2).toBe(0) // each cell is 2 chars wide
      rows.forEach((l) => expect(l.length).toBe(w))
      const cellOnly = rows.every((l) => /^(██| {2})+$/.test(l))
      expect(cellOnly).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('larger payload yields a >= matrix than small payload', async () => {
    const dir = tmpDir()
    const small = join(dir, 's.txt')
    const big = join(dir, 'b.txt')
    try {
      await run(['x', '-o', small])
      await run(['a'.repeat(200), '-o', big])
      const sRows = readFileSync(small, 'utf-8')
        .split('\n')
        .filter((l) => l.length > 0).length
      const bRows = readFileSync(big, 'utf-8')
        .split('\n')
        .filter((l) => l.length > 0).length
      expect(bRows).toBeGreaterThanOrEqual(sRows)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
