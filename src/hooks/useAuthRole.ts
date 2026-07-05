import { useAuthStore } from '../store/useAuthStore'
import { useViewModeStore } from '../store/viewModeStore'
import { UserRole } from '../rbac/roles'

/**
 * Hook to check if user is in admin mode
 * - Returns true if actual user role is admin (regardless of viewMode)
 * - Returns true if user is admin previewing staff (viewMode = staff but role = admin)
 * 
 * Use this for UI rendering decisions (showing/hiding buttons, columns, etc.)
 */
export function useIsAdminMode(): boolean {
  const currentUser = useAuthStore((s) => s.currentUser)
  const viewMode = useViewModeStore((s) => s.viewMode)
  
  // Actual admin can always see admin UI
  if (currentUser?.role === 'admin') {
    return true
  }
  
  // Non-admin users
  return false
}

/**
 * Hook to check if user should see staff-only UI
 * - Returns true only when viewing as staff (either actual role OR viewMode = staff)
 */
export function useIsStaffMode(): boolean {
  const currentUser = useAuthStore((s) => s.currentUser)
  const viewMode = useViewModeStore((s) => s.viewMode)
  const actualRole = currentUser?.role as UserRole
  
  // Admin previewing staff
  if (actualRole === 'admin' && viewMode === 'staff') {
    return true
  }
  
  // Actual staff
  if (actualRole === 'staff') {
    return true
  }
  
  return false
}

/**
 * Hook to get effective role for UI rendering
 * - Admin with viewMode staff = returns 'staff'
 * - Admin with viewMode admin = returns 'admin'
 * - Staff = returns 'staff'
 */
export function useEffectiveRole(): UserRole {
  const currentUser = useAuthStore((s) => s.currentUser)
  const viewMode = useViewModeStore((s) => s.viewMode)
  const actualRole = (currentUser?.role as UserRole) || 'staff'
  
  // Admin can preview different roles
  if (actualRole === 'admin') {
    return viewMode
  }
  
  return actualRole
}

/**
 * Legacy hook - kept for backward compatibility
 * Use useIsAdminMode() for new code
 */
export function useIsAdmin() {
  return useIsAdminMode()
}

export function useCurrentEmployee() {
  // This is kept for backward compatibility
  // In the new auth system, we use useAuthStore directly
  return null
}
