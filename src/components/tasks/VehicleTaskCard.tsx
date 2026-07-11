import type { Task } from '../../types'

export type VehicleGroup = {
  vehicleId: string
  vehicle: { plate?: string; model?: string; positionId?: string | null; images?: string[] } | null
  positionName?: string | null
  tasks: Task[]
  total: number
  done: number
  section: 'todo' | 'doing' | 'done'
}

export default function VehicleTaskCard({ group, onClick }: { group: VehicleGroup; onClick: () => void }) {
  const { vehicle, tasks, total, done } = group
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className="card w-full overflow-hidden text-left transition hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="p-4">
        <div className="text-base font-bold text-slate-900">{vehicle?.plate || '—'}</div>
        <div className="mt-1 text-xs text-slate-500">{vehicle?.model || 'Chưa có xe liên quan'}</div>
        <div className="mt-3 text-sm font-semibold text-slate-700">
          {done}/{total} hoàn thành
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 space-y-0.5">
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
}
