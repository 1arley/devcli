import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const MAX_FILE_SIZE = 100 * 1024
const MAX_CONTEXT_FILES = 20

export class ContextManager {
  private files: Map<string, string> = new Map()
  private commandOutputs: string[] = []
  private systemPrompts: string[] = []

  addFile(path: string): string | null {
    const resolved = resolve(path)
    if (this.files.size >= MAX_CONTEXT_FILES) return null
    if (!existsSync(resolved)) return null
    const stat = statSync(resolved)
    if (stat.size > MAX_FILE_SIZE) return null
    const content = readFileSync(resolved, 'utf-8')
    this.files.set(resolved, content)
    return content
  }

  hasFile(path: string): boolean {
    return this.files.has(resolve(path))
  }

  removeFile(path: string): boolean {
    return this.files.delete(resolve(path))
  }

  listFiles(): string[] {
    return Array.from(this.files.keys()).map((p) => relative(process.cwd(), p))
  }

  addCommandOutput(output: string): void {
    this.commandOutputs.push(output)
  }

  addSystemPrompt(prompt: string): void {
    this.systemPrompts.push(prompt)
  }

  loadAgentsMd(): string | null {
    const cwd = process.cwd()
    const home = process.env['HOME'] ?? ''
    const localAgents = join(cwd, 'AGENTS.md')
    const globalAgents = join(home, '.config', 'devcli', 'AGENTS.md')

    const parts: string[] = []
    if (existsSync(localAgents)) {
      parts.push(readFileSync(localAgents, 'utf-8'))
    }
    if (existsSync(globalAgents)) {
      parts.push(readFileSync(globalAgents, 'utf-8'))
    }
    return parts.length > 0 ? parts.join('\n\n---\n\n') : null
  }

  init(): void {
    const agents = this.loadAgentsMd()
    if (agents) {
      this.addSystemPrompt(`Project instructions (AGENTS.md):\n${agents}`)
    }
    this.addSystemPrompt(
      'You are an AI coding assistant running inside Dev CLI (dev chat). ' +
        'You have access to tools for reading, writing, editing files, running commands, and searching code. ' +
        'Be concise and helpful. Use markdown for formatting. When making code changes, explain what you changed and why.',
    )
    this.loadCustomAgents()
  }

  loadCustomAgents(): void {
    const cwd = process.cwd()
    const home = process.env['HOME'] ?? ''
    const dirs = [join(cwd, '.devcli', 'agents'), join(home, '.config', 'devcli', 'agents')]
    for (const dir of dirs) {
      if (!existsSync(dir)) continue
      let entries: string[] = []
      try {
        entries = readdirSync(dir)
      } catch {
        continue
      }
      for (const entry of entries) {
        if (!entry.endsWith('.md')) continue
        try {
          const content = readFileSync(join(dir, entry), 'utf-8')
          const frontmatter = parseFrontmatter(content)
          if (frontmatter?.description) {
            this.addSystemPrompt(
              `Custom agent "${frontmatter.name ?? entry.replace('.md', '')}": ${frontmatter.description}\n${frontmatter.body}`,
            )
          }
        } catch {
          continue
        }
      }
    }
  }

  buildSystemPrompt(): string {
    return this.systemPrompts.join('\n\n')
  }

  buildFileContext(): string {
    const parts: string[] = []
    for (const [path, content] of this.files) {
      const rel = relative(process.cwd(), path)
      const truncated =
        content.length > 5000 ? content.slice(0, 5000) + '\n... (truncated)' : content
      parts.push(`File: ${rel}\n\`\`\`\n${truncated}\n\`\`\``)
    }
    if (this.commandOutputs.length > 0) {
      parts.push(`Command outputs:\n${this.commandOutputs.join('\n\n')}`)
    }
    return parts.join('\n\n')
  }

  clear(): void {
    this.files.clear()
    this.commandOutputs = []
    this.systemPrompts = []
  }

  get fileCount(): number {
    return this.files.size
  }

  listDirectory(path: string): string[] {
    const resolved = resolve(path)
    if (!existsSync(resolved)) return []
    try {
      return readdirSync(resolved).map((f) => {
        const full = join(resolved, f)
        try {
          return `${f}${statSync(full).isDirectory() ? '/' : ''}`
        } catch {
          return f
        }
      })
    } catch {
      return []
    }
  }
}

interface ParsedFrontmatter {
  name?: string
  description?: string
  body: string
}

export function parseFrontmatter(content: string): ParsedFrontmatter | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return null
  const frontmatter = match[1] ?? ''
  const body = match[2] ?? ''
  const result: ParsedFrontmatter = { body }
  for (const line of frontmatter.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/)
    if (m) {
      const key = m[1] ?? ''
      const val = (m[2] ?? '').trim()
      if (key === 'name') result.name = val
      else if (key === 'description') result.description = val
    }
  }
  return result
}

export function fuzzyFileSearch(query: string, root: string = process.cwd()): string[] {
  const results: string[] = []
  const maxResults = 10
  const lowerQuery = query.toLowerCase()

  function walk(dir: string, depth: number) {
    if (depth > 4 || results.length >= maxResults) return
    let entries: string[] = []
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      if (results.length >= maxResults) return
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist' || entry === '.git')
        continue
      const full = join(dir, entry)
      try {
        if (!statSync(full).isDirectory()) {
          if (entry.toLowerCase().includes(lowerQuery)) {
            results.push(relative(root, full))
          }
        } else {
          walk(full, depth + 1)
        }
      } catch {
        continue
      }
    }
  }

  walk(root, 0)
  return results
}
