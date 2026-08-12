import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import type { PermissionConfig, ToolName } from './permissions'
import { isDenied, isAllowed, shouldAskUser, type Permission } from './permissions'

let pendingStashRef: string | null = null

function createGitSnapshot(cwd: string): void {
  if (pendingStashRef) return
  try {
    const isRepo = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      encoding: 'utf-8',
      cwd,
    }).trim()
    if (isRepo !== 'true') return
    const hasChanges = execFileSync('git', ['status', '--porcelain'], {
      encoding: 'utf-8',
      cwd,
    }).trim()
    if (!hasChanges) return
    const ref = execFileSync('git', ['stash', 'create'], {
      encoding: 'utf-8',
      cwd,
    }).trim()
    if (ref) pendingStashRef = ref
  } catch {
    // not a git repo or git unavailable
  }
}

export function getPendingStashRef(): string | null {
  return pendingStashRef
}

export function consumePendingStashRef(): string | null {
  const ref = pendingStashRef
  pendingStashRef = null
  return ref
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface ToolResult {
  toolCallId: string
  toolName: string
  success: boolean
  output: string
}

export type AskPermissionFn = (toolName: string, description: string) => Promise<boolean>

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'read',
      description: 'Read the contents of a file. Returns the file content as text.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file to read' },
          offset: { type: 'number', description: 'Line number to start reading from (1-indexed)' },
          limit: { type: 'number', description: 'Maximum number of lines to read' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write',
      description:
        'Write content to a file. Creates the file if it does not exist, or overwrites it.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file to write' },
          content: { type: 'string', description: 'Content to write to the file' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit',
      description: 'Edit a file by replacing an exact string match with new content.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to the file to edit' },
          oldString: { type: 'string', description: 'The exact string to find and replace' },
          newString: { type: 'string', description: 'The replacement string' },
        },
        required: ['path', 'oldString', 'newString'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bash',
      description: 'Execute a shell command and return stdout.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to execute' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'grep',
      description: 'Search file contents using a regular expression pattern.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regular expression pattern to search for' },
          path: {
            type: 'string',
            description: 'Directory or file to search in (default: current directory)',
          },
          include: { type: 'string', description: 'File pattern to include (e.g. "*.ts")' },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'glob',
      description: 'Find files matching a glob pattern.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern (e.g. "**/*.ts")' },
          path: {
            type: 'string',
            description: 'Root directory for the search (default: current directory)',
          },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list',
      description: 'List the contents of a directory.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to list (default: current directory)',
          },
        },
        required: [],
      },
    },
  },
]

function getPermission(permissions: PermissionConfig, toolName: string): Permission {
  const name = toolName as ToolName
  if (name in permissions) return permissions[name]
  return 'allow'
}

function filterToolsForMode(tools: ToolDefinition[], mode: 'build' | 'plan'): ToolDefinition[] {
  if (mode === 'build') return tools
  return tools.filter((t) => ['read', 'grep', 'glob', 'list'].includes(t.function.name))
}

export function getToolDefinitions(mode: 'build' | 'plan'): ToolDefinition[] {
  return filterToolsForMode(TOOL_DEFINITIONS, mode)
}

function truncateOutput(output: string, maxLength: number = 10000): string {
  if (output.length <= maxLength) return output
  return output.slice(0, maxLength) + '\n... (truncated)'
}

