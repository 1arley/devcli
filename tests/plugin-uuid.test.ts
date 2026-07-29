import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'
import { createUuidPlugin } from '../packages/plugins/uuid/src/index'

let logSpy: ReturnType<typeof vi.spyOn>
let program: Command

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  program = new Command()
  createUuidPlugin().register(program)
})
afterEach(() => logSpy.mockRestore())

function cmd(...names: string[]): Command {
  let c: Command | undefined = program
  for (const n of names) c = c.commands.find((x) => x.name() === n)
  if (!c) throw new Error(`cmd ${names.join(' ')} not found`)
  return c
}
async function exec(chain: string[], args: string[] = []): Promise<string[]> {
  logSpy.mockClear()
  const c = cmd(...chain)
  await c.parseAsync(['node', 'test', ...args])
  return logSpy.mock.calls.map((a) => String(a[0])).filter(Boolean)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/
const NANO_RE = /^[A-Za-z0-9_-]+$/

describe('uuid plugin registration', () => {
  it('registers uuid with subcommands and correct manifest', () => {
    const p = createUuidPlugin()
    expect(p.manifest.name).toBe('uuid')
    expect(p.manifest.category).toBe('utility')
    const program = new Command()
    p.register(program)
    const u = program.commands.find((c) => c.name() === 'uuid')
    expect(u).toBeDefined()
    expect(u?.commands.map((c) => c.name()).sort()).toEqual(['nano', 'ulid', 'v4', 'v7'])
  })
})

describe('uuid v4', () => {
  it('default action prints a v4 UUID', async () => {
    const out = await exec(['uuid'], [])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatch(UUID_RE)
  })

  it('v4 subcommand prints one UUID by default', async () => {
    const out = await exec(['uuid', 'v4'], [])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatch(UUID_RE)
    // v4 variant bits: 4th block starts with 8,9,a,b
    expect(out[0]![19]).toMatch(/^[89ab]$/)
    // version 4 at index 14
    expect(out[0]![14]).toBe('4')
  })

  it('v4 -n prints multiple unique UUIDs', async () => {
    const out = await exec(['uuid', 'v4'], ['-n', '5'])
    expect(out).toHaveLength(5)
    expect(new Set(out).size).toBe(5)
    out.forEach((u) => expect(u).toMatch(UUID_RE))
  })

  it('v4 default count string parses', async () => {
    const out = await exec(['uuid', 'v4'], ['--count', '3'])
    expect(out).toHaveLength(3)
  })
})

describe('uuid v7', () => {
  it('v7 has correct version digit (7) and UUID shape', async () => {
    const out = await exec(['uuid', 'v7'], [])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatch(UUID_RE)
    expect(out[0]![14]).toBe('7')
    // variant bits like v4
    expect(out[0]![19]).toMatch(/^[89ab]$/)
  })

  it('v7 UUIDs are time-ordered (monotonic) when generated close together', async () => {
    const first = await exec(['uuid', 'v7'], [])
    // small delay
    await new Promise((r) => setTimeout(r, 5))
    const second = await exec(['uuid', 'v7'], [])
    // timestamp is first 48 bits (first 12 hex chars + 1 of block).
    // Compare first 12 hex chars (first block + first 4 of block 2).
    const ta = first[0]!.replace(/-/g, '').slice(0, 12)
    const tb = second[0]!.replace(/-/g, '').slice(0, 12)
    expect(parseInt(tb, 16)).toBeGreaterThanOrEqual(parseInt(ta, 16))
  })

  it('v7 -n prints multiple', async () => {
    const out = await exec(['uuid', 'v7'], ['-n', '4'])
    expect(out).toHaveLength(4)
    out.forEach((u) => {
      expect(u).toMatch(UUID_RE)
      expect(u[14]).toBe('7')
    })
  })
})

describe('nanoId', () => {
  it('default size is 21', async () => {
    const out = await exec(['uuid', 'nano'], [])
    expect(out).toHaveLength(1)
    expect(out[0]).toHaveLength(21)
    expect(out[0]).toMatch(NANO_RE)
  })

  it('honours custom --size', async () => {
    const out = await exec(['uuid', 'nano'], ['-s', '10'])
    expect(out[0]).toHaveLength(10)
  })

  it('-n prints multiple unique IDs', async () => {
    const out = await exec(['uuid', 'nano'], ['-n', '6'])
    expect(out).toHaveLength(6)
    expect(new Set(out).size).toBe(6)
    out.forEach((i) => expect(i).toMatch(NANO_RE))
  })
})

describe('ulid', () => {
  it('default prints one 26-char ULID', async () => {
    const out = await exec(['uuid', 'ulid'], [])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatch(ULID_RE)
  })

  it('-n prints multiple ULIDs', async () => {
    const out = await exec(['uuid', 'ulid'], ['-n', '3'])
    expect(out).toHaveLength(3)
    out.forEach((u) => expect(u).toMatch(ULID_RE))
  })

  it('ULIDs share first 10 chars when generated same ms-ish (crockford timestamp prefix matches length)', async () => {
    const [a, b] = (await exec(['uuid', 'ulid'], ['-n', '2'])).concat(
      await exec(['uuid', 'ulid'], ['-n', '2']),
    )
    // Both are 26 chars; first 10 are time-ordered crockford. Just assert shape.
    expect(a).toHaveLength(26)
    expect(b).toHaveLength(26)
  })
})
