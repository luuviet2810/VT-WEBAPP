// ====== MAIN APPLICATION ROUTER ======

import { Route, Routes, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import NotificationCenter from './components/NotificationCenter'
import { useEffect } from 'react'
import { initializeFromSupabase } from './store/useStore'

import VehicleList from './pages/VehicleList'
import PriceList from './pages/PriceList'
import SoldVehicles from './pages/SoldVehicles'
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

import OverviewDashboard from './pages/dashboards/OverviewDashboard'
import StatisticsDashboard from './pages/dashboards/StatisticsDashboard'
import StaffDashboard from './pages/dashboards/StaffDashboard'

import { useAuthStore } from './store/useAuthStore'
import { useViewModeStore } from './store/viewModeStore'
import { useState } from 'react'
import { UserRole } from './rbac/roles'

function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f8fc]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-4 py-4 pb-24 md:px-6 md:py-6">
          <div className="mb-4 flex items-center justify-between md:hidden">
            <button onClick={() => setSidebarOpen(true)} className="btn-icon" aria-label="Mở menu">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
          </div>

          {children}
        </div>
      </main>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading, currentUser } = useAuthStore()

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function RoleGuard({ allowedRoles, children }: { allowedRoles: UserRole[]; children: React.ReactNode }) {
  const { isAuthenticated, authLoading, currentUser } = useAuthStore()

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />
  }

  const userRole = currentUser.role as UserRole
  const hasAccess = userRole === 'admin' || allowedRoles.includes(userRole)

  if (!hasAccess) {
    return <ForbiddenPage />
  }

  return <>{children}</>
}

function DashboardRouter() {
  const { currentUser } = useAuthStore()
  const viewMode = useViewModeStore((s) => s.viewMode)
  const effectiveRole = currentUser?.role === 'admin' ? viewMode : (currentUser?.role as UserRole)
  return <OverviewDashboard />
}

function StatisticsRouter() {
  return <StatisticsDashboard />
}

export default function App() {
  const { initializeAuth, authLoading, isAuthenticated, currentUser } = useAuthStore()

  useEffect(() => {
    initializeAuth()
    initializeFromSupabase()
  }, [])

  return (
    <Routes>
      {/* ====== AUTH ROUTES ====== */}
      <Route
        path="/login"
        element={
          authLoading ? (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
            </div>
          ) : isAuthenticated && currentUser ? (
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
          authLoading ? (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
            </div>
          ) : isAuthenticated && currentUser ? (
            <Navigate to="/" replace />
          ) : (
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          )
        }
      />

      {/* ====== PROTECTED ROUTES ====== */}

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
        path="/xe-da-ban"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <MainLayout>
              <SoldVehicles />
            </MainLayout>
          </RoleGuard>
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

      <Route
        path="/bang-gia"
        element={
          <RoleGuard allowedRoles={['admin', 'staff']}>
            <MainLayout>
              <PriceList />
            </MainLayout>
          </RoleGuard>
        }
      />

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

      <Route
        path="/403"
        element={<ForbiddenPage />}
      />

      <Route
        path="*"
        element={
          <Navigate
            to={isAuthenticated ? '/' : '/login'}
            replace
          />
        }
      />
    </Routes>
  )
}
