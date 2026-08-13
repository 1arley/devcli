import { describe, it, expect } from 'vitest'
import {
  CliError,
  UserError,
  NotFoundError,
  PermissionError,
  ValidationError,
  TimeoutError,
  toCliError,
} from '../packages/cli/src/errors'

describe('CliError', () => {
  it('defaults to exit code 1', () => {
    const err = new CliError('boom')
    expect(err.code).toBe(1)
    expect(err.message).toBe('boom')
    expect(err.name).toBe('CliError')
  })

  it('accepts custom code and suggestion', () => {
    const err = new CliError('fail', { code: 42, suggestion: 'try again' })
    expect(err.code).toBe(42)
    expect(err.suggestion).toBe('try again')
  })

  it('exposes cause', () => {
    const cause = new Error('root')
    const err = new CliError('wrapped', { cause })
    expect(err.cause).toBe(cause)
  })
})

describe('specialized errors', () => {
  it('UserError has code 64', () => {
    const err = new UserError('bad input')
    expect(err).toBeInstanceOf(CliError)
    expect(err.code).toBe(64)
    expect(err.name).toBe('UserError')
  })

  it('NotFoundError has code 2 and default suggestion', () => {
    const err = new NotFoundError('docker')
    expect(err.code).toBe(2)
    expect(err.name).toBe('NotFoundError')
    expect(err.message).toContain('not found')
    expect(err.suggestion).toContain('docker')
  })

  it('PermissionError has code 77', () => {
    const err = new PermissionError('write', '/etc/hosts')
    expect(err.code).toBe(77)
    expect(err.message).toContain('/etc/hosts')
  })

  it('ValidationError has code 65', () => {
    const err = new ValidationError('invalid JSON')
    expect(err.code).toBe(65)
  })

  it('TimeoutError has code 124', () => {
    const err = new TimeoutError('fetch', 5000)
    expect(err.code).toBe(124)
    expect(err.message).toContain('5000ms')
  })
})

describe('toCliError', () => {
  it('passes CliError through unchanged', () => {
    const original = new UserError('nope')
    expect(toCliError(original)).toBe(original)
  })

  it('wraps plain Error with code 1 and cause', () => {
    const cause = new Error('root cause')
    const err = toCliError(cause)
    expect(err).toBeInstanceOf(CliError)
    expect(err.code).toBe(1)
    expect(err.cause).toBe(cause)
  })

  it('wraps non-Error values', () => {
    const err = toCliError('something broke')
    expect(err).toBeInstanceOf(CliError)
    expect(err.message).toBe('something broke')
    expect(err.code).toBe(1)
  })

  it('wraps undefined', () => {
    const err = toCliError(undefined)
    expect(err.code).toBe(1)
  })
})
