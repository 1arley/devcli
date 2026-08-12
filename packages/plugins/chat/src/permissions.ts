export type Permission = 'allow' | 'ask' | 'deny'

export type ToolName = 'read' | 'write' | 'edit' | 'bash' | 'grep' | 'glob' | 'list'

export interface PermissionConfig {
  read: Permission
  write: Permission
  edit: Permission
  bash: Permission
  grep: Permission
  glob: Permission
  list: Permission
}

export const DEFAULT_PERMISSIONS: PermissionConfig = {
  read: 'allow',
  write: 'ask',
  edit: 'ask',
  bash: 'ask',
  grep: 'allow',
  glob: 'allow',
  list: 'allow',
}

export function resolvePermissions(
  config: { chat?: { permissions?: Partial<PermissionConfig> } },
  auto: boolean,
): PermissionConfig {
  const overrides = config.chat?.permissions ?? {}
  const merged: PermissionConfig = { ...DEFAULT_PERMISSIONS, ...overrides }
  if (auto) {
    const upgraded = {} as PermissionConfig
    for (const k of Object.keys(merged) as ToolName[]) {
      upgraded[k] = merged[k] === 'deny' ? 'deny' : 'allow'
    }
    return upgraded
  }
  return merged
}

export function shouldAskUser(perm: Permission): boolean {
  return perm === 'ask'
}

export function isDenied(perm: Permission): boolean {
  return perm === 'deny'
}

export function isAllowed(perm: Permission): boolean {
  return perm === 'allow'
}
