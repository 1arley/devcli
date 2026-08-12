import { execSync } from 'node:child_process'
import { tryExec, isNumeric } from './exec.js'

export interface PortInfo {
  port: string
  pid: string
  process: string
  protocol: string
  address: string
}

const platformWin = () => process.platform === 'win32'

/** Run a command via the shell, return stdout string or null on failure. */
function runShell(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' })
  } catch {
    return null
  }
}

/** Parse `ss -tlnpH` / `ss -ulnpH` output: extract port, pid, process. */
export function parseSsOutput(raw: string): PortInfo[] {
  const ports: PortInfo[] = []
  const seen = new Set<string>()

  // ss line shape (no header when piped):
  //   LISTEN 0 128 0.0.0.0:3000 0.0.0.0:* users:(("node",pid=1234,fd=7))
  //   LISTEN 0 128 127.0.0.53%lo:53 0.0.0.0:*
  // local addr col may be bare addr, addr:port, [::]:port, or addr%lo:prt
  const lineRe = /^(LISTEN|[A-Z]+)\s+\d+\s+\d+\s+(\S+)\s+\S+/

  for (const line of raw.split('\n')) {
    const m = line.match(lineRe)
    if (!m) continue
    const addrField = m[2] ?? ''
    // strip interface suffix: 127.0.0.53%lo:53 -> :53
    const addr = addrField.replace(/%[^:]+/, '')
    // trailing port is after the last ':'
    const colon = addr.lastIndexOf(':')
    if (colon === -1) continue
    const port = addr.slice(colon + 1)
    const host = addr.slice(0, colon).replace(/^\[|\]$/g, '')
    if (!port || !/^\d+$/.test(port)) continue

    const key = `${host}:${port}`
    if (seen.has(key)) continue
    seen.add(key)

    // users:(("node",pid=1234,fd=5),("other",pid=99,fd=3)) — may be absent
    let pid = ''
    let proc = ''
    const userRe = /\("([^"]+)",pid=(\d+),fd=\d+\)/g
    let um: RegExpExecArray | null
    while ((um = userRe.exec(line)) !== null) {
      if (!proc) proc = um[1] ?? ''
      if (!pid) pid = um[2] ?? ''
    }

    ports.push({
      port,
      pid,
      process: proc || '-',
      protocol: host.includes(':') ? 'tcp6' : 'tcp',
      address: host,
    })
  }

  return ports
}

/** Fallback parser using `lsof -i -P -n` output. */
export function parseLsofOutput(raw: string): PortInfo[] {
  const ports: PortInfo[] = []
  const seen = new Set<string>()
  for (const line of raw.trim().split('\n').slice(1)) {
    const parts = line.split(/\s+/)
    if (parts.length < 9) continue
    const proc = parts[0] ?? ''
    const pid = parts[1] ?? ''
    const protoField = parts[7] ?? ''
    const addr = parts[8] ?? ''
    const port = addr.split(':').pop() ?? ''
    if (!port || !/^\d+$/.test(port) || !/^\d+$/.test(pid)) continue
    const proto = protoField.includes('IPv6') || protoField.includes('6') ? 'tcp6' : 'tcp'
    const key = `${proto}:${addr}:${port}`
    if (seen.has(key)) continue
    seen.add(key)
    ports.push({ port, pid, process: proc, protocol: proto, address: addr })
  }
  return ports
}

/** List listening ports (TCP + UDP). Uses ss primarily; lsof as fallback. */
export function listPorts(): PortInfo[] {
  try {
    if (platformWin()) return parseWindowsPorts()
    return parseUnixPorts()
  } catch {
    return []
  }
}

function parseUnixPorts(): PortInfo[] {
  // `ss` sees sockets lsof misses (other users' bound sockets when permitted,
  // kernel-bound listeners, sockets in odd states). Prefer it; merge lsof as
  // fallback so we never depend on a single tool.
  const ssOut = runShell('ss -tlnpH 2>/dev/null') ?? runShell('ss -tlnp 2>/dev/null')
  const ssUdp = runShell('ss -ulnpH 2>/dev/null') ?? runShell('ss -ulnp 2>/dev/null')

  const ports: PortInfo[] = []
  if (ssOut) ports.push(...parseSsOutput(ssOut))
  if (ssUdp) ports.push(...parseSsOutput(ssUdp))

  // Merge lsof entries for ports ss reported without a pid (ss without root
  // sometimes omits the users:(...) block for foreign processes).
  const have = new Set(ports.map((p) => `${p.port}:${p.address}`))
  const lsofOut = runShell('lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null')
  if (lsofOut) {
    for (const lp of parseLsofOutput(lsofOut)) {
      const key = `${lp.port}:${lp.address}`
      if (have.has(key)) {
        const existing = ports.find((p) => `${p.port}:${p.address}` === key)
        if (existing && (!existing.pid || existing.process === '-')) {
          existing.pid ||= lp.pid
          existing.process = existing.process === '-' ? lp.process : existing.process
        }
      } else {
        ports.push(lp)
      }
    }
  }

  ports.sort((a, b) => Number(a.port) - Number(b.port))
  return ports
}

