// ====== PERMISSIONS ======

import { UserRole } from './roles'

// Permission keys — each represents a specific action
export type Permission =
  // Dashboard
  | 'dashboard:read'

  // Vehicle permissions
  | 'vehicle:create'
  | 'vehicle:read'
  | 'vehicle:update'
  | 'vehicle:delete'
  | 'vehicle:move'
  | 'vehicle:assign'
  | 'vehicle:upload_photo'
  | 'vehicle:upload_document'
  | 'vehicle:delete_photo'
  | 'vehicle:delete_document'
  | 'vehicle:change_price'
  | 'vehicle:change_workflow'

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

  // Template permissions
  | 'template:read'
  | 'template:write'

// Role-Permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'dashboard:read',

    // Full vehicle access
    'vehicle:create',
    'vehicle:read',
    'vehicle:update',
    'vehicle:delete',
    'vehicle:move',
    'vehicle:assign',
    'vehicle:upload_photo',
    'vehicle:upload_document',
    'vehicle:delete_photo',
    'vehicle:delete_document',
    'vehicle:change_price',
    'vehicle:change_workflow',

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

    // Templates
    'template:read',
    'template:write',
  ],

  manager: [
    'dashboard:read',

    // Vehicle — create, read, update, move, assign; cannot delete, cannot change price, cannot change workflow manually
    'vehicle:create',
    'vehicle:read',
    'vehicle:update',
    'vehicle:move',
    'vehicle:assign',
    'vehicle:upload_photo',
    'vehicle:upload_document',
    'vehicle:delete_photo',
    'vehicle:delete_document',

    // Task — full access
    'task:create',
    'task:read',
    'task:update',
    'task:delete',
    'task:assign',

    // CheckSheet — full access
    'checksheet:create',
    'checksheet:read',
    'checksheet:update',

    // User — read and update only
    'user:read',
    'user:update',

    // Position — read and update
    'position:read',
    'position:update',

    // Attendance — full
    'attendance:read',
    'attendance:create',
    'attendance:update',

    // Settings — read only
    'settings:read',

    // Price list — full
    'pricelist:read',
    'pricelist:update',

    // Statistics — full
    'statistics:read',
    'statistics:export',

    // Templates
    'template:read',
    'template:write',
  ],

  staff: [
    'dashboard:read',

    // Vehicle — read, upload photos, cannot delete, cannot change price
    'vehicle:read',
    'vehicle:upload_photo',
    'vehicle:upload_document',

    // Task — read and update own tasks (update is checked via task ownership in components)
    'task:read',
    'task:update',

    // CheckSheet — create and read for assigned vehicles
    'checksheet:create',
    'checksheet:read',

    // User — read own profile
    'user:read',

    // Position — read only
    'position:read',

    // Attendance — create own check-in/out
    'attendance:read',
    'attendance:create',

    // Templates — read only (can apply templates to assigned vehicles)
    'template:read',
  ],

  driver: [
    'dashboard:read',

    // Vehicle — read only (view assigned move jobs / vehicle info)
    'vehicle:read',

    // Task — read and update (only vehicle movement confirmations)
    'task:read',
    'task:update',

    // CheckSheet — read only
    'checksheet:read',

    // User — read own profile
    'user:read',

    // Position — read only
    'position:read',

    // Attendance — create own check-in/out
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
