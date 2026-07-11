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

const MAX_VISIBLE_TASKS = 5
const TASK_LABELS: Record<string, string> = {
  todo: 'Chưa làm', doing: 'Đang làm', done: 'Hoàn thành',
}

const VehicleTaskCard = memo(function VehicleTaskCard({ group, onClick }: { group: VehicleGroup; onClick: () => void }) {
  const { vehicle, tasks, total, done } = group
  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  const visible = tasks.slice(0, MAX_VISIBLE_TASKS)
  const remaining = total - MAX_VISIBLE_TASKS

  return (
    <button
      type="button"
      onClick={onClick}
      className="card w-full overflow-hidden text-left transition hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="p-4">
        {/* Header */}
        <div className="text-base font-bold text-slate-900">Kiểm tra xe {vehicle?.plate || '—'}</div>
        <div className="mt-0.5 text-sm text-slate-500">{vehicle?.model || 'Chưa có xe liên quan'}</div>
        {group.positionName && (
          <div className="mt-0.5 text-xs font-medium text-brand-600">{group.positionName}</div>
        )}

        {/* Divider */}
        <div className="my-2.5 h-px" style={{ background: 'rgba(0,0,0,0.04)' }} />

        {/* Task list */}
        <div className="space-y-1.5">
          {visible.map((t) => (
            <div key={t.id} className="flex items-start gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={t.status === 'done'}
                readOnly
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-brand-600"
              />
              <span className="line-clamp-1">{t.title}</span>
            </div>
          ))}
          {remaining > 0 && (
            <div className="text-xs font-medium text-slate-400">+ {remaining} nhiệm vụ khác...</div>
          )}
        </div>

        {/* Divider */}
        <div className="my-2.5 h-px" style={{ background: 'rgba(0,0,0,0.04)' }} />

        {/* Progress */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{done}/{total} hoàn thành</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(0,0,0,0.06)' }}>
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </button>
  )
})

export default VehicleTaskCard
