// ====== DASHBOARD CONFIGURATION BY ROLE ======

import { UserRole } from './roles'

export interface DashboardConfig {
  title: string
  subtitle: string
  path: string
}

export const DASHBOARD_CONFIG: Record<UserRole, DashboardConfig> = {
  admin: {
    title: 'Tổng quan',
    subtitle: 'Quản lý bãi đất',
    path: '/',
  },

  staff: {
    title: 'Hôm nay',
    subtitle: 'Công việc của bạn',
    path: '/',
  },
}

// Get dashboard config for a role
export function getDashboardConfig(role: UserRole): DashboardConfig {
  return DASHBOARD_CONFIG[role] || DASHBOARD_CONFIG.staff
}
