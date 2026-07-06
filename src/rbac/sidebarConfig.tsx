// ====== SIDEBAR CONFIGURATION BY ROLE ======

import {
  BarChart3,
  Car,
  ChevronRight,
  ClipboardList,
  Clock,
  DollarSign,
  FileText,
  Home,
  MapPin,
  Settings,
  Truck,
  Users,
  User,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { UserRole } from './roles'

export interface MenuItem {
  key: string
  label: string
  icon: React.ReactNode
  path: string
  badge?: number
}

export interface SidebarConfig {
  top: MenuItem[]
  bottom: MenuItem[]
}

// Sidebar menu items by role — ordered by usage frequency
export const SIDEBAR_CONFIG: Record<UserRole, SidebarConfig> = {
  admin: {
    top: [
      { key: 'overview',   label: 'Tổng quan',     icon: <Home size={18} />,        path: '/' },
      { key: 'vehicles',   label: 'Danh sách xe',  icon: <Car size={18} />,       path: '/xe' },
      { key: 'pricelist',  label: 'Bảng giá',      icon: <DollarSign size={18} />, path: '/bang-gia' },
      { key: 'tasks',      label: 'Nhiệm vụ',      icon: <ClipboardList size={18} />, path: '/nhiem-vu' },
      { key: 'positions',  label: 'Vị trí xe',     icon: <MapPin size={18} />,     path: '/vi-tri' },
      { key: 'statistics', label: 'Thống kê',       icon: <BarChart3 size={18} />,  path: '/thong-ke' },
      { key: 'attendance', label: 'Chấm công',      icon: <Clock size={18} />,      path: '/cham-cong' },
      { key: 'employees',  label: 'Nhân viên',      icon: <Users size={18} />,      path: '/nhan-vien' },
    ],
    bottom: [
      { key: 'templates', label: 'Mẫu công việc', icon: <FileText size={18} />, path: '/mau-cong-viec' },
      { key: 'settings', label: 'Cài đặt', icon: <Settings size={18} />, path: '/cai-dat' },
    ],
  },

  manager: {
    top: [
      { key: 'overview',   label: 'Tổng quan',     icon: <Home size={18} />,        path: '/' },
      { key: 'vehicles',  label: 'Danh sách xe',  icon: <Car size={18} />,        path: '/xe' },
      { key: 'pricelist', label: 'Bảng giá',      icon: <DollarSign size={18} />, path: '/bang-gia' },
      { key: 'tasks',     label: 'Nhiệm vụ',      icon: <ClipboardList size={18} />, path: '/nhiem-vu' },
      { key: 'positions', label: 'Vị trí xe',     icon: <MapPin size={18} />,     path: '/vi-tri' },
      { key: 'statistics', label: 'Thống kê',      icon: <BarChart3 size={18} />,  path: '/thong-ke' },
      { key: 'attendance', label: 'Chấm công',    icon: <Clock size={18} />,       path: '/cham-cong' },
      { key: 'employees', label: 'Nhân viên',      icon: <Users size={18} />,       path: '/nhan-vien' },
    ],
    bottom: [
      { key: 'templates', label: 'Mẫu công việc', icon: <FileText size={18} />, path: '/mau-cong-viec' },
      { key: 'profile', label: 'Hồ sơ', icon: <User size={18} />, path: '/ho-so' },
    ],
  },

  staff: {
    top: [
      { key: 'overview', label: 'Tổng quan',     icon: <Home size={18} />,         path: '/' },
      { key: 'vehicles', label: 'Danh sách xe', icon: <Car size={18} />,          path: '/xe' },
      { key: 'pricelist', label: 'Bảng giá',   icon: <DollarSign size={18} />,  path: '/bang-gia' },
      { key: 'mytasks', label: 'Việc của tôi',  icon: <ClipboardList size={18} />, path: '/viec-cua-toi' },
      { key: 'attendance', label: 'Chấm công',  icon: <Clock size={18} />,        path: '/cham-cong' },
    ],
    bottom: [
      { key: 'profile', label: 'Hồ sơ', icon: <User size={18} />, path: '/ho-so' },
    ],
  },

  driver: {
    top: [
      { key: 'overview', label: 'Tổng quan',   icon: <Home size={18} />,   path: '/' },
      { key: 'vehicles', label: 'Danh sách xe', icon: <Car size={18} />,   path: '/xe' },
      { key: 'attendance', label: 'Chấm công', icon: <Clock size={18} />,  path: '/cham-cong' },
    ],
    bottom: [
      { key: 'profile', label: 'Hồ sơ', icon: <User size={18} />, path: '/ho-so' },
    ],
  },
}

// Get sidebar config for a role
export function getSidebarConfig(role: UserRole): SidebarConfig {
  return SIDEBAR_CONFIG[role] ?? SIDEBAR_CONFIG.driver
}
