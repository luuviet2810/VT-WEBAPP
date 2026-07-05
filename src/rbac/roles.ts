// ====== ROLE TYPES ======

export type UserRole = 'admin' | 'staff'
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'disabled'

// Role hierarchy (higher number = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 2,
  staff: 1,
}

// Role labels for display
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản lý bãi đất',
  staff: 'Nhân viên',
}

// Brand name
export const BRAND_NAME = 'VT AUTO'

// Check if role A has equal or higher permission than role B
export function hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

// Role badge colors
export const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  admin: { bg: 'bg-purple-100', text: 'text-purple-700' },
  staff: { bg: 'bg-slate-100', text: 'text-slate-700' },
}
