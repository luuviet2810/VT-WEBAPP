// ====== ROUTE PROTECTION CONFIGURATION ======

import { UserRole } from './roles'
import { Permission } from './permissions'

export interface RouteConfig {
  path: string
  label: string
  component: string
  layout?: 'main' | 'auth' | 'blank'
  exact?: boolean
  
  // Role-based access
  allowedRoles?: UserRole[]
  requiredPermissions?: Permission[]
  
  // For nested routes
  children?: RouteConfig[]
}

const PUBLIC_ROUTES: RouteConfig[] = [
  { path: '/login', label: 'Đăng nhập', component: 'Login', layout: 'auth' },
  { path: '/register', label: 'Đăng ký', component: 'Register', layout: 'auth' },
]

const PROTECTED_ROUTES: RouteConfig[] = [
  // Dashboard routes
  { 
    path: '/', 
    label: 'Tổng quan', 
    component: 'Dashboard', 
    layout: 'main',
    exact: true,
    allowedRoles: ['admin', 'staff'],
  },

  // Vehicle routes
  { 
    path: '/xe', 
    label: 'Danh sách xe', 
    component: 'VehicleList', 
    layout: 'main',
    allowedRoles: ['admin', 'staff'],
    requiredPermissions: ['vehicle:read'],
  },
  { 
    path: '/xe/:id', 
    label: 'Chi tiết xe', 
    component: 'VehicleDetail', 
    layout: 'main',
    allowedRoles: ['admin', 'staff'],
    requiredPermissions: ['vehicle:read'],
  },

  // Task routes
  {
    path: '/nhiem-vu',
    label: 'Nhiệm vụ',
    component: 'Tasks',
    layout: 'main',
    allowedRoles: ['admin', 'staff'],
    requiredPermissions: ['task:read'],
  },
  {
    path: '/nhiem-vu/:id',
    label: 'Chi tiết nhiệm vụ',
    component: 'TaskDetail',
    layout: 'main',
    allowedRoles: ['admin', 'staff'],
    requiredPermissions: ['task:read'],
  },
  {
    path: '/viec-cua-toi',
    label: 'Việc của tôi',
    component: 'MyTasks',
    layout: 'main',
    allowedRoles: ['staff'],
    requiredPermissions: ['task:read'],
  },

  // Position routes
  { 
    path: '/vi-tri', 
    label: 'Vị trí xe', 
    component: 'Positions', 
    layout: 'main',
    allowedRoles: ['admin', 'staff'],
    requiredPermissions: ['position:read'],
  },

  // Statistics routes (Admin only)
  { 
    path: '/thong-ke', 
    label: 'Thống kê', 
    component: 'Statistics', 
    layout: 'main',
    allowedRoles: ['admin'],
    requiredPermissions: ['statistics:read'],
  },

  // Attendance routes
  { 
    path: '/cham-cong', 
    label: 'Chấm công', 
    component: 'Attendance', 
    layout: 'main',
    allowedRoles: ['admin', 'staff'],
    requiredPermissions: ['attendance:read'],
  },

  {
    path: '/xe-da-ban',
    label: 'Xe đã bán',
    component: 'SoldVehicles',
    layout: 'main',
    allowedRoles: ['admin'],
    requiredPermissions: ['pricelist:read'],
  },

  // Employee management routes (Admin only)
  { 
    path: '/nhan-vien', 
    label: 'Nhân viên', 
    component: 'Employees', 
    layout: 'main',
    allowedRoles: ['admin'],
    requiredPermissions: ['user:read'],
  },

  // Price list routes
  {
    path: '/bang-gia',
    label: 'Bảng giá',
    component: 'PriceList',
    layout: 'main',
    allowedRoles: ['admin', 'staff'],
    requiredPermissions: ['pricelist:read'],
  },

  // Settings routes (Admin only)
  { 
    path: '/cai-dat', 
    label: 'Cài đặt', 
    component: 'Settings', 
    layout: 'main',
    allowedRoles: ['admin'],
    requiredPermissions: ['settings:read'],
  },

  // Profile routes (All authenticated users)
  { 
    path: '/ho-so', 
    label: 'Hồ sơ', 
    component: 'Profile', 
    layout: 'main',
    allowedRoles: ['admin', 'staff'],
    requiredPermissions: ['user:read'],
  },

  // 403 Forbidden page
  { 
    path: '/403', 
    label: 'Không có quyền', 
    component: 'Forbidden', 
    layout: 'blank',
  },
]

export { PUBLIC_ROUTES, PROTECTED_ROUTES }

// Check if route is accessible by role
export function isRouteAccessible(
  route: RouteConfig, 
  userRole: UserRole
): boolean {
  if (!route.allowedRoles) return true
  return route.allowedRoles.includes(userRole)
}

// Get routes visible to a role
export function getAccessibleRoutes(role: UserRole): RouteConfig[] {
  return PROTECTED_ROUTES.filter((route) => isRouteAccessible(route, role))
}
