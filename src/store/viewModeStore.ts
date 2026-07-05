// ====== VIEW MODE STORE - Preview UI for developers ======

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserRole } from '../rbac/roles'

interface ViewModeState {
  // Current view mode - what UI to display (only admin or staff)
  viewMode: 'admin' | 'staff'
  
  // Set view mode
  setViewMode: (mode: 'admin' | 'staff') => void
  
  // Reset to actual role (from auth)
  resetToActualRole: (actualRole: 'admin' | 'staff') => void
  
  // Check if currently in preview mode
  isPreviewMode: (actualRole: 'admin' | 'staff') => boolean
  
  // Get the role to use for UI rendering
  getEffectiveRole: (actualRole: 'admin' | 'staff') => 'admin' | 'staff'
}

export const useViewModeStore = create<ViewModeState>()(
  persist(
    (set, get) => ({
      // Default to staff for preview
      viewMode: 'staff' as const,
      
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
export function useEffectiveRole(actualRole: 'admin' | 'staff'): 'admin' | 'staff' {
  return useViewModeStore((s) => s.getEffectiveRole(actualRole))
}

// Hook to check if in preview mode
export function useIsPreviewMode(actualRole: 'admin' | 'staff'): boolean {
  return useViewModeStore((s) => s.isPreviewMode(actualRole))
}
