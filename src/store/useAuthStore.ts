import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { signInWithEmail, signUpWithEmail, signOut as authSignOut, onAuthStateChanged } from '../services/auth.service'
import type { AuthProfile } from '../services/auth.service'
import type { UserRole, UserStatus } from '../types'
import { useStore } from './useStore'

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

    console.log('[AUDIT] initializeAuth — checking existing session')
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        console.log('[AUDIT] getSession found session for user', data.session.user.id)
        loadProfileIntoStore(data.session.user.id)
      } else {
        console.log('[AUDIT] getSession — no session')
        set({ authLoading: false })
      }
    })

    unsubscribe = onAuthStateChanged((session) => {
      if (session) {
        console.log('[AUDIT] onAuthStateChanged SIGNED_IN / TOKEN_REFRESHED — user', session.user.id)
        loadProfileIntoStore(session.user.id)
      } else {
        console.log('[AUDIT] onAuthStateChanged SIGNED_OUT — clearing auth')
        set({ currentUser: null, isAuthenticated: false, authLoading: false })
      }
    })
  },

  login: async (email, password) => {
    console.log('[AUDIT] login starting for', email)
    const result = await signInWithEmail(email, password)
    if (result.ok) {
      console.log('[AUDIT] login success for user', result.user.id, 'role', result.user.role)
      set({ currentUser: result.user, isAuthenticated: true, authLoading: false })
      // Re-initialize app data for the new user session
      useStore.getState().loadTemplates()
      return { success: true }
    }
    console.log('[AUDIT] login failed:', result.error)
    return { success: false, error: result.error }
  },

  logout: async () => {
    console.log('[AUDIT] logout starting')
    await authSignOut()
    // Reset ALL user-related data in the main store
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
      // settings: preserved — these are app-wide preferences
    })
    // Reset persisted view mode store to default
    try {
      localStorage.removeItem('gara-view-mode')
    } catch {}
    set({ currentUser: null, isAuthenticated: false })
    console.log('[AUDIT] logout complete — auth + app state cleared')
  },
}))

async function loadProfileIntoStore(authId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authId)
    .maybeSingle()

  if (error || !data) {
    // Profile not found yet — don't set authLoading:false here.
    // The login() function will handle this after creating the profile.
    // Otherwise the UI would see "no user" and redirect to /login prematurely.
    console.log('[AUDIT] loadProfileIntoStore — profile not found yet for authId', authId)
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

  console.log('[AUDIT] loadProfileIntoStore — profile loaded for', profile.name, 'role', profile.role)
  useAuthStore.setState({ currentUser: profile, isAuthenticated: true, authLoading: false })

  // Sync the current employee ID to the main store so attendance and other
  // features that depend on currentEmployeeId work correctly.
  useStore.getState().setCurrentEmployee(profile.id)
}