async function checkPermission(
  permissions: PermissionConfig,
  toolName: string,
  description: string,
  askPermission: AskPermissionFn,
): Promise<{ allowed: boolean; reason: string }> {
  const perm = getPermission(permissions, toolName)
  if (isDenied(perm)) return { allowed: false, reason: `Permission denied for ${toolName}` }
  if (isAllowed(perm)) return { allowed: true, reason: '' }
  if (shouldAskUser(perm)) {
    const ok = await askPermission(toolName, description)
    return { allowed: ok, reason: ok ? '' : 'User denied permission' }
  }
  return { allowed: true, reason: '' }
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  permissions: PermissionConfig,
  askPermission: AskPermissionFn,
  cwd: string,
): Promise<ToolResult> {
  const toolCallId = `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  try {
    switch (toolName) {
      case 'read': {
        const { allowed, reason } = await checkPermission(
          permissions,
          'read',
          `Read file: ${args['path']}`,
          askPermission,
        )
        if (!allowed) return { toolCallId, toolName, success: false, output: reason }
        const path = resolve(cwd, String(args['path'] ?? ''))
        if (!existsSync(path))
          return { toolCallId, toolName, success: false, output: `File not found: ${args['path']}` }
        const content = readFileSync(path, 'utf-8')
        const lines = content.split('\n')
        const offset = Number(args['offset'] ?? 1) - 1
        const limit = Number(args['limit'] ?? 2000)
        const slice = lines.slice(offset, offset + limit)
        return { toolCallId, toolName, success: true, output: truncateOutput(slice.join('\n')) }
      }
      case 'write': {
        const { allowed, reason } = await checkPermission(
          permissions,
          'write',
          `Write file: ${args['path']}`,
          askPermission,
        )
        if (!allowed) return { toolCallId, toolName, success: false, output: reason }
        createGitSnapshot(cwd)
        const path = resolve(cwd, String(args['path'] ?? ''))
        const content = String(args['content'] ?? '')
        writeFileSync(path, content)
        return {
          toolCallId,
          toolName,
          success: true,
          output: `Written ${content.length} bytes to ${args['path']}`,
        }
      }
      case 'edit': {
        const { allowed, reason } = await checkPermission(
          permissions,
          'edit',
          `Edit file: ${args['path']}`,
          askPermission,
        )
        if (!allowed) return { toolCallId, toolName, success: false, output: reason }
        createGitSnapshot(cwd)
        const path = resolve(cwd, String(args['path'] ?? ''))
        if (!existsSync(path))
          return { toolCallId, toolName, success: false, output: `File not found: ${args['path']}` }
        const content = readFileSync(path, 'utf-8')
        const oldStr = String(args['oldString'] ?? '')
        const newStr = String(args['newString'] ?? '')
        const occ = content.split(oldStr).length - 1
        if (occ === 0)
          return {
            toolCallId,
            toolName,
            success: false,
            output: `oldString not found in ${args['path']}`,
          }
        if (occ > 1)
          return {
            toolCallId,
            toolName,
            success: false,
            output: `oldString found ${occ} times in ${args['path']}, expected exactly 1`,
          }
        const updated = content.replace(oldStr, newStr)
        writeFileSync(path, updated)
        return { toolCallId, toolName, success: true, output: `Edited ${args['path']}` }
      }
      case 'bash': {
        const command = String(args['command'] ?? '')
        const { allowed, reason } = await checkPermission(
          permissions,
          'bash',
          `Execute: ${command}`,
          askPermission,
        )
        if (!allowed) return { toolCallId, toolName, success: false, output: reason }
        try {
          const stdout = execFileSync('bash', ['-c', command], {
            encoding: 'utf-8',
            cwd,
            timeout: 30000,
            maxBuffer: 1024 * 1024 * 10,
          })
          return { toolCallId, toolName, success: true, output: truncateOutput(stdout) }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          return { toolCallId, toolName, success: false, output: truncateOutput(errMsg) }
        }
      }
      case 'grep': {
        const { allowed, reason } = await checkPermission(
          permissions,
          'grep',
          `Search: ${args['pattern']}`,
          askPermission,
        )
        if (!allowed) return { toolCallId, toolName, success: false, output: reason }
        const pattern = String(args['pattern'] ?? '')
        const searchPath = resolve(cwd, String(args['path'] ?? '.'))
        const include = args['include'] ? String(args['include']) : undefined
        const results = grepSearch(pattern, searchPath, include, cwd)
        return {
          toolCallId,
          toolName,
          success: true,
          output: truncateOutput(results) || 'No matches found',
        }
      }
      case 'glob': {
        const { allowed, reason } = await checkPermission(
          permissions,
          'glob',
          `Glob: ${args['pattern']}`,
          askPermission,
        )
        if (!allowed) return { toolCallId, toolName, success: false, output: reason }
        const pattern = String(args['pattern'] ?? '**/*')
        const searchPath = resolve(cwd, String(args['path'] ?? '.'))
        const results = globMatch(pattern, searchPath, cwd)
        return {
          toolCallId,
          toolName,
          success: true,
          output: truncateOutput(results) || 'No files found',
        }
      }
      case 'list': {
        const { allowed, reason } = await checkPermission(
          permissions,
          'list',
          `List: ${args['path'] ?? '.'}`,
          askPermission,
        )
        if (!allowed) return { toolCallId, toolName, success: false, output: reason }
        const listPath = resolve(cwd, String(args['path'] ?? '.'))
        if (!existsSync(listPath))
          return {
            toolCallId,
            toolName,
            success: false,
            output: `Directory not found: ${args['path']}`,
          }
        const entries = readdirSync(listPath).map((f) => {
          const full = join(listPath, f)
          try {
            return `${f}${statSync(full).isDirectory() ? '/' : ''}`
          } catch {
            return f
          }
        })
        return { toolCallId, toolName, success: true, output: entries.join('\n') }
      }
      default:
        return { toolCallId, toolName, success: false, output: `Unknown tool: ${toolName}` }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { toolCallId, toolName, success: false, output: `Error: ${msg}` }
  }
}

function grepSearch(
  pattern: string,
  searchPath: string,
  include: string | undefined,
  cwd: string,
): string {
  try {
    const regex = new RegExp(pattern)
    const results: string[] = []
    const maxResults = 50

    function walk(dir: string) {
      if (results.length >= maxResults) return
      let entries: string[] = []
      try {
        entries = readdirSync(dir)
      } catch {
        return
      }
      for (const entry of entries) {
        if (results.length >= maxResults) return
        if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue
        const full = join(dir, entry)
        try {
          const stat = statSync(full)
          if (stat.isDirectory()) {
            walk(full)
          } else {
            if (include && !entry.match(include.replace(/\*/g, '.*').replace(/\?/g, '.'))) continue
            const content = readFileSync(full, 'utf-8')
            for (const line of content.split('\n')) {
              if (regex.test(line)) {
                const rel = relative(cwd, full)
                results.push(`${rel}: ${line.trim().slice(0, 200)}`)
                if (results.length >= maxResults) return
              }
            }
          }
        } catch {
          continue
        }
      }
    }

    if (statSync(searchPath).isFile()) {
      const content = readFileSync(searchPath, 'utf-8')
      for (const line of content.split('\n')) {
        if (regex.test(line)) {
          results.push(`${relative(cwd, searchPath)}: ${line.trim().slice(0, 200)}`)
          if (results.length >= maxResults) break
        }
      }
    } else {
      walk(searchPath)
    }

    return results.join('\n')
  } catch {
    return `Invalid regex: ${pattern}`
  }
}

function globMatch(pattern: string, searchPath: string, cwd: string): string {
  const results: string[] = []
  const maxResults = 100

  let regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '___GLOBSTAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___GLOBSTAR___/g, '.*')
    .replace(/\?/g, '[^/]')
  regexPattern = `^${regexPattern}$`

  try {
    const regex = new RegExp(regexPattern)

    function walk(dir: string, depth: number) {
      if (results.length >= maxResults || depth > 10) return
      let entries: string[] = []
      try {
        entries = readdirSync(dir)
      } catch {
        return
      }
      for (const entry of entries) {
        if (results.length >= maxResults) return
        if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue
        const full = join(dir, entry)
        const rel = relative(cwd, full)
        try {
          if (statSync(full).isDirectory()) {
            walk(full, depth + 1)
          } else {
            if (regex.test(rel)) results.push(rel)
          }
        } catch {
          continue
        }
      }
    }

    walk(searchPath, 0)
    return results.join('\n')
  } catch {
    return `Invalid glob pattern: ${pattern}`
  }
}
