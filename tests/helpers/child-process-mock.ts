/**
 * Shared `node:child_process` mock setup for plugin tests.
 *
 * Production code now calls `execFileSync(bin, [...args], opts)` (no shell)
 * instead of `execSync("bin args ...", opts)`. This normalizes both call
 * shapes to a single `execMock(commandString, options)` surface so existing
 * string-based `mockImplementation`/`toHaveBeenCalledWith` keep working.
 *
 * `vi.mock` is hoisted above imports, so the mock fn + factory MUST live in the
 * test file via `vi.hoisted` (helper-module references hit the import TDZ).
 * Each test file should do:
 *
 *   const { execMock } = vi.hoisted(() => ({ execMock: vi.fn() }))
 *   vi.mock('node:child_process', () => childProcessMockFactory(execMock))
 *
 * `execMock` then receives `(commandString: string, options: object)`, where
 * `commandString` is the bin joined with its argv (e.g. "docker ps --format ...").
 */
import type { Mock } from 'vitest'

/** Build the mocked `node:child_process` module bound to one execMock fn. */
export function childProcessMockFactory(execMock: Mock) {
  const join = (gen: string, argsOrOpts?: unknown): string =>
    Array.isArray(argsOrOpts) ? [gen, ...argsOrOpts.map(String)].join(' ') : gen

  const wrapped = (cmd: string, argsOrOpts?: unknown, opts?: unknown) => {
    const joined = join(cmd, argsOrOpts)
    const optionsObj = Array.isArray(argsOrOpts) ? opts : argsOrOpts
    return execMock(joined, optionsObj)
  }

  return { execSync: wrapped, execFileSync: wrapped }
}
