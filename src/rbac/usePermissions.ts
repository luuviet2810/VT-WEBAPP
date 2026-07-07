// ====== PERMISSION HOOK — centralized permission helpers ======

import { useCallback } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { Permission, hasPermission, hasAnyPermission, hasAllPermissions } from './permissions'
import { UserRole } from './roles'

/**
 * Returns the current user's role, or 'driver' as the default (most restrictive).
 */
function useRole(): UserRole {
  return (useAuthStore((s) => s.currentUser?.role) as UserRole | undefined) ?? 'staff'
}

/**
 * Core hook — check a single permission.
 *
 * @example
 * const canDelete = usePermission('vehicle:delete')
 * if (!canDelete) return <DisabledButton />
 */
export function usePermission(permission: Permission): boolean {
  const role = useRole()
  return hasPermission(role, permission)
}

/**
 * Check if user has ANY of the given permissions.
 */
export function useAnyPermission(permissions: Permission[]): boolean {
  const role = useRole()
  return hasAnyPermission(role, permissions)
}

/**
 * Check if user has ALL of the given permissions.
 */
export function useAllPermissions(permissions: Permission[]): boolean {
  const role = useRole()
  return hasAllPermissions(role, permissions)
}

/**
 * Convenience hook — returns all vehicle-related permission checks.
 */
export function useVehiclePermissions() {
  const role = useRole()
  return {
    canRead:       hasPermission(role, 'vehicle:read'),
    canCreate:     hasPermission(role, 'vehicle:create'),
    canUpdate:     hasPermission(role, 'vehicle:update'),
    canDelete:     hasPermission(role, 'vehicle:delete'),
    canMove:       hasPermission(role, 'vehicle:move'),
    canAssign:     hasPermission(role, 'vehicle:assign'),
    canUploadPhoto:    hasPermission(role, 'vehicle:upload_photo'),
    canUploadDoc:     hasPermission(role, 'vehicle:upload_document'),
    canDeletePhoto:    hasPermission(role, 'vehicle:delete_photo'),
    canDeleteDoc:      hasPermission(role, 'vehicle:delete_document'),
    canChangePrice:    hasPermission(role, 'vehicle:change_price'),
    canChangeWorkflow: hasPermission(role, 'vehicle:change_workflow'),
  }
}

/**
 * Convenience hook — returns all task-related permission checks.
 */
export function useTaskPermissions() {
  const role = useRole()
  return {
    canRead:   hasPermission(role, 'task:read'),
    canCreate: hasPermission(role, 'task:create'),
    canUpdate: hasPermission(role, 'task:update'),
    canDelete: hasPermission(role, 'task:delete'),
    canAssign: hasPermission(role, 'task:assign'),
  }
}

/**
 * Convenience hook — returns all price-list-related permission checks.
 */
export function usePricePermissions() {
  const role = useRole()
  return {
    canRead:   hasPermission(role, 'pricelist:read'),
    canUpdate: hasPermission(role, 'pricelist:update'),
  }
}

/**
 * Convenience hook — returns all checksheet-related permission checks.
 */
export function useChecksheetPermissions() {
  const role = useRole()
  return {
    canRead:   hasPermission(role, 'checksheet:read'),
    canCreate: hasPermission(role, 'checksheet:create'),
    canUpdate: hasPermission(role, 'checksheet:update'),
  }
}

/**
 * Returns true if the current user can update a specific task.
 * Staff/Driver can only update tasks assigned to them.
 */
export function useCanUpdateTask(taskAssigneeId?: string | null): boolean {
  const role = useRole()
  const currentUserId = useAuthStore((s) => s.currentUser?.id)

  if (!hasPermission(role, 'task:update')) return false
  if (role === 'admin') return true
  // staff/driver — only own tasks
  return taskAssigneeId === currentUserId
}

/**
 * Returns true if the current user can delete a specific vehicle.
 * Only admin/manager can delete.
 */
export function useCanDeleteVehicle(): boolean {
  const role = useRole()
  return hasPermission(role, 'vehicle:delete')
}

/**
 * Returns true if the current user can change vehicle selling price.
 * Only admin/manager can change price.
 */
export function useCanChangePrice(): boolean {
  const role = useRole()
  return hasPermission(role, 'vehicle:change_price')
}

/**
 * Returns true if the current user can manually change workflow.
 * Only admin can.
 */
export function useCanChangeWorkflow(): boolean {
  const role = useRole()
  return hasPermission(role, 'vehicle:change_workflow')
}

/**
 * Returns template-related permissions for the current user.
 */
export function useTemplatePermissions() {
  const canRead = usePermission('template:read')
  const canWrite = usePermission('template:write')
  return { canRead, canWrite }
}