function parseWindowsPorts(): PortInfo[] {
  const output = execSync('netstat -ano | findstr LISTENING', { encoding: 'utf-8' })
  const ports: PortInfo[] = []
  const seen = new Set<string>()

  for (const line of output.trim().split('\n')) {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 4) continue
    const proto = parts[0] ?? ''
    const addr = parts[1] ?? ''
    const port = addr.split(':').pop() ?? ''
    const pid = parts[4] ?? ''
    if (!port || !pid || !/^\d+$/.test(pid)) continue
    const key = `${proto}:${addr}:${port}`
    if (seen.has(key)) continue
    seen.add(key)
    let process = ''
    try {
      const out = execSync(`tasklist /fi "PID eq ${pid}" /nh /fo csv`, { encoding: 'utf-8' })
      process = out.trim().replace(/"/g, '').split(',')[0] ?? ''
    } catch {
      /* keep empty */
    }
    ports.push({ port, pid, process, protocol: proto, address: addr })
  }

  ports.sort((a, b) => Number(a.port) - Number(b.port))
  return ports
}

/**
 * Resolve the PIDs owning a port across tools. Returns [] when the port is free.
 * Uses ss first (sees more than lsof), then lsof, then fuser, deduped.
 *
 * `port` must be a non-negative integer; non-numeric input is rejected to
 * prevent shell injection when interpolating into subprocess commands.
 */
export function resolvePortPids(port: string): string[] {
  if (!isNumeric(port)) return [] // reject injection vectors early

  const pids = new Set<string>()

  if (platformWin()) {
    const out = runShell(`netstat -ano | findstr :${port}`) ?? ''
    for (const line of out.trim().split('\n')) {
      const p = line.split(/\s+/).pop() ?? ''
      if (p && /^\d+$/.test(p) && p !== '0') pids.add(p)
    }
    return [...pids]
  }

  // ss — run WITHOUT a shell so the port can never be interpreted as syntax.
  // The '( dport = :PORT ... )' filter is passed as a single argv element.
  let ssOut = tryExec('ss', ['-tlnpH', `( dport = :${port} or sport = :${port} )`])
  if (!ssOut) ssOut = tryExec('ss', ['-tlnp', `( sport = :${port} )`])
  if (!ssOut) ssOut = tryExec('ss', ['-ulnp', `( sport = :${port} )`])
  if (ssOut) {
    const re = /pid=(\d+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(ssOut)) !== null) pids.add(m[1] ?? '')
  }

  // lsof fallback (still misses some sockets ss catches).
  const lsofOut = tryExec('lsof', ['-ti:' + port])
  if (lsofOut) {
    for (const line of lsofOut.trim().split('\n')) {
      if (line && /^\d+$/.test(line)) pids.add(line)
    }
  }

  // fuser last resort — uses /proc directly, catches what lsof can't.
  const fuserOut = tryExec('fuser', [port + '/tcp'])
  if (fuserOut) {
    for (const p of fuserOut.trim().split(/\s+/)) {
      if (p && /^\d+$/.test(p)) pids.add(p)
    }
  }

  return [...pids]
}

/** Confirm the port is no longer listening via ss (more authoritative than lsof). */
export function portStillListening(port: string): boolean {
  if (!isNumeric(port)) return false
  // grep via argv, not shell — `port` validated as digits above.
  const out = tryExec('ss', ['-tlnpH']) ?? ''
  return new RegExp(`[:.]${port}\\s`).test(out)
}

export type KillPortResult =
  | { kind: 'killed'; pids: string[] }
  | { kind: 'free' }
  | { kind: 'permission'; pids: string[] }
  | { kind: 'unknown'; pids: string[] }
  | { kind: 'error'; message: string }

/**
 * Kill the process listening on `port`. Tries SIGTERM, escalates to SIGKILL,
 * and verifies the port is actually free via ss afterwards. Reports a
 * `permission` result (rather than a false "killed") when the port stays
 * listening because the owning PID belongs to another user/scope.
 */
export function killPort(port: string): KillPortResult {
  if (!isNumeric(port)) return { kind: 'error', message: 'port must be a number' }

  const initialPids = resolvePortPids(port)
  if (initialPids.length === 0) {
    if (!portStillListening(port)) return { kind: 'free' }
    // listening but no pid resolvable → needs elevated privileges
    return { kind: 'permission', pids: [] }
  }

  if (platformWin()) {
    try {
      for (const pid of initialPids) execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' })
      return { kind: 'killed', pids: initialPids }
    } catch {
      return { kind: 'error', message: 'taskkill failed' }
    }
  }

  // Try graceful SIGTERM first, escalate to SIGKILL.
  let anyKilled = false
  for (const pid of initialPids) {
    if (tryExec('kill', ['-TERM', pid]) !== null) anyKilled = true
  }
  tryExec('sleep', ['0.3'])

  const remainingAfterTerm = resolvePortPids(port)
  if (remainingAfterTerm.length === 0 && !portStillListening(port)) {
    return { kind: 'killed', pids: initialPids }
  }

  // escalate
  for (const pid of remainingAfterTerm.length ? remainingAfterTerm : initialPids) {
    const r = tryExec('kill', ['-9', pid])
    if (r !== null) anyKilled = true
  }
  tryExec('sleep', ['0.3'])

  const remaining = resolvePortPids(port)
  if (remaining.length === 0 && !portStillListening(port)) {
    return { kind: 'killed', pids: initialPids }
  }

  if (remaining.length > 0) {
    // still there after SIGKILL → not ours (other user / system process)
    return { kind: 'permission', pids: remaining }
  }

  // no pids resolvable but port still listening → privilege barrier
  if (portStillListening(port)) return { kind: 'permission', pids: [] }

  if (anyKilled) return { kind: 'killed', pids: initialPids }
  return { kind: 'unknown', pids: initialPids }
}
