// Unified permission definitions for NextGuard portal access control
// Used by: admin/page.tsx, admin/AccountPermissions.tsx, check-permission/route.ts

export interface PermissionDef {
  key: string
  label: string
  group: string
  description?: string
}

export const PERMISSION_GROUPS = [
  { id: 'content', label: 'Content Access', icon: '📂' },
  { id: 'security', label: 'Security', icon: '🔒' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'license', label: 'License Management', icon: '🔑' },
] as const

export const PERMISSION_DEFS: PermissionDef[] = [
  { key: 'kb', label: 'Knowledge Base', group: 'content', description: 'Access to KB articles and documentation' },
  { key: 'download', label: 'Downloads', group: 'content', description: 'Access to download center' },
  { key: 'socReview', label: 'AI SOC Review', group: 'security', description: 'Access to AI SOC dashboard' },
  { key: 'projectAccess', label: 'Project Access', group: 'security', description: 'Access to project management' },
  { key: 'quotation', label: 'Quotation', group: 'business', description: 'Access to quotation system' },
  { key: 'pocLicense', label: 'PoC License', group: 'license', description: 'Access to PoC license management' },
  { key: 'productionLicense', label: 'Prod License', group: 'license', description: 'Access to production license management' },
]

export const VALID_PERMISSION_KEYS = PERMISSION_DEFS.map(p => p.key)

export const DEFAULT_PERMISSIONS: Record<string, boolean> = Object.fromEntries(
  PERMISSION_DEFS.map(p => [p.key, p.key === 'download'])
)

export function getPermissionsByGroup(): { group: typeof PERMISSION_GROUPS[number]; permissions: PermissionDef[] }[] {
  return PERMISSION_GROUPS.map(group => ({
    group,
    permissions: PERMISSION_DEFS.filter(p => p.group === group.id),
  }))
}

export function countGranted(permissions: Record<string, boolean> | undefined): { granted: number; total: number } {
  const perms = permissions || DEFAULT_PERMISSIONS
  const granted = PERMISSION_DEFS.filter(p => perms[p.key] === true).length
  return { granted, total: PERMISSION_DEFS.length }
}
