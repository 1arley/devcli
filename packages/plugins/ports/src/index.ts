import { Command } from 'commander'
import type { Plugin, PluginFactory } from '@devcli/core'
import { createTable, symbols, withSpinner } from '@devcli/ui'
import chalk from 'chalk'
import { execSync } from 'node:child_process'

interface PortInfo {
  port: string
  pid: string
  process: string
  protocol: string
  address: string
}

const platformWin = () => process.platform === 'win32'

/** Run a command, return stdout or null on failure (non-zero exit). */
function run(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' })
  } catch {
    return null
  }
}

/** Parse `ss -tlnpH` / `ss -ulnpH` output: extract port, pid, process. */
function parseSsOutput(raw: string): PortInfo[] {
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

/** Fallback parser using `lsof -i -P -n`. */
function parseLsofOutput(raw: string): PortInfo[] {
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

function getPorts(): PortInfo[] {
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
  const ssOut = run('ss -tlnpH 2>/dev/null') ?? run('ss -tlnp 2>/dev/null')
  const ssUdp = run('ss -ulnpH 2>/dev/null') ?? run('ss -ulnp 2>/dev/null')

  const ports: PortInfo[] = []
  if (ssOut) ports.push(...parseSsOutput(ssOut))
  if (ssUdp) ports.push(...parseSsOutput(ssUdp))

  // Merge lsof entries for ports ss reported without a pid (ss without root
  // sometimes omits the users:(...) block for foreign processes).
  const have = new Set(ports.map((p) => `${p.port}:${p.address}`))
  const lsofOut = run('lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null')
  if (lsofOut) {
    for (const lp of parseLsofOutput(lsofOut)) {
      const key = `${lp.port}:${lp.address}`
      if (have.has(key)) {
        // backfill pid/process if ss left them blank
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
 */
function resolvePids(port: string): string[] {
  const pids = new Set<string>()

  if (platformWin()) {
    const out = run(`netstat -ano | findstr :${port}`) ?? ''
    for (const line of out.trim().split('\n')) {
      const p = line.split(/\s+/).pop() ?? ''
      if (p && /^\d+$/.test(p) && p !== '0') pids.add(p)
    }
    return [...pids]
  }

  // ss: users:(("name",pid=NNN,...)) — most reliable across distros today.
  const ssOut =
    run(`ss -tlnpH '( dport = :${port} or sport = :${port} )' 2>/dev/null`) ??
    run(`ss -tlnp 2>/dev/null | grep ':${port} '`) ??
    run(`ss -ulnp 2>/dev/null | grep ':${port} '`)
  if (ssOut) {
    const re = /pid=(\d+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(ssOut)) !== null) pids.add(m[1] ?? '')
  }

  // lsof fallback (still misses some sockets ss catches).
  const lsofOut = run(`lsof -ti:${port} 2>/dev/null`)
  if (lsofOut) {
    for (const line of lsofOut.trim().split('\n')) {
      if (line && /^\d+$/.test(line)) pids.add(line)
    }
  }

  // fuser last resort — uses /proc directly, catches what lsof can't.
  const fuserOut = run(`fuser ${port}/tcp 2>/dev/null`)
  if (fuserOut) {
    for (const p of fuserOut.trim().split(/\s+/)) {
      if (p && /^\d+$/.test(p)) pids.add(p)
    }
  }

  return [...pids]
}

/** Confirm the port is no longer listening via ss (more authoritative than lsof). */
function portStillListening(port: string): boolean {
  const out = run(`ss -tlnpH 2>/dev/null`) ?? ''
  // match ":<port> " on the listening line
  return new RegExp(`[:.]${port}\\s`).test(out)
}

type KillResult =
  | { kind: 'killed'; pids: string[] }
  | { kind: 'free' }
  | { kind: 'permission'; pids: string[] }
  | { kind: 'unknown'; pids: string[] }
  | { kind: 'error'; message: string }

function killPort(port: string): KillResult {
  const initialPids = resolvePids(port)
  if (initialPids.length === 0) {
    // double-check via ss in case all parsers lacked permission to name the pid
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
    if (run(`kill -TERM ${pid} 2>/dev/null`) !== null) anyKilled = true
  }
  // give it a moment, then verify
  run('sleep 0.3 2>/dev/null')

  const remainingAfterTerm = resolvePids(port)
  if (remainingAfterTerm.length === 0 && !portStillListening(port)) {
    return { kind: 'killed', pids: initialPids }
  }

  // escalate
  for (const pid of remainingAfterTerm.length ? remainingAfterTerm : initialPids) {
    const r = run(`kill -9 ${pid} 2>/dev/null`)
    if (r !== null) anyKilled = true
  }
  run('sleep 0.3 2>/dev/null')

  const remaining = resolvePids(port)
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

const manifest = {
  name: 'ports',
  description: 'List, inspect, and kill processes on ports',
  version: '0.0.0',
  keywords: ['ports', 'process', 'kill', 'lsof', 'ss', 'fuser', 'listen'],
  category: 'utility' as const,
}

export const createPortsPlugin: PluginFactory = (): Plugin => {
  return {
    manifest,
    register(program: Command) {
      const ports = program.command('ports').description(manifest.description)

      ports.action(async () => {
        const data = await withSpinner('Scanning ports...', () => Promise.resolve(getPorts()))
        if (data.length === 0) {
          console.log(`${symbols.info} No listening ports found`)
          return
        }
        const table = createTable(
          ['Port', 'PID', 'Process', 'Proto', 'Address'],
          data.map((p) => ({
            Port: p.port,
            PID: p.pid || '-',
            Process: p.process,
            Proto: p.protocol,
            Address: p.address,
          })),
        )
        console.log(table.toString())
      })

      ports
        .command('kill <port>')
        .description('Kill the process listening on a port')
        .action((port: string) => {
          const result = killPort(port)
          switch (result.kind) {
            case 'killed':
              console.log(
                `${symbols.success} Killed process on port ${chalk.bold(port)} (pid ${result.pids.join(', ')})`,
              )
              break
            case 'free':
              console.log(`${symbols.info} Port ${chalk.bold(port)} is already free`)
              break
            case 'permission':
              console.log(
                `${symbols.error} Port ${chalk.bold(port)} still listening after kill attempt.`,
              )
              if (result.pids.length > 0) {
                console.log(`  ${chalk.dim(`pid ${result.pids.join(', ')} not owned by you`)}`)
              }
              console.log(
                `  ${chalk.dim(`try: sudo kill -9 $(sudo lsof -ti:${port}) or sudo fuser -k ${port}/tcp`)}`,
              )
              break
            case 'unknown':
              console.log(
                `${symbols.warning} Port ${chalk.bold(port)}: kill commands ran but result is uncertain`,
              )
              break
            case 'error':
              console.log(
                `${symbols.error} Could not kill process on port ${port}: ${result.message}`,
              )
              break
          }
        })

      ports
        .command('free')
        .description('Show only ports that are in use')
        .action(async () => {
          const data = await withSpinner('Scanning ports...', () => Promise.resolve(getPorts()))
          if (data.length === 0) {
            console.log(`${symbols.success} All ports are free`)
            return
          }
          console.log(`${symbols.warning} ${data.length} port(s) in use`)
          data.forEach((p) =>
            console.log(
              `  ${chalk.bold(p.port).padEnd(8)} ${p.process.padEnd(20)} ${p.pid || '-'}`,
            ),
          )
        })
    },
  }
}
