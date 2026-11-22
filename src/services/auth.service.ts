import type { UserRole, UserStatus } from '../types'

export interface AuthProfile {
  id: string
  authId?: string
  name: string
  fullName: string
  email: string
  role: UserRole
  status: UserStatus
  disabled: boolean
  passkeyEnabled: boolean
  phone?: string | null
  avatar?: string | null
  createdAt: string
  updatedAt: string
}

export type AuthResult =
  | { ok: true; user: AuthProfile; token: string }
  | { ok: false; error: string; statusCode?: number }

export const TOKEN_STORAGE_KEY = 'vtauto_auth_token'

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch {}
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {}
}

function getBaseUrl(): string {
  const url =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
    'http://localhost:3001'
  return url.replace(/\/$/, '')
}

function mapApiUserToProfile(apiUser: any): AuthProfile {
  const name = apiUser.name || ''
  return {
    id: apiUser.id,
    name,
    fullName: name,
    email: apiUser.email || '',
    role: (apiUser.role as UserRole) || 'staff',
    status: (apiUser.status as UserStatus) || 'approved',
    disabled: Boolean(apiUser.disabled),
    passkeyEnabled: false,
    phone: apiUser.phone || null,
    avatar: apiUser.avatar || null,
    createdAt: apiUser.createdAt || new Date().toISOString(),
    updatedAt: apiUser.updatedAt || new Date().toISOString(),
  }
}

/**
 * Đăng nhập qua Express Backend API (Neon PostgreSQL)
 * Sử dụng POST /api/auth/login
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const normalizedEmail = (email || '').trim().toLowerCase()

  // Dọn dẹp token Supabase cũ nếu còn lưu trong localStorage để tránh xung đột
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key)
      }
    }
  } catch {}

  try {
    const response = await fetch(`${getBaseUrl()}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok || !data.ok) {
      const errorMessage = data.message || 'Đăng nhập không thành công.'
      return {
        ok: false,
        error: errorMessage,
        statusCode: response.status,
      }
    }

    const { token, user } = data.data
    if (!token || !user) {
      return {
        ok: false,
        error: 'Phản hồi từ máy chủ không hợp lệ.',
        statusCode: 500,
      }
    }

    // Lưu token duy nhất vào localStorage
    setAuthToken(token)

    const profile = mapApiUserToProfile(user)
    return {
      ok: true,
      user: profile,
      token,
    }
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return {
        ok: false,
        error: 'Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra kết nối mạng.',
        statusCode: 0,
      }
    }
    return {
      ok: false,
      error: 'Đã xảy ra lỗi trong quá trình đăng nhập. Vui lòng thử lại.',
      statusCode: 500,
    }
  }
}

/**
 * Lấy thông tin tài khoản hiện tại từ Express Backend API
 * Sử dụng GET /api/auth/me
 */
export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const token = getAuthToken()
  if (!token) {
    return null
  }

  try {
    const response = await fetch(`${getBaseUrl()}/api/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // Nếu token hết hạn (401) hoặc tài khoản bị khóa (403), xóa token
      if (response.status === 401 || response.status === 403) {
        clearAuthToken()
      }
      return null
    }

    const data = await response.json().catch(() => ({}))
    if (!data.ok || !data.data?.user) {
      clearAuthToken()
      return null
    }

    return mapApiUserToProfile(data.data.user)
  } catch (err) {
    console.warn('[AuthService] Lỗi khi lấy profile từ backend API:', err)
    return null
  }
}

/**
 * Đăng xuất tài khoản qua Express Backend API
 * Sử dụng POST /api/auth/logout
 */
export async function signOut(): Promise<void> {
  const token = getAuthToken()
  if (token) {
    try {
      await fetch(`${getBaseUrl()}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => {})
    } catch {}
  }

  // Xóa token ở client
  clearAuthToken()
}

/**
 * Khôi phục phiên làm việc (Backward compatibility)
 */
export async function getCurrentSession(): Promise<{ user: { id: string; email: string } } | null> {
  const profile = await getCurrentProfile()
  if (!profile) return null
  return {
    user: {
      id: profile.id,
      email: profile.email,
    },
  }
}

/**
 * Đăng ký tài khoản mới (Tạm giữ placeholder để không làm hỏng Register.tsx)
 */
export async function signUpWithEmail(
  fullName: string,
  email: string,
  password: string
): Promise<AuthResult> {
  return {
    ok: false,
    error: 'Tính năng tự đăng ký đang tạm khóa. Vui lòng liên hệ Quản trị viên để được cấp tài khoản.',
  }
}

/**
 * Lắng nghe thay đổi auth (In-memory observer để tương thích ngược)
 */
type AuthListener = (session: any) => void
const authListeners = new Set<AuthListener>()

export function onAuthStateChanged(callback: AuthListener): () => void {
  authListeners.add(callback)
  return () => {
    authListeners.delete(callback)
  }
}

export function notifyAuthListeners(session: any) {
  authListeners.forEach((fn) => {
    try {
      fn(session)
    } catch {}
  })
}
