import { useAuthStore } from '../store/useAuthStore'
import { useViewModeStore } from '../store/viewModeStore'
import { UserRole } from '../rbac/roles'

/**
 * Returns the effective role for UI rendering.
 * Admin can preview any role via viewMode; others use their actual role.
 */
export function useEffectiveRole(): UserRole {
  const currentUser = useAuthStore((s) => s.currentUser)
  const viewMode = useViewModeStore((s) => s.viewMode)
  const actualRole = (currentUser?.role as UserRole) || 'driver'
  if (actualRole === 'admin') {
    return viewMode
  }
  return actualRole
}

/**
 * Returns true if effective role is admin (for UI rendering).
 */
export function useIsAdminMode(): boolean {
  return useEffectiveRole() === 'admin'
}

/**
 * Returns true if effective role is manager (for UI rendering).
 */
export function useIsManagerMode(): boolean {
  return useEffectiveRole() === 'manager'
}

/**
 * Returns true if effective role is staff (for UI rendering).
 */
export function useIsStaffMode(): boolean {
  const role = useEffectiveRole()
  return role === 'staff'
}

/**
 * Returns true if effective role is driver (for UI rendering).
 */
export function useIsDriverMode(): boolean {
  return useEffectiveRole() === 'driver'
}

/**
 * Legacy hook — use useIsAdminMode() instead.
 */
export function useIsAdmin() {
  return useIsAdminMode()
}
