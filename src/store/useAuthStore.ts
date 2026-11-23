import { create } from 'zustand'
import {
  signInWithEmail,
  signOut as authSignOut,
  getCurrentProfile,
  getAuthToken,
} from '../services/auth.service'
import type { AuthProfile } from '../services/auth.service'
import { useStore, initializeStore } from './useStore'
import { useViewModeStore } from './viewModeStore'

interface AuthState {
  currentUser: AuthProfile | null
  isAuthenticated: boolean
  authLoading: boolean

  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  initializeAuth: () => Promise<void>
}

let authInitialized = false

export const useAuthStore = create<AuthState>()((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  authLoading: true,

  initializeAuth: async () => {
    if (authInitialized) return
    authInitialized = true

    console.log('[AuthStore] initializeAuth — kiểm tra phiên làm việc từ Express Backend API...')

    const token = getAuthToken()
    if (!token) {
      console.log('[AuthStore] initializeAuth — Không tìm thấy token trong localStorage')
      set({ currentUser: null, isAuthenticated: false, authLoading: false })
      return
    }

    try {
      // Khôi phục session bằng cách kiểm tra token qua GET /api/auth/me
      const profile = await getCurrentProfile()

      if (profile) {
        console.log('[AuthStore] initializeAuth — Khôi phục phiên thành công:', profile.email, 'Role:', profile.role)
        set({ currentUser: profile, isAuthenticated: true, authLoading: false })

        // Đồng bộ employee ID vào store chính
        useStore.getState().setCurrentEmployee(profile.id)

        // Tải danh sách templates/cấu hình ban đầu
        try {
          useStore.getState().loadTemplates()
        } catch {}

        // Tải dữ liệu nghiệp vụ sau khi khôi phục phiên thành công
        try {
          await initializeStore()
        } catch (dataErr) {
          console.error('[AuthStore] Lỗi khi nạp dữ liệu phiên làm việc:', dataErr)
        }
      } else {
        console.log('[AuthStore] initializeAuth — Token không hợp lệ hoặc đã hết hạn, kết thúc session')
        set({ currentUser: null, isAuthenticated: false, authLoading: false })
      }
    } catch (err) {
      console.error('[AuthStore] initializeAuth — Lỗi khi kết nối xác thực:', err)
      set({ currentUser: null, isAuthenticated: false, authLoading: false })
    }
  },

  login: async (email, password) => {
    console.log('[AuthStore] Bắt đầu đăng nhập cho:', email)
    const result = await signInWithEmail(email, password)

    if (result.ok) {
      console.log('[AuthStore] Đăng nhập thành công:', result.user.email, 'Role:', result.user.role)
      set({ currentUser: result.user, isAuthenticated: true, authLoading: false })

      // Đồng bộ thông tin người dùng hiện tại vào useStore
      useStore.getState().setCurrentEmployee(result.user.id)
      try {
        useStore.getState().loadTemplates()
      } catch {}

      // Đồng bộ View Mode với vai trò thực tế
      try {
        useViewModeStore.getState().resetToActualRole(result.user.role)
      } catch {}

      // Tải dữ liệu nghiệp vụ ngay khi đăng nhập thành công
      try {
        await initializeStore()
      } catch (dataErr) {
        console.error('[AuthStore] Lỗi khi nạp dữ liệu sau đăng nhập:', dataErr)
      }

      return { success: true }
    }

    console.log('[AuthStore] Đăng nhập thất bại:', result.error)
    return { success: false, error: result.error }
  },

  logout: async () => {
    console.log('[AuthStore] Bắt đầu đăng xuất...')
    await authSignOut()

    // Xóa toàn bộ dữ liệu người dùng tạm thời trong store chính
    useStore.setState({
      vehicles: [],
      tasks: [],
      employees: [],
      moveLogs: [],
      checkSheets: [],
      attendance: [],
      notifications: [],
      taskActivityLogs: [],
      vehicleTimelines: {},
      currentEmployeeId: '',
      isInitialized: false,
      templates: [],
    })

    // Xóa persisted view mode trong localStorage
    try {
      localStorage.removeItem('gara-view-mode')
    } catch {}

    set({ currentUser: null, isAuthenticated: false, authLoading: false })
    console.log('[AuthStore] Đăng xuất hoàn tất — token và trạng thái đã được dọn sạch')
  },
}))
