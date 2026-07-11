import { useEffect, useRef, useMemo } from 'react'
import { X } from 'lucide-react'
import type { Task, TaskChecklistItem, TaskPriority, TaskStatus } from '../../types'
import type { VehicleGroup } from './VehicleTaskCard'
import TaskRow from './TaskRow'

type Props = {
  open: boolean
  onClose: () => void
  selectedVehicleId: string | null
  groups: VehicleGroup[]
  onToggleChecklist: (taskId: string, itemId: string) => void
  onUpdateTask: (id: string, patch: { title?: string; checklist?: Task['checklist']; priority?: TaskPriority; status?: TaskStatus; dueDate?: string | null; dueTime?: string | null }) => void
  onDeleteTask: (id: string) => void
  employees: { id: string; name: string }[]
  vehicles: { id: string; plate: string }[]
  positionName: string | null
}

export default function TaskDrawer({ open, onClose, selectedVehicleId, groups, onToggleChecklist, onUpdateTask, onDeleteTask, employees, vehicles, positionName }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  const currentGroup = useMemo(
    () => groups.find((g) => g.vehicleId === selectedVehicleId) ?? null,
    [groups, selectedVehicleId]
  )

  const tasks = currentGroup?.tasks ?? []

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !currentGroup) return null

  const vehicle = currentGroup.vehicle
  const sorted = [...tasks].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div ref={panelRef} className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Kiểm tra xe {vehicle?.plate || '—'}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {vehicle?.model || 'Chưa có xe liên quan'} • {positionName ? '📍 ' + positionName : ''}
            </p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            {sorted.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                Chưa có nhiệm vụ
              </div>
            )}
            {sorted.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggleChecklist={onToggleChecklist}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
