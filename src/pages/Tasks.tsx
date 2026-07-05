// ====== TASKS PAGE - Kanban Board ======

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Calendar, Check, Plus, User, GripVertical } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, Modal } from '../components/ui'
import { Task, TaskChecklistItem, TaskPriority, TaskStatus } from '../types'
import { formatDate, uid } from '../utils/format'
import clsx from 'clsx'

// 4 columns for Kanban
const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'todo', label: 'Chưa làm', color: 'border-slate-300' },
  { key: 'doing', label: 'Đang làm', color: 'border-blue-300' },
  { key: 'done', label: 'Hoàn thành', color: 'border-green-300' },
]

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
}
const PRIORITY_TONE: Record<TaskPriority, 'slate' | 'blue' | 'orange' | 'red'> = {
  low: 'slate',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
}

export default function Tasks() {
  const tasks = useStore((s) => s.tasks)
  const employees = useStore((s) => s.employees)
  const updateTask = useStore((s) => s.updateTask)
  const toggleTaskChecklistItem = useStore((s) => s.toggleTaskChecklistItem)
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const filtered = useMemo(
    () => tasks.filter((t) => assigneeFilter === 'all' || t.assigneeId === assigneeFilter),
    [tasks, assigneeFilter]
  )

  function handleDragOver(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(status)
  }

  function handleDragLeave() {
    setDragOverColumn(null)
  }

  function handleDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault()
    setDragOverColumn(null)
    if (dragTaskId) {
      updateTask(dragTaskId, { status })
      setDragTaskId(null)
    }
  }

  function handleDragEnd() {
    setDragTaskId(null)
    setDragOverColumn(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nhiệm vụ</h1>
          <p className="mt-1 text-sm text-slate-500">Kéo thả để cập nhật trạng thái công việc</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select 
            className="input w-44" 
            value={assigneeFilter} 
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="all">Tất cả nhân viên</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            Giao việc
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colTasks = filtered.filter((t) => t.status === col.key)
          const isDragOver = dragOverColumn === col.key
          
          return (
            <div
              key={col.key}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.key)}
              className={clsx(
                'w-80 shrink-0 rounded-2xl border-2 p-4 transition-all duration-200',
                isDragOver 
                  ? 'border-brand-400 bg-brand-50' 
                  : 'border-transparent bg-slate-100'
              )}
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-lg font-bold text-sm',
                    col.key === 'todo' ? 'bg-slate-200 text-slate-600' :
                    col.key === 'doing' ? 'bg-blue-100 text-blue-600' :
                    'bg-green-100 text-green-600'
                  )}>
                    {colTasks.length}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                </div>
              </div>

              {/* Task Cards */}
              <div className="space-y-2 min-h-[200px]">
                {colTasks.length === 0 && (
                  <div className={clsx(
                    'flex items-center justify-center rounded-xl border-2 border-dashed py-8 text-xs transition-colors',
                    isDragOver ? 'border-brand-300 bg-brand-100/50 text-brand-500' : 'border-slate-200 text-slate-400'
                  )}>
                    {isDragOver ? 'Thả task vào đây' : 'Trống'}
                  </div>
                )}
                
                {colTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    draggable
                    onDragStart={() => setDragTaskId(t.id)}
                    onDragEnd={handleDragEnd}
                    employeeName={employees.find((e) => e.id === t.assigneeId)?.name}
                    onToggleChecklist={(itemId) => toggleTaskChecklistItem(t.id, itemId)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Task Modal */}
      <AssignTaskModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

// ====== TASK CARD ======

function TaskCard({
  task,
  draggable,
  onDragStart,
  onDragEnd,
  employeeName,
  onToggleChecklist,
}: {
  task: Task
  draggable?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  employeeName?: string
  onToggleChecklist: (itemId: string) => void
}) {
  const isDragging = false

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={clsx(
        'group cursor-grab rounded-xl border bg-white p-3.5 shadow-sm transition-all duration-200',
        'active:cursor-grabbing hover:shadow-md hover:border-brand-200',
        isDragging && 'opacity-50 scale-95 shadow-lg ring-2 ring-brand-400'
      )}
    >
      {/* Drag Handle + Title */}
      <div className="flex items-start gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <Link 
            to={`/nhiem-vu/${task.id}`} 
            className="text-sm font-medium text-slate-800 hover:text-brand-600 line-clamp-2"
          >
            {task.title}
          </Link>
        </div>
      </div>

      {/* Checklist Preview */}
      <ChecklistPreview task={task} compact onToggle={onToggleChecklist} />

      {/* Assignee */}
      {employeeName && (
        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-600">
          <User size={12} /> {employeeName}
        </div>
      )}

      {/* Footer: Priority + Due Date */}
      <div className="mt-2 flex items-center justify-between">
        <Badge tone={PRIORITY_TONE[task.priority]}>
          {PRIORITY_LABEL[task.priority]}
        </Badge>
        {task.dueDate && (
          <span className={clsx(
            'flex items-center gap-1 text-xs',
            task.priority === 'urgent' ? 'text-red-500' : 'text-slate-400'
          )}>
            {task.priority === 'urgent' && <AlertCircle size={12} />}
            {formatDate(task.dueDate)}
            {task.dueTime ? ` ${task.dueTime}` : ''}
          </span>
        )}
      </div>
    </div>
  )
}

