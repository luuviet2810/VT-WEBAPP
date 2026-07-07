// ====== VIEW MODE TOGGLE COMPONENT ======

import { Eye, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useViewModeStore } from '../store/viewModeStore'
import { UserRole } from '../rbac/roles'

interface ViewModeToggleProps {
  className?: string
}

export default function ViewModeToggle({ className = '' }: ViewModeToggleProps) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const actualRole = currentUser?.role as UserRole
  
  // Only show for admin
  if (actualRole !== 'admin') {
    return null
  }
  
  const viewMode = useViewModeStore((s) => s.viewMode)
  const setViewMode = useViewModeStore((s) => s.setViewMode)
  const resetToActualRole = useViewModeStore((s) => s.resetToActualRole)
  
  const options: { value: UserRole; label: string; icon: React.ReactNode }[] = [
    { value: 'admin', label: 'Admin', icon: <ShieldCheck size={14} /> },
    { value: 'staff', label: 'Staff', icon: <Eye size={14} /> },
  ]
  
  const handleChange = (role: UserRole) => {
    if (role === actualRole) {
      resetToActualRole(actualRole)
    } else {
      setViewMode(role)
    }
  }
  
  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-slate-400">
        View Mode
      </div>
      
      {/* Segmented Control */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        {options.map((option) => {
          const isSelected = viewMode === option.value
          const isCurrentActual = actualRole === option.value
          
          return (
            <button
              key={option.value}
              onClick={() => handleChange(option.value)}
              className={`
                flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-all
                ${isSelected 
                  ? 'bg-white text-brand-600 shadow-sm' 
                  : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                }
                ${isCurrentActual ? 'ring-1 ring-brand-300 ring-inset' : ''}
              `}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
