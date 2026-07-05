import { Route, Routes, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import GlobalSearch from './components/GlobalSearch'
import VehicleList from './pages/VehicleList'
import PriceList from './pages/PriceList'
import VehicleDetail from './pages/VehicleDetail'
import Tasks from './pages/Tasks'
import TaskDetail from './pages/TaskDetail'
import Positions from './pages/Positions'
import Dashboard from './pages/Dashboard'
import Attendance from './pages/Attendance'
import Employees from './pages/Employees'
import LoginPage from './pages/Login'
import RegisterPage from './pages/Register'
import { useAuthStore } from './store/useAuthStore'
import { useState } from 'react'

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, currentUser } = useAuthStore()

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Admin route wrapper
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, currentUser } = useAuthStore()

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />
  }

  if (currentUser.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

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
          {/* Mobile header with menu button */}
          <div className="mb-4 flex items-center justify-between md:hidden">
            <GlobalSearch />
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

export default function App() {
  const { isAuthenticated, currentUser } = useAuthStore()

  // Redirect logged-in users from auth pages
  const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register'

  return (
    <Routes>
      {/* Auth routes */}
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

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout>
              <VehicleList />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bang-gia"
        element={
          <ProtectedRoute>
            <MainLayout>
              <PriceList />
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
      <Route
        path="/nhiem-vu"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Tasks />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/nhiem-vu/:id"
        element={
          <ProtectedRoute>
            <MainLayout>
              <TaskDetail />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vi-tri-xe"
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
          <ProtectedRoute>
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
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
          <AdminRoute>
            <MainLayout>
              <Employees />
            </MainLayout>
          </AdminRoute>
        }
      />

      {/* Catch all - redirect to home or login */}
      <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
    </Routes>
  )
}
