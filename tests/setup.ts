import { afterEach } from 'vitest'

// Shared helper: silence process.stdout/stderr writes so plugin output
// (table renders, boxen, spinner, doctor writes) does not clutter test output.
// Tests that assert on console.log use vi.spyOn themselves which takes precedence.
const noop = (): boolean => true

const _origStdout = process.stdout.write.bind(process.stdout)
const _origStderr = process.stderr.write.bind(process.stderr)

export const mutedStdout = (): void => {
  process.stdout.write = noop as typeof process.stdout.write
}
export const restoreStdout = (): void => {
  process.stdout.write = _origStdout
}
export const mutedStderr = (): void => {
  process.stderr.write = noop as typeof process.stderr.write
}
export const restoreStderr = (): void => {
  process.stderr.write = _origStderr
}

// Ensure plugins that branch on `process.stdin.isTTY` (e.g. json readInput)
// treat stdin as an empty TTY instead of blocking on stream reads in tests.
let stdinIsTTY = false
try {
  Object.defineProperty(process.stdin, 'isTTY', {
    get: () => true,
    configurable: true,
  })
  stdinIsTTY = true
} catch {
  /* ignore */
}
void stdinIsTTY

afterEach(() => {
  restoreStdout()
  restoreStderr()
})
