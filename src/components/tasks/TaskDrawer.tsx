import { useEffect, useRef, useMemo, useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import type { Task, TaskChecklistItem, TaskPriority, TaskStatus } from '../../types'
import type { VehicleGroup } from './VehicleTaskCard'
import TaskRow from './TaskRow'
import { uid } from '../../utils/format'

type Props = {
  open: boolean
  onClose: () => void
  selectedVehicleId: string | null
  groups: VehicleGroup[]
  onToggleChecklist: (taskId: string, itemId: string) => void
  onUpdateTask: (id: string, patch: { title?: string; checklist?: Task['checklist']; priority?: TaskPriority; status?: TaskStatus; dueDate?: string | null; dueTime?: string | null }) => void
  onDeleteTask: (id: string) => void
  onAddTask: (task: { title: string; checklist: TaskChecklistItem[]; priority: TaskPriority; status: TaskStatus; vehicleId?: string | null; assigneeId?: string | null; dueDate?: string | null; dueTime?: string | null }) => void
  employees: { id: string; name: string }[]
  vehicles: { id: string; plate: string }[]
  positionName: string | null
}

export default function TaskDrawer({ open, onClose, selectedVehicleId, groups, onToggleChecklist, onUpdateTask, onDeleteTask, onAddTask, employees, vehicles, positionName }: Props) {
  const [title, setTitle] = useState('')
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([{ id: uid('chk'), text: '', done: false }])
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [saving, setSaving] = useState(false)
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

  useEffect(() => {
    if (open) {
      setTitle('')
      setChecklist([{ id: uid('chk'), text: '', done: false }])
      setPriority('medium')
      setStatus('todo')
      setSaving(false)
    }
  }, [open])

  if (!open || !currentGroup) return null

  const vehicle = currentGroup.vehicle
  const sorted = [...tasks].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))

  function handleAdd() {
    const nextTitle = title.trim()
    if (!nextTitle) return
    const nextChecklist = checklist
      .map((item) => ({ ...item, text: item.text.trim() }))
      .filter((item) => item.text)
    setSaving(true)
    onAddTask({
      title: nextTitle,
      checklist: nextChecklist,
      priority,
      status,
      vehicleId: currentGroup!.vehicleId,
      assigneeId: null,
      dueDate: null,
      dueTime: null,
    })
    setTitle('')
    setChecklist([{ id: uid('chk'), text: '', done: false }])
    setPriority('medium')
    setStatus('todo')
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div ref={panelRef} className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* Header */}
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

        {/* Task List */}
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

        {/* Add Task Form */}
        <div className="border-t border-slate-100 bg-white px-5 py-4">
          <div className="mb-3 text-sm font-semibold text-slate-700">Nhiệm vụ mới</div>
          <div className="space-y-3">
            <input
              className="input w-full"
              placeholder="Tên công việc"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="flex gap-2">
              <select className="input flex-1" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
                <option value="urgent">Khẩn cấp</option>
              </select>
              <select className="input flex-1" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                <option value="todo">Chưa làm</option>
                <option value="doing">Đang làm</option>
                <option value="done">Đã hoàn thành</option>
              </select>
            </div>
            <div className="space-y-1.5">
              {checklist.map((item, idx) => (
                <div key={item.id} className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Bước kiểm tra"
                    value={item.text}
                    onChange={(e) => setChecklist((rows) => rows.map((r, i) => (i === idx ? { ...r, text: e.target.value } : r)))}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setChecklist((rows) => (rows.length === 1 ? rows : rows.filter((_, i) => i !== idx)))}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setChecklist((rows) => [...rows, { id: uid('chk'), text: '', done: false }])}
              >
                <Plus size={14} /> Bước
              </button>
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary flex-1" onClick={onClose}>Đóng</button>
              <button type="button" className="btn-primary flex-1" onClick={handleAdd} disabled={saving || !title.trim()}>
                {saving ? 'Đang lưu...' : '+ Thêm nhiệm vụ'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
