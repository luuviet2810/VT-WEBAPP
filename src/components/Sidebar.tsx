import {
  Car,
  Tag,
  CheckSquare,
  MapPin,
  BarChart3,
  ClipboardList,
  Users,
  LogOut,
  Menu,
  X,
  Settings,
  LogIn,
  Bell,
  Shield,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import NotificationCenter from './NotificationCenter'
import SettingsPanel from './SettingsPanel'

// Admin navigation
const ADMIN_NAV = [
  { to: '/', label: 'Danh sách xe', icon: Car, end: true },
  { to: '/bang-gia', label: 'Bảng giá', icon: Tag },
  { to: '/nhiem-vu', label: 'Nhiệm vụ', icon: CheckSquare },
  { to: '/vi-tri-xe', label: 'Vị trí xe', icon: MapPin },
  { to: '/thong-ke', label: 'Thống kê', icon: BarChart3 },
  { to: '/cham-cong', label: 'Chấm công', icon: ClipboardList },
  { to: '/nhan-vien', label: 'Nhân viên', icon: Users },
]

// Employee navigation (no admin pages)
const EMPLOYEE_NAV = [
  { to: '/', label: 'Danh sách xe', icon: Car, end: true },
  { to: '/bang-gia', label: 'Bảng giá', icon: Tag },
  { to: '/nhiem-vu', label: 'Nhiệm vụ', icon: CheckSquare },
  { to: '/vi-tri-xe', label: 'Vị trí xe', icon: MapPin },
  { to: '/cham-cong', label: 'Chấm công', icon: ClipboardList },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { currentUser, logout, getPendingUsers, isAdmin } = useAuthStore()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const pendingUsers = getPendingUsers()
  const NAV = isAdmin() ? ADMIN_NAV : EMPLOYEE_NAV

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Car size={18} />
        </div>
        <div className="flex-1">
          <div className="text-[15px] font-semibold text-slate-900 leading-tight">Gara Manager</div>
          <div className="text-xs text-slate-400 leading-tight">
            {currentUser?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
          </div>
        </div>
      </div>

      {/* Admin badge */}
      {isAdmin() && (
        <div className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <Shield size={14} className="text-amber-600" />
          <span className="text-xs font-medium text-amber-700">Admin Mode</span>
        </div>
      )}

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          // Show notification badge on "Nhân viên" for pending users
          const showBadge = item.to === '/nhan-vien' && pendingUsers.length > 0

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
              {showBadge && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                  {pendingUsers.length}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User profile */}
      <div className="border-t border-slate-100 px-3 py-3">
        {currentUser ? (
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {getInitials(currentUser.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-700">{currentUser.fullName}</div>
              <div className="truncate text-xs text-slate-400">
                {currentUser.role === 'admin' ? 'Quản trị' : 'Nhân viên'}
              </div>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
          >
            <LogIn size={18} />
            Đăng nhập
          </NavLink>
        )}
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Đăng xuất?</h3>
            <p className="mt-2 text-sm text-slate-600">Bạn có chắc muốn đăng xuất khỏi tài khoản này?</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="btn-secondary flex-1">
                Hủy
              </button>
              <button onClick={handleLogout} className="btn-primary flex-1">
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const { currentUser } = useAuthStore()

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Car size={16} />
          </div>
          <span className="font-semibold text-slate-900">Gara Manager</span>
        </div>
        <div className="flex items-center gap-1">
          {currentUser && <NotificationCenter />}
          <SettingsPanel />
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <Menu size={22} />
          </button>
        </div>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-[300px] flex-col bg-white shadow-xl md:hidden">
            <div className="flex justify-end px-3 pt-3">
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}
