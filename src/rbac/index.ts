// ====== RBAC MODULE EXPORTS ======

export * from './roles'
export * from './permissions'
export { SIDEBAR_CONFIG, getSidebarConfig } from './sidebarConfig'
export { DASHBOARD_CONFIG, getDashboardConfig } from './dashboardConfig'
export * from './routesConfig'

// Re-export UserRole type for convenience
export type { UserRole } from './roles'
