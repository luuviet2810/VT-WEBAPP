// ====== ROLE-BASED SIDEBAR ======

import {
  Car,
  LogOut,
  X,
  Shield,
  Bell,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useViewModeStore } from '../store/viewModeStore'
import NotificationCenter from './NotificationCenter'
import ViewModeToggle from './ViewModeToggle'
import { SIDEBAR_CONFIG, getSidebarConfig } from '../rbac/sidebarConfig'
import { ROLE_LABELS, BRAND_NAME } from '../rbac/roles'
import { UserRole } from '../rbac/roles'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

// Get effective role for rendering (view mode or actual role)
function useEffectiveRole(): UserRole {
  const currentUser = useAuthStore((s) => s.currentUser)
  const viewMode = useViewModeStore((s) => s.viewMode)
  const actualRole = (currentUser?.role as UserRole) || 'staff'
  
  // Admin can preview different roles, others use their actual role
  if (actualRole === 'admin') {
    return viewMode
  }
  return actualRole
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`
          fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out md:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <DrawerContent onClose={onClose} />
      </div>

      {/* Desktop Sidebar - always visible */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <DesktopSidebarContent />
      </aside>
    </>
  )
}

function DrawerContent({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuthStore()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const effectiveRole = useEffectiveRole()
  const sidebarConfig = getSidebarConfig(effectiveRole)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getInitials = (name: string) => {
    if (!name) return '?'
    const trimmed = name.trim()
    if (!trimmed) return '?'
    const parts = trimmed.split(' ')
    if (parts.length >= 2) {
      const first = parts[0]?.[0] ?? ''
      const last = parts[parts.length - 1]?.[0] ?? ''
      return (first + last).toUpperCase()
    }
    return trimmed.slice(0, 2).toUpperCase()
  }

  return (
    <div className="flex h-full flex-col">
      {/* View Mode Toggle - Only for Admin */}
      {currentUser?.role === 'admin' && (
        <div className="border-b border-slate-100 px-4 pt-4">
          <ViewModeToggle />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Car size={20} />
          </div>
          <div>
            <div className="font-semibold text-slate-900">VT AUTO</div>
            <div className="text-xs text-slate-400">
              {ROLE_LABELS[effectiveRole]}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="btn-icon"
          aria-label="Đóng menu"
        >
          <X size={22} />
        </button>
      </div>

      {/* Admin badge - only show for admin with admin view mode */}
      {effectiveRole === 'admin' && (
        <div className="mx-4 my-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <Shield size={16} className="text-amber-600" />
          <span className="text-sm font-medium text-amber-700">Admin Mode</span>
        </div>
      )}

      {/* Navigation - Top items */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {sidebarConfig.top.map((item) => {
          const showBadge = item.key === 'employees' && false

          return (
            <NavLink
              key={item.key}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium transition-colors min-h-[48px]
                ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
              {showBadge && (
                <span className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
                  0
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Navigation - Bottom items */}
      <nav className="px-3 py-2 border-t border-slate-100">
        {sidebarConfig.bottom.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium transition-colors min-h-[48px]
              ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Notifications */}
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2 text-slate-600">
          <Bell size={20} />
          <span className="text-sm font-medium">Thông báo</span>
        </div>
        <NotificationCenter />
      </div>

      {/* User profile */}
      <div className="border-t border-slate-100 p-4">
        {currentUser ? (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {getInitials(currentUser.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900">{currentUser.fullName}</div>
              <div className="truncate text-xs text-slate-400">
                {ROLE_LABELS[effectiveRole]}
              </div>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="btn-icon"
              title="Đăng xuất"
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium text-brand-600 hover:bg-brand-50 min-h-[48px]"
          >
            <LogOut size={20} />
            <span>Đăng nhập</span>
          </NavLink>
        )}
      </div>

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 md:items-center">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 md:rounded-2xl animate-slide-in-bottom">
            <h3 className="text-lg font-bold text-slate-900">Đăng xuất?</h3>
            <p className="mt-2 text-sm text-slate-600">Bạn có chắc muốn đăng xuất?</p>
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

function DesktopSidebarContent() {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuthStore()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const effectiveRole = useEffectiveRole()
  const sidebarConfig = getSidebarConfig(effectiveRole)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getInitials = (name: string) => {
    if (!name) return '?'
    const trimmed = name.trim()
    if (!trimmed) return '?'
    const parts = trimmed.split(' ')
    if (parts.length >= 2) {
      const first = parts[0]?.[0] ?? ''
      const last = parts[parts.length - 1]?.[0] ?? ''
      return (first + last).toUpperCase()
    }
    return trimmed.slice(0, 2).toUpperCase()
  }

  return (
    <div className="flex h-full flex-col">
      {/* View Mode Toggle - Only for Admin */}
      {currentUser?.role === 'admin' && (
        <div className="border-b border-slate-100 px-3 pt-4">
          <ViewModeToggle />
        </div>
      )}

      {/* Logo & Title */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Car size={18} />
        </div>
        <div className="flex-1">
          <div className="text-[15px] font-semibold text-slate-900 leading-tight">VT AUTO</div>
          <div className="text-xs text-slate-400 leading-tight">
            {ROLE_LABELS[effectiveRole]}
          </div>
        </div>
      </div>

      {/* Admin badge - only show for admin with admin view mode */}
      {effectiveRole === 'admin' && (
        <div className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <Shield size={14} className="text-amber-600" />
          <span className="text-xs font-medium text-amber-700">Admin Mode</span>
        </div>
      )}

      {/* Navigation - Top items */}
      <nav className="flex-1 space-y-0.5 px-3">
        {sidebarConfig.top.map((item) => {
          const showBadge = item.key === 'employees' && false

          return (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`
              }
            >
              {item.icon}
              {item.label}
              {showBadge && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                  0
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Navigation - Bottom items */}
      <nav className="space-y-0.5 border-t border-slate-100 px-3 pt-2">
        {sidebarConfig.bottom.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
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
                {ROLE_LABELS[effectiveRole]}
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
            <LogOut size={18} />
            Đăng nhập
          </NavLink>
        )}
      </div>

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Đăng xuất?</h3>
            <p className="mt-2 text-sm text-slate-600">Bạn có chắc muốn đăng xuất?</p>
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
