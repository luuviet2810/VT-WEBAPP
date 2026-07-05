// ====== PERMISSION GUARD COMPONENT ======

import { ReactNode } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { Permission, hasPermission, hasAnyPermission, hasAllPermissions } from '../rbac/permissions'
import { UserRole } from '../rbac/roles'

interface PermissionGuardProps {
  /** Single permission to check */
  permission?: Permission
  /** Multiple permissions - user must have ANY of these */
  permissions?: Permission[]
  /** Multiple permissions - user must have ALL of these */
  allPermissions?: Permission[]
  /** Fallback component when access denied */
  fallback?: ReactNode
  /** Children to render if access granted */
  children: ReactNode
}

/**
 * Component that conditionally renders children based on user permissions.
 * 
 * Usage:
 * <PermissionGuard permission="vehicle:create">
 *   <AddVehicleButton />
 * </PermissionGuard>
 * 
 * <PermissionGuard permissions={['user:approve', 'user:reject']}>
 *   <UserActions />
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  permissions,
  allPermissions,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const userRole = useAuthStore((s) => s.currentUser?.role) as UserRole | undefined

  if (!userRole) {
    return <>{fallback}</>
  }

  // Check single permission
  if (permission && !hasPermission(userRole, permission)) {
    return <>{fallback}</>
  }

  // Check if user has ANY of the permissions
  if (permissions && !hasAnyPermission(userRole, permissions)) {
    return <>{fallback}</>
  }

  // Check if user has ALL of the permissions
  if (allPermissions && !hasAllPermissions(userRole, allPermissions)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

export default PermissionGuard
