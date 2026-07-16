// ====== SIDEBAR CONFIGURATION BY ROLE ======

import { Home, Car, DollarSign, CheckSquare, MapPin, BarChart3, Clock, Users, Settings, User, ClipboardList, Archive } from 'lucide-react'
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

// Sidebar menu items by role - ordered by usage frequency
export const SIDEBAR_CONFIG: Record<UserRole, SidebarConfig> = {
  admin: {
    top: [
      { key: 'overview', label: 'Tổng quan', icon: <Home size={18} />, path: '/' },
      { key: 'vehicles', label: 'Danh sách xe', icon: <Car size={18} />, path: '/xe' },
      { key: 'pricelist', label: 'Bảng giá', icon: <DollarSign size={18} />, path: '/bang-gia' },
      { key: 'tasks', label: 'Nhiệm vụ', icon: <CheckSquare size={18} />, path: '/nhiem-vu' },
      { key: 'positions', label: 'Vị trí xe', icon: <MapPin size={18} />, path: '/vi-tri' },
      { key: 'statistics', label: 'Thống kê', icon: <BarChart3 size={18} />, path: '/thong-ke' },
      { key: 'sold', label: 'Xe đã bán', icon: <Archive size={18} />, path: '/xe-da-ban' },
      { key: 'attendance', label: 'Chấm công', icon: <Clock size={18} />, path: '/cham-cong' },
      { key: 'employees', label: 'Nhân viên', icon: <Users size={18} />, path: '/nhan-vien' },
    ],
    bottom: [
      { key: 'settings', label: 'Cài đặt', icon: <Settings size={18} />, path: '/cai-dat' },
    ],
  },

  staff: {
    top: [
      { key: 'overview', label: 'Tổng quan', icon: <Home size={18} />, path: '/' },
      { key: 'vehicles', label: 'Danh sách xe', icon: <Car size={18} />, path: '/xe' },
      { key: 'pricelist', label: 'Bảng giá', icon: <DollarSign size={18} />, path: '/bang-gia' },
      { key: 'positions', label: 'Vị trí xe', icon: <MapPin size={18} />, path: '/vi-tri' },
      { key: 'mytasks', label: 'Việc của tôi', icon: <ClipboardList size={18} />, path: '/viec-cua-toi' },
      { key: 'attendance', label: 'Chấm công', icon: <Clock size={18} />, path: '/cham-cong' },
    ],
    bottom: [
      { key: 'profile', label: 'Hồ sơ', icon: <User size={18} />, path: '/ho-so' },
    ],
  },
}

// Get sidebar config for a role
export function getSidebarConfig(role: UserRole): SidebarConfig {
  return SIDEBAR_CONFIG[role] || SIDEBAR_CONFIG.staff
}
