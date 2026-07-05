// ====== ROUTE GUARD COMPONENT ======

import { ReactNode, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { UserRole } from '../rbac/roles'
import { hasAnyPermission, Permission } from '../rbac/permissions'

interface RouteGuardProps {
  /** Required role(s) to access this route */
  allowedRoles?: UserRole[]
  /** Required permission(s) to access this route */
  requiredPermissions?: Permission[]
  /** Component to render when access denied */
  forbiddenComponent?: ReactNode
  /** Children to render if access granted */
  children: ReactNode
}

/**
 * Component that protects routes based on user role and permissions.
 * If user doesn't have required role/permissions, shows 403 Forbidden.
 */
export function RouteGuard({
  allowedRoles,
  requiredPermissions,
  forbiddenComponent,
  children,
}: RouteGuardProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = useAuthStore((s) => s.currentUser)
  const userRole = currentUser?.role as UserRole | undefined

  // Check if user is authenticated
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }

    // If no role requirement, allow access
    if (!allowedRoles && !requiredPermissions) {
      return
    }

    // Check role access
    if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
      navigate('/403', { state: { from: location.pathname } })
      return
    }

    // Check permission access
    if (requiredPermissions && userRole && !hasAnyPermission(userRole, requiredPermissions)) {
      navigate('/403', { state: { from: location.pathname } })
      return
    }
  }, [isAuthenticated, userRole, allowedRoles, requiredPermissions, navigate, location.pathname])

  // Not authenticated - don't render anything (will redirect)
  if (!isAuthenticated) {
    return null
  }

  // Check role access
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return forbiddenComponent ? <>{forbiddenComponent}</> : <ForbiddenPage />
  }

  // Check permission access
  if (requiredPermissions && userRole && !hasAnyPermission(userRole, requiredPermissions)) {
    return forbiddenComponent ? <>{forbiddenComponent}</> : <ForbiddenPage />
  }

  return <>{children}</>
}

// Simple 403 Forbidden page component
function ForbiddenPage() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900">403</h1>
        <p className="mb-6 text-lg text-slate-600">Bạn không có quyền truy cập trang này</p>
        <p className="mb-8 text-sm text-slate-500">
          Vui lòng liên hệ quản trị viên nếu bạn cần quyền truy cập.
        </p>
        <button
          onClick={() => navigate('/', { state: { from: location.pathname } })}
          className="btn-primary"
        >
          Quay lại trang chủ
        </button>
      </div>
    </div>
  )
}

export default RouteGuard
