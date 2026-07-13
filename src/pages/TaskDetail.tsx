import { useState } from 'react'
import { ArrowLeft, Clock, Trash2, Loader2, Save } from 'lucide-react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, ConfirmDialog } from '../components/ui'
import { TaskPriority, TaskStatus } from '../types'
import { formatDateTime } from '../utils/format'

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: 'Làm gấp',
  priority: 'Ưu tiên hơn',
  normal: 'Cứ từ từ',
}
const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: '⭐⭐⭐⭐⭐ Làm gấp' },
  { value: 'priority', label: '⭐⭐⭐⭐ Ưu tiên hơn' },
  { value: 'normal', label: '⭐⭐⭐ Cứ từ từ' },
]

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const tasks = useStore((s) => s.tasks)
  const updateTask = useStore((s) => s.updateTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const taskActivityLogs = useStore((s) => s.taskActivityLogs).filter((l) => l.taskId === id)
  const employees = useStore((s) => s.employees)
  const vehicles = useStore((s) => s.vehicles)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  const task = tasks.find((t) => t.id === id)
  if (!task) {
    return (
      <div className="card">
        <EmptyState title="Không tìm thấy nhiệm vụ" />
      </div>
    )
  }
  const currentTask = task
  if (!titleDraft && currentTask.title) setTitleDraft(currentTask.title)

  const vehicle = vehicles.find((v) => v.id === currentTask.vehicleId)
  const assignee = employees.find((e) => e.id === currentTask.assigneeId)

  async function handleQuickStatus(status: TaskStatus) {
    if (statusLoading) return
    setStatusLoading(true)
    try {
      await updateTask(currentTask.id, { status })
      navigate('/nhiem-vu')
    } catch {
      setStatusLoading(false)
    }
  }

  function handleSave() {
    if (titleDraft.trim() && titleDraft !== currentTask.title) {
      updateTask(currentTask.id, { title: titleDraft.trim() })
    }
    navigate('/nhiem-vu')
  }

  function handleDelete() {
    setShowDeleteConfirm(true)
  }

  function confirmDelete() {
    deleteTask(currentTask.id)
    navigate('/nhiem-vu')
  }

  function statusActions() {
    const all = [
      { key: 'todo' as TaskStatus, label: 'Chưa làm', style: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
      { key: 'doing' as TaskStatus, label: 'Đang làm', style: 'bg-blue-500 text-white hover:bg-blue-600' },
      { key: 'done' as TaskStatus, label: 'Hoàn thành', style: 'bg-green-500 text-white hover:bg-green-600' },
    ]
    return all.filter((a) => a.key !== currentTask.status)
  }

  return (
    <div>
      {/* Back button */}
      <button onClick={() => navigate('/nhiem-vu')} className="mb-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
        <ArrowLeft size={18} />
      </button>

      {/* Vehicle plate - model */}
      {vehicle && (
        <Link to={`/xe/${vehicle.id}`} className="mb-1 block text-sm font-semibold text-brand-600">
          {vehicle.plate} - {vehicle.model}
        </Link>
      )}

      {/* Quick status actions */}
      <div className="mb-4 flex items-center gap-2">
        {statusActions().map((action) => (
          <button
            key={action.key}
            onClick={() => handleQuickStatus(action.key)}
            disabled={statusLoading}
            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 ${statusLoading ? 'bg-slate-100 text-slate-400' : action.style}`}
          >
            {statusLoading ? <Loader2 size={15} className="animate-spin" /> : null}
            {action.label}
          </button>
        ))}
      </div>

      {/* Title */}
      <div className="mb-4">
        <label className="label">Tên công việc</label>
        <input className="input" value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} />
      </div>

      {/* Two-column: Priority + Assignee */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Ưu tiên</label>
          <select
            className="input"
            value={currentTask.priority}
            onChange={(e) => updateTask(currentTask.id, { priority: e.target.value as TaskPriority })}
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Ai đang làm</label>
          <select
            className="input"
            value={currentTask.assigneeId || ''}
            onChange={(e) => updateTask(currentTask.id, { assigneeId: e.target.value || null })}
          >
            <option value="">Chọn người phụ trách</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Due date / time — unchanged */}
      {currentTask.dueDate && (
        <div className="mb-4 flex items-center gap-3 text-sm text-slate-500">
          <Clock size={14} />
          <span>{currentTask.dueDate}{currentTask.dueTime ? ` ${currentTask.dueTime}` : ''}</span>
        </div>
      )}

      {/* Activity log */}
      <div className="mb-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Lịch sử hoạt động</h3>
        {taskActivityLogs.length === 0 ? (
          <p className="text-xs text-slate-400">Chưa có hoạt động nào</p>
        ) : (
          <ul className="space-y-2">
            {taskActivityLogs.map((log) => {
              const emp = employees.find((e) => e.id === log.employeeId)
              return (
                <li key={log.id} className="flex gap-2">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-slate-200" />
                  <div>
                    <p className="text-xs text-slate-700">{log.action}</p>
                    <p className="text-[10px] text-slate-400">{emp?.name} • {formatDateTime(log.createdAt)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <button onClick={handleDelete} className="btn-secondary flex items-center gap-1.5 text-sm">
          <Trash2 size={15} /> Xoá
        </button>
        <button onClick={handleSave} className="btn-primary flex items-center gap-1.5 text-sm">
          <Save size={15} /> Lưu
        </button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Xóa nhiệm vụ?"
        message={`Bạn có chắc muốn xóa nhiệm vụ "${currentTask.title}"?`}
        confirmLabel="Xóa"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
