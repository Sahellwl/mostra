// Role-based permission helpers
export type Role = 'super_admin' | 'agency_admin' | 'creative' | 'client'

export function canCreateProject(role: Role): boolean {
  return role === 'super_admin' || role === 'agency_admin'
}

export function canUploadFiles(role: Role): boolean {
  return role !== 'client'
}

export function canApprove(role: Role): boolean {
  return role === 'super_admin' || role === 'agency_admin' || role === 'client'
}
