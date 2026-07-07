import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { signInWithEmail, signUpWithEmail, signOut as authSignOut, onAuthStateChanged } from '../services/auth.service'
import type { AuthProfile } from '../services/auth.service'
import type { UserRole, UserStatus } from '../types'

interface AuthState {
  currentUser: AuthProfile | null
  isAuthenticated: boolean
  authLoading: boolean

  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  initializeAuth: () => void
}

let authInitialized = false
let unsubscribe: (() => void) | null = null

export const useAuthStore = create<AuthState>()((set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  authLoading: true,

  initializeAuth: () => {
    if (authInitialized) return
    authInitialized = true

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        loadProfileIntoStore(data.session.user.id)
      } else {
        set({ authLoading: false })
      }
    })

    unsubscribe = onAuthStateChanged((session) => {
      if (session) {
        loadProfileIntoStore(session.user.id)
      } else {
        set({ currentUser: null, isAuthenticated: false, authLoading: false })
      }
    })
  },

  login: async (email, password) => {
    const result = await signInWithEmail(email, password)
    if (result.ok) {
      set({ currentUser: result.user, isAuthenticated: true, authLoading: false })
      return { success: true }
    }
    return { success: false, error: result.error }
  },

  logout: async () => {
    await authSignOut()
    set({ currentUser: null, isAuthenticated: false })
  },
}))

async function loadProfileIntoStore(authId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authId)
    .maybeSingle()

  if (error || !data) {
    useAuthStore.setState({ authLoading: false })
    return
  }

  const row = data as Record<string, unknown>
  const name = row.name as string
  const profile: AuthProfile = {
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

  useAuthStore.setState({ currentUser: profile, isAuthenticated: true, authLoading: false })
}
