// ====== MAIN APPLICATION ROUTER ======

import { Route, Routes, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import GlobalSearch from './components/GlobalSearch'
import { useEffect } from 'react'
import { initializeFromSupabase } from './store/useStore'


// Pages
import VehicleList from './pages/VehicleList'
import PriceList from './pages/PriceList'
import VehicleDetail from './pages/VehicleDetail'
import Tasks from './pages/Tasks'
import TaskDetail from './pages/TaskDetail'
import Positions from './pages/Positions'
import Attendance from './pages/Attendance'
import Employees from './pages/Employees'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import MyTasks from './pages/MyTasks'
import ForbiddenPage from './pages/Forbidden'

// Dashboards
import OverviewDashboard from './pages/dashboards/OverviewDashboard'
import StatisticsDashboard from './pages/dashboards/StatisticsDashboard'
import StaffDashboard from './pages/dashboards/StaffDashboard'

import { useAuthStore } from './store/useAuthStore'
import { useViewModeStore } from './store/viewModeStore'
import { useState } from 'react'
import { UserRole } from './rbac/roles'

// Auth layout (no sidebar)
function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// Main layout (with sidebar)
function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f8fc]">
      {/* Sidebar as Drawer - hidden by default on mobile */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content - always full width */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-4 py-4 pb-24 md:px-6 md:py-6">
          {/* Mobile header with hamburger on left */}
          <div className="mb-4 flex items-center justify-between md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="btn-icon"
              aria-label="Mở menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12"/>
                <line x1="4" x2="20" y1="6" y2="6"/>
                <line x1="4" x2="20" y1="18" y2="18"/>
              </svg>
            </button>
            <GlobalSearch />
          </div>

          {/* Desktop search in header */}
          <div className="hidden md:mb-4 md:flex md:justify-end">
            <GlobalSearch />
          </div>

          {children}
        </div>
      </main>
    </div>
  )
}

// Protected route wrapper - requires authentication
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, currentUser } = useAuthStore()

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Role-based route guard
// IMPORTANT: This uses ACTUAL user role, NOT viewMode.
// viewMode only affects UI rendering, not route access.
function RoleGuard({ allowedRoles, children }: { allowedRoles: UserRole[]; children: React.ReactNode }) {
  const { isAuthenticated, currentUser } = useAuthStore()

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />
  }

  // Always use ACTUAL user role for route access check
  const userRole = currentUser.role as UserRole
  
  // Admin always has access (can preview any UI)
  // Non-admin users are checked against allowedRoles
  const hasAccess = userRole === 'admin' || allowedRoles.includes(userRole)
  
  if (!hasAccess) {
    return <ForbiddenPage />
  }

  return <>{children}</>
}

// Get dashboard component based on user role (or view mode)
function DashboardRouter() {
  const { currentUser } = useAuthStore()
  const viewMode = useViewModeStore((s) => s.viewMode)
  
  // Admin can preview different dashboards, others use their actual role
  const effectiveRole = currentUser?.role === 'admin' ? viewMode : (currentUser?.role as UserRole)

  // Admin/Staff all use the same overview dashboard at root
  return <OverviewDashboard />
}

// Get statistics dashboard (admin only)
function StatisticsRouter() {
  return <StatisticsDashboard />
}

export default function App() {
  const { isAuthenticated, currentUser } = useAuthStore()

  useEffect(() => {
    initializeFromSupabase()
  }, [])

  return (
    <Routes>
      {/* ====== AUTH ROUTES ====== */}
      <Route
        path="/login"
        element={
          isAuthenticated && currentUser ? (
            <Navigate to="/" replace />
          ) : (
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated && currentUser ? (
            <Navigate to="/" replace />
          ) : (
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          )
        }
      />

      {/* ====== PROTECTED ROUTES ====== */}

      {/* Dashboard / Tổng quan - accessible by all authenticated users */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DashboardRouter />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Vehicle routes */}
      <Route
        path="/xe"
        element={
          <ProtectedRoute>
            <MainLayout>
              <VehicleList />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/xe/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <VehicleDetail />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Task routes - Admin only */}
      <Route
        path="/nhiem-vu"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <MainLayout>
              <Tasks />
            </MainLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/nhiem-vu/:id"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <MainLayout>
              <TaskDetail />
            </MainLayout>
          </RoleGuard>
        }
      />

      {/* My Tasks - Staff only */}
      <Route
        path="/viec-cua-toi"
        element={
          <RoleGuard allowedRoles={['staff']}>
            <MainLayout>
              <MyTasks />
            </MainLayout>
          </RoleGuard>
        }
      />

      {/* Position routes - accessible by all */}
      <Route
        path="/vi-tri"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Positions />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Statistics - Admin only */}
      <Route
        path="/thong-ke"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <MainLayout>
              <StatisticsRouter />
            </MainLayout>
          </RoleGuard>
        }
      />

      {/* Attendance - accessible by all */}
      <Route
        path="/cham-cong"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Attendance />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Employee management - Admin only */}
      <Route
        path="/nhan-vien"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <MainLayout>
              <Employees />
            </MainLayout>
          </RoleGuard>
        }
      />

      {/* Price list - Admin only */}
      <Route
        path="/bang-gia"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <MainLayout>
              <PriceList />
            </MainLayout>
          </RoleGuard>
        }
      />

      {/* Settings - Admin only */}
      <Route
        path="/cai-dat"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <MainLayout>
              <div className="card p-6">
                <h2 className="text-lg font-semibold">Cài đặt</h2>
                <p className="mt-2 text-slate-500">Chức năng đang phát triển...</p>
              </div>
            </MainLayout>
          </RoleGuard>
        }
      />

      {/* Profile - accessible by all */}
      <Route
        path="/ho-so"
        element={
          <ProtectedRoute>
            <MainLayout>
              <div className="card p-6">
                <h2 className="text-lg font-semibold">Hồ sơ</h2>
                <p className="mt-2 text-slate-500">Thông tin cá nhân của bạn</p>
              </div>
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* 403 Forbidden */}
      <Route
        path="/403"
        element={<ForbiddenPage />}
      />

      {/* Catch all - redirect to home or login */}
      <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
    </Routes>
  );
}
