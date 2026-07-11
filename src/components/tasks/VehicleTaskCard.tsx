import { memo } from 'react'
import type { Task } from '../../types'

export type VehicleGroup = {
  vehicleId: string
  vehicle: { plate?: string; model?: string; positionId?: string | null } | null
  positionName?: string | null
  tasks: Task[]
  total: number
  done: number
  section: 'todo' | 'doing' | 'done'
}

const VehicleTaskCard = memo(function VehicleTaskCard({ group, onClick }: { group: VehicleGroup; onClick: () => void }) {
  const { vehicle, tasks, total } = group

  return (
    <button
      type="button"
      onClick={onClick}
      className="card w-full overflow-hidden text-left transition hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="p-4">
        <div className="text-base font-bold text-slate-900">Kiểm tra xe {vehicle?.plate || '—'}</div>
        <div className="mt-1 text-sm text-slate-500">{vehicle?.model || 'Chưa có xe liên quan'}</div>
        {group.positionName && (
          <div className="mt-0.5 text-xs font-medium text-brand-600">{group.positionName}</div>
        )}

        <div className="mt-3 space-y-1">
          {tasks.slice(0, 4).map((t) => (
            <div key={t.id} className="flex items-start gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={t.checklist?.every((i) => i.done) ?? false}
                readOnly
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-brand-600"
              />
              <span className="line-clamp-1">{t.title}</span>
            </div>
          ))}
          {tasks.length > 4 && (
            <div className="text-xs text-slate-400">+{tasks.length - 4} nhiệm vụ</div>
          )}
        </div>
      </div>
    </button>
  )
})

export default VehicleTaskCard
