import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export type ChatMode = 'build' | 'plan'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCallId?: string
  toolCalls?: ToolCall[]
  name?: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface SessionState {
  messages: ChatMessage[]
  mode: ChatMode
  model: string
  provider: string
  createdAt: string
  updatedAt: string
  name: string
}

function sessionsDir(): string {
  const dir = join(homedir(), '.devcli', 'sessions')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function createSession(
  provider: string,
  model: string,
  mode: ChatMode = 'build',
): SessionState {
  const now = new Date().toISOString()
  return {
    messages: [],
    mode,
    model,
    provider,
    createdAt: now,
    updatedAt: now,
    name: `session-${Date.now()}`,
  }
}

export function saveSession(session: SessionState, name?: string): string {
  const dir = sessionsDir()
  const sessionName = name ?? session.name
  session.name = sessionName
  session.updatedAt = new Date().toISOString()
  const path = join(dir, `${sessionName}.json`)
  writeFileSync(path, JSON.stringify(session, null, 2) + '\n', { mode: 0o600 })
  return sessionName
}

export function loadSession(name: string): SessionState | null {
  const dir = sessionsDir()
  const path = join(dir, `${name}.json`)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as SessionState
  } catch {
    return null
  }
}

export function listSessions(): Array<{ name: string; createdAt: string; updatedAt: string }> {
  const dir = sessionsDir()
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  return files
    .map((f) => {
      try {
        const session = JSON.parse(readFileSync(join(dir, f), 'utf-8')) as SessionState
        return { name: session.name, createdAt: session.createdAt, updatedAt: session.updatedAt }
      } catch {
        return null
      }
    })
    .filter((s): s is { name: string; createdAt: string; updatedAt: string } => s !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function addMessage(session: SessionState, message: ChatMessage): void {
  session.messages.push(message)
  session.updatedAt = new Date().toISOString()
}

export function clearMessages(session: SessionState): void {
  session.messages = []
  session.updatedAt = new Date().toISOString()
}

export function compactMessages(session: SessionState, maxMessages: number = 30): void {
  if (session.messages.length <= maxMessages) return
  const kept = session.messages.slice(-maxMessages)
  const summary =
    `[Earlier ${session.messages.length - maxMessages} messages compacted. Summary of conversation so far:\n` +
    session.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(0, 10)
      .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
      .join('\n') +
    ']'
  session.messages = [{ role: 'system', content: summary }, ...kept]
  session.updatedAt = new Date().toISOString()
}

export function exportToMarkdown(session: SessionState): string {
  const lines: string[] = []
  lines.push(`# Dev Chat Session: ${session.name}`)
  lines.push(`Mode: ${session.mode} | Model: ${session.model} | Provider: ${session.provider}`)
  lines.push(`Created: ${session.createdAt} | Updated: ${session.updatedAt}`)
  lines.push('')
  for (const msg of session.messages) {
    if (msg.role === 'system') continue
    if (msg.role === 'tool') continue
    lines.push(msg.role === 'user' ? '> **User:**' : '> **Assistant:**')
    lines.push('')
    lines.push(msg.content)
    lines.push('')
    lines.push('---')
    lines.push('')
  }
  return lines.join('\n')
}
