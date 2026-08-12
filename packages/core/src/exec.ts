import { execSync, execFileSync, type ExecSyncOptions } from 'node:child_process'

/**
 * Run a command and return its trimmed stdout, or empty string on failure.
 *
 * **Always pass `args` as an array** — when args are provided the command runs
 * via `execFileSync` with no shell, so argument values cannot be interpreted as
 * shell syntax (no injection). When `args` is omitted the raw `command` string
 * runs through the shell and is the caller's injection risk to manage.
 */
export function exec(
  command: string,
  args?: readonly string[],
  options?: ExecSyncOptions & { encoding?: 'utf-8' },
): string {
  return run(command, args, options) ?? ''
}

/** Like {@link exec} but returns null on failure (useful for optional probes). */
export function tryExec(
  command: string,
  args?: readonly string[],
  options?: ExecSyncOptions & { encoding?: 'utf-8' },
): string | null {
  return run(command, args, options)
}

/** Reject strings containing shell metacharacters — use to validate user input. */
export function isSafeIdentifier(s: string): boolean {
  return /^[\w./:@-]+$/.test(s)
}

/** Reject anything that is not a non-negative integer (port/pid sanity). */
export function isNumeric(s: string): boolean {
  return /^\d+$/.test(s)
}

function run(
  command: string,
  args: readonly string[] | undefined,
  options?: ExecSyncOptions & { encoding?: 'utf-8' },
): string | null {
  try {
    const out =
      args !== undefined
        ? execFileSync(command, args, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            ...options,
          })
        : execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], ...options })
    return typeof out === 'string' ? out.trim() : String(out).trim()
  } catch {
    return null
  }
}
