import { execSync, type ExecSyncOptions } from 'node:child_process'

/**
 * Run a command and return its trimmed stdout, or empty string on failure.
 * Pass args as an array to avoid shell injection; when a string is passed
 * the command runs through the shell.
 */
export function exec(
  command: string,
  args?: readonly string[],
  options?: ExecSyncOptions & { encoding?: 'utf-8' },
): string {
  try {
    const cmd = args ? `${command} ${args.map(shellQuote).join(' ')}` : command
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], ...options }).trim()
  } catch {
    return ''
  }
}

/** Like {@link exec} but returns null on failure (useful for optional probes). */
export function tryExec(
  command: string,
  args?: readonly string[],
  options?: ExecSyncOptions & { encoding?: 'utf-8' },
): string | null {
  try {
    const cmd = args ? `${command} ${args.map(shellQuote).join(' ')}` : command
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], ...options }).trim()
  } catch {
    return null
  }
}

/** Reject strings containing shell metacharacters. */
export function isSafeIdentifier(s: string): boolean {
  return /^[\w./:@-]+$/.test(s)
}

function shellQuote(arg: string): string {
  if (/^[\w./:@={}<>,+~^-]+$/.test(arg)) return arg
  return `'${arg.replace(/'/g, "'\\''")}'`
}
