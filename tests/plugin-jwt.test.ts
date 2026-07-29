import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Command } from 'commander'
import { createJwtPlugin } from '../packages/plugins/jwt/src/index'

// Internal helpers (base64UrlEncode/Decode, decodeToken, encodeToken, validateToken)
// are not exported, so they are exercised through the registered CLI actions:
//   encode -> produces a token, validate -> expiry/structure, decode -> round-trip.
// A fixed, well-formed token is used to assert decode correctness deterministically.

const FIXED_HEADER = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' // {"alg":"HS256","typ":"JWT"}
const FIXED_PAYLOAD = 'eyJzdWIiOiIxMjMiLCJuYW1lIjoidGVzdCJ9' // {"sub":"123","name":"test"}
const FIXED_SIG = 'c2lnbmF0dXJl'
const FIXED_TOKEN = `${FIXED_HEADER}.${FIXED_PAYLOAD}.${FIXED_SIG}`
const EXPIRED_TOKEN = `${FIXED_HEADER}.eyJleHAiOjF9.${FIXED_SIG}` // exp=1 (1970)
const EXPIRED_FUTURE = `${FIXED_HEADER}.eyJpYXQiOjk5OTk5OTk5OTl9.${FIXED_SIG}` // iat far future
const TWO_PART_TOKEN = 'abc.def'

let logSpy: ReturnType<typeof vi.spyOn>
function freshProgram(): Command {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  const program = new Command()
  createJwtPlugin().register(program)
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
  // Commander: calling a Command's parseAsync directly means argv does NOT repeat
  // any of the command names in the chain -- only [node, script, ...args].
  await c.parseAsync(['node', 'test', ...args])
  return logSpy.mock.calls.map((a) => String(a[0]))
}

describe('jwt plugin registration', () => {
  it('registers jwt command with correct manifest', () => {
    const p = createJwtPlugin()
    expect(p.manifest.name).toBe('jwt')
    expect(p.manifest.category).toBe('security')
    const program = new Command()
    p.register(program)
    const jwt = program.commands.find((c) => c.name() === 'jwt')
    expect(jwt).toBeDefined()
    expect(jwt?.commands.map((c) => c.name()).sort()).toEqual(['decode', 'encode', 'validate'])
  })
})

describe('jwt decode', () => {
  let program: Command
  beforeEach(() => (program = freshProgram()))
  afterEach(() => logSpy.mockRestore())

  it('decodes header and payload of a valid JWT', async () => {
    const out = await run(program, ['jwt', 'decode'], [FIXED_TOKEN])
    const all = out.join('\n')
    expect(all).toContain('"alg": "HS256"')
    expect(all).toContain('"sub": "123"')
    expect(all).toContain('"name": "test"')
  })

  it('reports error on a token with wrong part count', async () => {
    const out = await run(program, ['jwt', 'decode'], [TWO_PART_TOKEN])
    expect(out.join('\n')).toMatch(/Invalid JWT token/)
  })

  it('reports error on a token with invalid base64 segments', async () => {
    const out = await run(program, ['jwt', 'decode'], ['@@@.@@@.@@@'])
    // Non-base64 should still decode to garbage JSON -> JSON.parse throws -> null.
    expect(out.join('\n')).toMatch(/Invalid JWT token/)
  })

  it('decodes a token produced by encode (round-trip)', async () => {
    const encOut = await run(
      program,
      ['jwt', 'encode'],
      ['--payload', '{"round":"trip"}', '--header', '{"alg":"HS256"}'],
    )
    const token = encOut.filter((l) =>
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(l),
    )[0]
    expect(token).toBeTruthy()
    const decOut = await run(program, ['jwt', 'decode'], [token!])
    expect(decOut.join('\n')).toContain('"round": "trip"')
  })
})

describe('jwt encode', () => {
  let program: Command
  beforeEach(() => (program = freshProgram()))
  afterEach(() => logSpy.mockRestore())

  it('encodes a payload into a 3-part token', async () => {
    const out = await run(program, ['jwt', 'encode'], ['--payload', '{"a":1}'])
    const token = out.find((l) => l.split('.').length === 3)
    expect(token).toBeTruthy()
    expect(token!.split('.')).toHaveLength(3)
  })

  it('uses default header when none provided', async () => {
    const out = await run(program, ['jwt', 'encode'], ['--payload', '{"a":1}'])
    const token = out.find((l) => l.split('.').length === 3)!
    const headerJson = JSON.parse(Buffer.from(token.split('.')[0]!, 'base64url').toString('utf-8'))
    expect(headerJson).toEqual({ alg: 'HS256', typ: 'JWT' })
  })

  it('errors without payload', async () => {
    const out = await run(program, ['jwt', 'encode'], [])
    expect(out.join('\n')).toMatch(/--payload/)
  })

  it('errors on invalid JSON payload', async () => {
    const out = await run(program, ['jwt', 'encode'], ['--payload', '{bad'])
    expect(out.join('\n')).toMatch(/Invalid JSON/)
  })
})

describe('jwt validate', () => {
  let program: Command
  beforeEach(() => (program = freshProgram()))
  afterEach(() => logSpy.mockRestore())

  it('marks a well-formed non-expired token valid', async () => {
    const out = await run(program, ['jwt', 'validate'], [FIXED_TOKEN])
    const all = out.join('\n')
    expect(all).toMatch(/Valid: true/)
    expect(all).toMatch(/Expired: false/)
  })

  it('detects an expired token', async () => {
    const out = await run(program, ['jwt', 'validate'], [EXPIRED_TOKEN])
    const all = out.join('\n')
    expect(all).toMatch(/Expired: true/)
  })

  it('rejects a token issued in the future', async () => {
    const out = await run(program, ['jwt', 'validate'], [EXPIRED_FUTURE])
    expect(out.join('\n')).toMatch(/issued in the future/i)
  })

  it('reports malformed token', async () => {
    const out = await run(program, ['jwt', 'validate'], ['not.a.jwt.at.all'])
    // 5 parts -> parts.length !== 3 -> malformed.
    expect(out.join('\n')).toMatch(/Malformed token/)
  })

  it('reports invalid (2-part) token', async () => {
    const out = await run(program, ['jwt', 'validate'], [TWO_PART_TOKEN])
    expect(out.join('\n')).toMatch(/Malformed token/)
  })
})
