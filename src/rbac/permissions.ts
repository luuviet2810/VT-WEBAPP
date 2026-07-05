// ====== PERMISSIONS ======

import { UserRole } from './roles'

// Permission keys - each represents a specific action
export type Permission =
  // Vehicle permissions
  | 'vehicle:create'
  | 'vehicle:read'
  | 'vehicle:update'
  | 'vehicle:delete'
  | 'vehicle:move'
  | 'vehicle:assign'

  // Task permissions
  | 'task:create'
  | 'task:read'
  | 'task:update'
  | 'task:delete'
  | 'task:assign'

  // CheckSheet permissions
  | 'checksheet:create'
  | 'checksheet:read'
  | 'checksheet:update'

  // User/Employee permissions
  | 'user:create'
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  | 'user:approve'
  | 'user:reject'
  | 'user:enable'
  | 'user:disable'
  | 'user:changeRole'

  // Position permissions
  | 'position:create'
  | 'position:read'
  | 'position:update'
  | 'position:delete'

  // Attendance permissions
  | 'attendance:read'
  | 'attendance:create'
  | 'attendance:update'

  // Settings permissions
  | 'settings:read'
  | 'settings:update'

  // Price list permissions
  | 'pricelist:read'
  | 'pricelist:update'

  // Statistics permissions
  | 'statistics:read'
  | 'statistics:export'

// Role-Permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Full vehicle access
    'vehicle:create',
    'vehicle:read',
    'vehicle:update',
    'vehicle:delete',
    'vehicle:move',
    'vehicle:assign',

    // Full task access
    'task:create',
    'task:read',
    'task:update',
    'task:delete',
    'task:assign',

    // CheckSheet access
    'checksheet:create',
    'checksheet:read',
    'checksheet:update',

    // Full user management
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:approve',
    'user:reject',
    'user:enable',
    'user:disable',
    'user:changeRole',

    // Position management
    'position:create',
    'position:read',
    'position:update',
    'position:delete',

    // Attendance
    'attendance:read',
    'attendance:create',
    'attendance:update',

    // Settings
    'settings:read',
    'settings:update',

    // Price list
    'pricelist:read',
    'pricelist:update',

    // Statistics
    'statistics:read',
    'statistics:export',
  ],

  staff: [
    // Vehicle - read only (can view assigned vehicles)
    'vehicle:read',

    // Task - read and update own tasks
    'task:read',
    'task:update',

    // CheckSheet - create for assigned vehicles
    'checksheet:create',
    'checksheet:read',

    // User - read own profile
    'user:read',

    // Position - read only
    'position:read',

    // Attendance - create own check-in/out
    'attendance:read',
    'attendance:create',
  ],
}

// Check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

// Check if a role has any of the given permissions
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

// Check if a role has all of the given permissions
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}