// ====== CHECKLIST PREVIEW ======

function ChecklistPreview({
  task,
  compact,
  onToggle,
}: {
  task: Task
  compact?: boolean
  onToggle: (itemId: string) => void
}) {
  const items = task.checklist || []
  if (items.length === 0) return null

  const done = items.filter((i) => i.done).length
  const visible = compact ? items.slice(0, 3) : items

  return (
    <div 
      className="mt-2 space-y-1" 
      onClick={(e) => e.stopPropagation()} 
      onMouseDown={(e) => e.stopPropagation()}
    >
      {visible.map((item) => (
        <label key={item.id} className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={item.done}
            onChange={() => onToggle(item.id)}
            className="mt-0.5 shrink-0 rounded border-slate-300 text-brand-600"
          />
          <span className={clsx(
            'text-xs leading-5',
            item.done ? 'text-slate-400 line-through' : 'font-medium text-slate-700'
          )}>
            {item.text}
          </span>
        </label>
      ))}
      {compact && items.length > 3 && (
        <div className="text-[11px] text-slate-400">+{items.length - 3} mục khác</div>
      )}
      <div className="text-[11px] font-medium text-slate-400">
        {done}/{items.length} hoàn thành
      </div>
    </div>
  )
}

// ====== ASSIGN TASK MODAL ======

function AssignTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addTask = useStore((s) => s.addTask)
  const employees = useStore((s) => s.employees)
  const vehicles = useStore((s) => s.vehicles)

  const [title, setTitle] = useState('')
  const [checklistTexts, setChecklistTexts] = useState<string[]>([''])
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [assigneeId, setAssigneeId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')

  function reset() {
    setTitle('')
    setChecklistTexts([''])
    setDescription('')
    setPriority('medium')
    setAssigneeId('')
    setVehicleId('')
    setDueDate('')
    setDueTime('')
  }

  function handleChecklistText(idx: number, value: string) {
    setChecklistTexts((rows) => rows.map((row, i) => (i === idx ? value : row)))
  }

  function handleAddChecklistRow() {
    setChecklistTexts((rows) => [...rows, ''])
  }

  function handleRemoveChecklistRow(idx: number) {
    setChecklistTexts((rows) => (rows.length === 1 ? [''] : rows.filter((_, i) => i !== idx)))
  }

  function handleSubmit() {
    if (!title.trim()) return
    const checklist: TaskChecklistItem[] = checklistTexts
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({ id: uid('chk'), text, done: false }))
    addTask({
      title: title.trim(),
      description,
      checklist,
      priority,
      status: 'todo',
      assigneeId: assigneeId || null,
      vehicleId: vehicleId || null,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
    })
    reset()
    onClose()
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Giao việc mới">
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="label">Tên công việc *</label>
          <input
            className="input w-full"
            placeholder="VD: Kiểm tra xe Sonata 2023..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Checklist */}
        <div>
          <label className="label">Checklist</label>
          <div className="space-y-2">
            {checklistTexts.map((text, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="VD: Kiểm tra màn hình..."
                  value={text}
                  onChange={(e) => handleChecklistText(idx, e.target.value)}
                />
                {checklistTexts.length > 1 && (
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleRemoveChecklistRow(idx)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-brand-600 hover:text-brand-700"
              onClick={handleAddChecklistRow}
            >
              + Thêm checklist
            </button>
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="label">Độ ưu tiên</label>
          <div className="flex gap-2">
            {(Object.entries(PRIORITY_LABEL) as [TaskPriority, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPriority(key)}
                className={clsx(
                  'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                  priority === key
                    ? key === 'urgent' ? 'border-red-300 bg-red-50 text-red-700' :
                      key === 'high' ? 'border-orange-300 bg-orange-50 text-orange-700' :
                      key === 'medium' ? 'border-blue-300 bg-blue-50 text-blue-700' :
                      'border-slate-300 bg-slate-50 text-slate-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Assignee & Vehicle */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Người phụ trách</label>
            <select
              className="input w-full"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Không phân công</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Xe liên quan</label>
            <select
              className="input w-full"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">Không có xe</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Due Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ngày hạn</label>
            <input
              type="date"
              className="input w-full"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Giờ hạn</label>
            <input
              type="time"
              className="input w-full"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary flex-1" onClick={handleClose}>
            Huỷ
          </button>
          <button 
            type="button" 
            className="btn-primary flex-1" 
            onClick={handleSubmit}
            disabled={!title.trim()}
          >
            <Plus size={16} />
            Tạo việc
          </button>
        </div>
      </div>
    </Modal>
  )
}
