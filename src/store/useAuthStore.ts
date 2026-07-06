import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, Passkey, UserStatus, UserRole } from '../types'
import { uid } from '../utils/format'

// Simple hash function for demo (in production, use bcrypt or similar on backend)
function hashPassword(password: string): string {
  // Simple hash for demo - DO NOT use in production
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return 'hash_' + Math.abs(hash).toString(36)
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

interface AuthState {
  users: User[]
  passkeys: Passkey[]
  currentUser: User | null
  isAuthenticated: boolean

  // Auth actions
  register: (data: { fullName: string; email: string; password: string }) => { success: boolean; error?: string; isFirstAdmin?: boolean }
  login: (email: string, password: string) => { success: boolean; error?: string }
  loginWithPasskey: (credentialId: string) => { success: boolean; error?: string }
  logout: () => void

  // User management (admin only)
  approveUser: (userId: string) => void
  rejectUser: (userId: string) => void
  enableUser: (userId: string) => void
  disableUser: (userId: string) => void
  updateUser: (userId: string, data: Partial<User>) => void
  deleteUser: (userId: string) => void
  setUserRole: (userId: string, role: UserRole) => void

  // Passkey management
  registerPasskey: (userId: string, credentialId: string, publicKey: string, deviceName: string) => void
  removePasskey: (passkeyId: string) => void
  getUserPasskeys: (userId: string) => Passkey[]
  hasPasskey: (userId: string) => boolean

  // Helpers
  getUserById: (userId: string) => User | undefined
  getUserByEmail: (email: string) => User | undefined
  getPendingUsers: () => User[]
  isAdmin: () => boolean
}

// No seed users - first registered user becomes admin automatically

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [],
      passkeys: [],
      currentUser: null,
      isAuthenticated: false,

      // Register new user
      register: (data) => {
        const { fullName, email, password } = data

        // Validate
        if (!fullName.trim()) {
          return { success: false, error: 'Vui lòng nhập họ tên' }
        }
        if (!email.trim() || !email.includes('@')) {
          return { success: false, error: 'Email không hợp lệ' }
        }
        if (password.length < 6) {
          return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' }
        }

        // Check if email exists
        const existing = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase())
        if (existing) {
          return { success: false, error: 'Email đã được sử dụng' }
        }

        // Check if there's any admin in the system
        const hasAdmin = get().users.some((u) => u.role === 'admin')

        // If no admin exists, first registered user becomes admin and is auto-approved
        const isFirstAdmin = !hasAdmin

        // Create user
        const newUser: User = {
          id: uid('user'),
          fullName: fullName.trim(),
          email: email.toLowerCase().trim(),
          passwordHash: hashPassword(password),
          role: isFirstAdmin ? 'admin' : 'staff',
          status: isFirstAdmin ? 'approved' : 'pending',
          passkeyEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        set((state) => ({
          users: [newUser, ...state.users],
        }))
        
        // Auto-login if first admin
        if (isFirstAdmin) {
          set({ currentUser: newUser, isAuthenticated: true })
        }

        return {
          success: true,
          isFirstAdmin,
        }
      },

      // Login with email + password
      login: (email, password) => {
        const user = get().getUserByEmail(email)
        
        if (!user) {
          return { success: false, error: 'Email hoặc mật khẩu không đúng' }
        }

        if (user.status === 'pending') {
          return { success: false, error: 'Tài khoản đang chờ Admin phê duyệt' }
        }

        if (user.status === 'rejected') {
          return { success: false, error: 'Tài khoản chưa được phê duyệt' }
        }

        if (user.status === 'disabled') {
          return { success: false, error: 'Tài khoản đã bị vô hiệu hóa' }
        }

        const passwordValid = verifyPassword(password, user.passwordHash)
        
        if (!passwordValid) {
          return { success: false, error: 'Email hoặc mật khẩu không đúng' }
        }

        set({ currentUser: user, isAuthenticated: true })
        return { success: true }
      },

      // Login with passkey
      loginWithPasskey: (credentialId) => {
        const passkey = get().passkeys.find((p) => p.credentialId === credentialId)
        if (!passkey) {
          return { success: false, error: 'Passkey không hợp lệ' }
        }

        const user = get().getUserById(passkey.userId)
        if (!user || user.status !== 'approved') {
          return { success: false, error: 'Tài khoản không hợp lệ' }
        }

        set({ currentUser: user, isAuthenticated: true })
        return { success: true }
      },

      // Logout
      logout: () => {
        set({ currentUser: null, isAuthenticated: false })
      },

      // Approve user
      approveUser: (userId) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, status: 'approved' as UserStatus, updatedAt: new Date().toISOString() } : u
          ),
        }))
      },

      // Reject user
      rejectUser: (userId) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, status: 'rejected' as UserStatus, updatedAt: new Date().toISOString() } : u
          ),
        }))
      },

      // Enable user
      enableUser: (userId) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, status: 'approved' as UserStatus, updatedAt: new Date().toISOString() } : u
          ),
        }))
      },

      // Disable user
      disableUser: (userId) => {
        // Prevent disabling yourself
        const currentUser = get().currentUser
        if (currentUser?.id === userId) {
          return
        }
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, status: 'disabled' as UserStatus, updatedAt: new Date().toISOString() } : u
          ),
        }))
      },

      // Update user
      updateUser: (userId, data) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, ...data, updatedAt: new Date().toISOString() } : u
          ),
          currentUser: state.currentUser?.id === userId
            ? { ...state.currentUser, ...data, updatedAt: new Date().toISOString() }
            : state.currentUser,
        }))
      },

      // Delete user
      deleteUser: (userId) => {
        // Prevent deleting yourself
        const currentUser = get().currentUser
        if (currentUser?.id === userId) {
          return
        }
        set((state) => ({
          users: state.users.filter((u) => u.id !== userId),
          passkeys: state.passkeys.filter((p) => p.userId !== userId),
        }))
      },

      // Set user role
      setUserRole: (userId, role) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, role, updatedAt: new Date().toISOString() } : u
          ),
        }))
      },

      // Register passkey
      registerPasskey: (userId, credentialId, publicKey, deviceName) => {
        const newPasskey: Passkey = {
          id: uid('pk'),
          userId,
          credentialId,
          publicKey,
          counter: 0,
          deviceName,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          passkeys: [...state.passkeys, newPasskey],
          users: state.users.map((u) =>
            u.id === userId ? { ...u, passkeyEnabled: true, updatedAt: new Date().toISOString() } : u
          ),
        }))
      },

      // Remove passkey
      removePasskey: (passkeyId) => {
        const passkey = get().passkeys.find((p) => p.id === passkeyId)
        if (!passkey) return

        set((state) => {
          const userPasskeys = state.passkeys.filter((p) => p.userId === passkey.userId && p.id !== passkeyId)
          const passkeyEnabled = userPasskeys.length > 0
          return {
            passkeys: state.passkeys.filter((p) => p.id !== passkeyId),
            users: state.users.map((u) =>
              u.id === passkey.userId ? { ...u, passkeyEnabled, updatedAt: new Date().toISOString() } : u
            ),
          }
        })
      },

      // Get user passkeys
      getUserPasskeys: (userId) => {
        return get().passkeys.filter((p) => p.userId === userId)
      },

      // Check if user has passkey
      hasPasskey: (userId) => {
        return get().passkeys.some((p) => p.userId === userId)
      },

      // Get user by ID
      getUserById: (userId) => {
        return get().users.find((u) => u.id === userId)
      },

      // Get user by email
      getUserByEmail: (email) => {
        return get().users.find((u) => u.email.toLowerCase() === email.toLowerCase())
      },

      // Get pending users
      getPendingUsers: () => {
        return get().users.filter((u) => u.status === 'pending')
      },

      // Check if current user is admin
      isAdmin: () => {
        return get().currentUser?.role === 'admin'
      },
    }),
    {
      name: 'gara-auth-storage',
    }
  )
)

// Export password utilities for use in components
export { hashPassword, verifyPassword }
