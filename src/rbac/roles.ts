// ====== ROLE TYPES ======

export type UserRole = 'admin' | 'manager' | 'staff' | 'driver'
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'disabled'

// Role hierarchy (higher number = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin:   4,
  manager: 3,
  staff:   2,
  driver:  1,
}

// Role labels for display
export const ROLE_LABELS: Record<UserRole, string> = {
  admin:   'Quản lý bãi đất',
  manager: 'Quản lý',
  staff:   'Nhân viên',
  driver:  'Tài xế',
}

// Brand name
export const BRAND_NAME = 'VT AUTO'

// Check if role A has equal or higher permission than role B
export function hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

// Role badge colors
export const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  admin:   { bg: 'bg-purple-100', text: 'text-purple-700' },
  manager: { bg: 'bg-blue-100',   text: 'text-blue-700' },
  staff:   { bg: 'bg-slate-100',  text: 'text-slate-700' },
  driver:  { bg: 'bg-green-100',  text: 'text-green-700' },
}
