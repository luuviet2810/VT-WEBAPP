import { supabase } from '../lib/supabase'
import type { Session, AuthUser, AuthError } from '@supabase/supabase-js'
import type { UserRole, UserStatus } from '../types'

export interface AuthProfile {
  id: string
  authId: string
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
  | { ok: true; user: AuthProfile }
  | { ok: false; error: string }

const AUTH_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Email hoặc mật khẩu không đúng',
  'User already registered': 'Email đã được sử dụng',
  'Email not confirmed': 'Email chưa được xác nhận',
  'Invalid email': 'Email không hợp lệ',
  'Password should be at least 6 characters': 'Mật khẩu phải có ít nhất 6 ký tự',
}

function normalizeAuthError(err: unknown): string {
  if (!err || typeof err !== 'object' || !('message' in err)) {
    return 'Đã xảy ra lỗi. Vui lòng thử lại.'
  }
  const message = (err as { message?: string }).message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.'
  return AUTH_ERROR_MAP[message] ?? message
}

export async function signUpWithEmail(
  fullName: string,
  email: string,
  password: string
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase()
  const trimmedName = fullName.trim()

  if (!trimmedName) {
    return { ok: false, error: 'Vui lòng nhập họ tên' }
  }
  if (!normalizedEmail.includes('@')) {
    return { ok: false, error: 'Email không hợp lệ' }
  }
  if (password.length < 6) {
    return { ok: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' }
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: trimmedName,
      },
    },
  })

  if (error || !data.user) {
    return { ok: false, error: normalizeAuthError(error) }
  }

  const profile = await loadOrCreateProfile(data.user.id, normalizedEmail, trimmedName)
  if (!profile) {
    return { ok: false, error: 'Không thể tạo hồ sơ người dùng' }
  }

  return { ok: true, user: profile }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase()

  // Clear any stale Supabase session storage before login.
  // When switching users (Staff → Admin), the old session's refresh token
  // can still be present in localStorage and cause "Invalid login credentials"
  // even if the new credentials are correct.
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key)
      }
    }
  } catch {}

  console.log('[AUDIT] signInWithEmail — calling supabase.auth.signInWithPassword for', normalizedEmail)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (error || !data.user) {
    console.log('[AUDIT] signInWithEmail FAILED — code:', (error as any)?.code, 'message:', (error as any)?.message)
    return { ok: false, error: normalizeAuthError(error) }
  }

  console.log('[AUDIT] signInWithEmail SUCCESS — user:', data.user.id, 'email:', data.user.email)

  const profile = await loadOrCreateProfile(data.user.id, normalizedEmail, data.user.user_metadata?.full_name ?? normalizedEmail.split('@')[0])
  if (!profile) {
    return { ok: false, error: 'Không tìm thấy hồ sơ người dùng' }
  }

  if (profile.status === 'pending') {
    await supabase.auth.signOut()
    return { ok: false, error: 'Tài khoản đang chờ Admin phê duyệt' }
  }

  if (profile.status === 'rejected') {
    await supabase.auth.signOut()
    return { ok: false, error: 'Tài khoản chưa được phê duyệt' }
  }

  if (profile.disabled) {
    await supabase.auth.signOut()
    return { ok: false, error: 'Tài khoản đã bị vô hiệu hóa' }
  }

  return { ok: true, user: profile }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const { data } = await supabase.auth.getUser()
  const authUser = data.user
  if (!authUser) {
    return null
  }
  return loadProfile(authUser.id)
}

export function onAuthStateChanged(
  callback: (session: Session | null) => void
): () => void {
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return () => listener.subscription.unsubscribe()
}

async function loadOrCreateProfile(
  authId: string,
  email: string,
  fullName: string
): Promise<AuthProfile | null> {
  const existing = await loadProfile(authId)
  if (existing) {
    return existing
  }

  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .limit(1)

  const isFirstAdmin = !admins || admins.length === 0

  const { data, error } = await supabase
    .from('users')
    .insert({
      auth_id: authId,
      name: fullName,
      email,
      role: isFirstAdmin ? 'admin' : 'staff',
      status: isFirstAdmin ? 'approved' : 'pending',
      is_admin: isFirstAdmin,
      disabled: false,
      passkey_enabled: false,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[auth] failed to create profile', error)
    return null
  }

  return mapProfileRow(data as Record<string, unknown>)
}

async function loadProfile(authId: string): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return mapProfileRow(data as Record<string, unknown>)
}

function mapProfileRow(row: Record<string, unknown>): AuthProfile {
  const name = row.name as string
  return {
    id: row.id as string,
    authId: row.auth_id as string,
    name,
    fullName: name,
    email: row.email as string,
    role: (row.role as UserRole) ?? 'staff',
    status: (row.status as UserStatus) ?? 'pending',
    disabled: Boolean(row.disabled),
    passkeyEnabled: Boolean(row.passkey_enabled),
    phone: (row.phone as string | null) ?? null,
    avatar: (row.avatar as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}
