// ====== VIEW MODE STORE - Preview UI for developers ======

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserRole } from '../rbac/roles'

interface ViewModeState {
  // Current view mode — what UI to display (admin can preview any role)
  viewMode: UserRole

  // Set view mode
  setViewMode: (mode: UserRole) => void

  // Reset to actual role
  resetToActualRole: (actualRole: UserRole) => void

  // Check if currently in preview mode
  isPreviewMode: (actualRole: UserRole) => boolean

  // Get the role to use for UI rendering
  getEffectiveRole: (actualRole: UserRole) => UserRole
}

export const useViewModeStore = create<ViewModeState>()(
  persist(
    (set, get) => ({
      viewMode: 'staff' as UserRole,

      setViewMode: (mode) => {
        set({ viewMode: mode })
      },

      resetToActualRole: (actualRole) => {
        set({ viewMode: actualRole })
      },

      isPreviewMode: (actualRole) => {
        return get().viewMode !== actualRole
      },

      getEffectiveRole: (actualRole) => {
        return get().viewMode
      },
    }),
    {
      name: 'gara-view-mode',
    }
  )
)

// Hook to get view mode state
export function useViewMode() {
  return useViewModeStore()
}

// Hook to get effective role considering view mode
export function useEffectiveRole(actualRole: UserRole): UserRole {
  return useViewModeStore((s) => s.getEffectiveRole(actualRole))
}

// Hook to check if in preview mode
export function useIsPreviewMode(actualRole: UserRole): boolean {
  return useViewModeStore((s) => s.isPreviewMode(actualRole))
}
