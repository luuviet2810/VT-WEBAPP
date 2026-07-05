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
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f8fc]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-8 sm:py-6">
          <div className="mb-4 flex justify-end">
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
