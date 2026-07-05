import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Calendar, Check, LayoutGrid, List, Plus, User, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, Modal } from '../components/ui'
import { Task, TaskChecklistItem, TaskPriority, TaskStatus } from '../types'
import { formatDate, uid } from '../utils/format'
import clsx from 'clsx'

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: 'Chưa làm' },
  { key: 'doing', label: 'Đang làm' },
  { key: 'done', label: 'Hoàn thành' },
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
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)

  const filtered = useMemo(
    () => tasks.filter((t) => assigneeFilter === 'all' || t.assigneeId === assigneeFilter),
    [tasks, assigneeFilter]
  )

  function handleDrop(status: TaskStatus) {
    if (dragTaskId) updateTask(dragTaskId, { status })
    setDragTaskId(null)
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nhiệm vụ</h1>
          <p className="mt-1 text-sm text-slate-500">Quản lý công việc hàng ngày của gara</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className="input w-44" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
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

      <div className="mb-5 inline-flex rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setView('kanban')}
          className={clsx('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium', view === 'kanban' ? 'bg-white shadow-sm text-brand-700' : 'text-slate-500')}
        >
          <LayoutGrid size={14} /> Kanban
        </button>
        <button
          onClick={() => setView('list')}
          className={clsx('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium', view === 'list' ? 'bg-white shadow-sm text-brand-700' : 'text-slate-500')}
        >
          <List size={14} /> Danh sách
        </button>
      </div>

      {view === 'kanban' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {COLUMNS.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.key)
            return (
              <div
                key={col.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(col.key)}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3"
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm">{colTasks.length}</span>
                </div>
                <div className="min-h-[80px] space-y-2.5">
                  {colTasks.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">Trống</div>}
                  {colTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      draggable
                      onDragStart={() => setDragTaskId(t.id)}
                      employeeName={employees.find((e) => e.id === t.assigneeId)?.name}
                      onToggleChecklist={(itemId) => toggleTaskChecklistItem(t.id, itemId)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState title="Chưa có nhiệm vụ nào" />
          ) : (
            <ul>
              {filtered.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 border-b border-slate-50 px-5 py-3.5 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-md border-none bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600"
                        value={t.status}
                        onChange={(e) => updateTask(t.id, { status: e.target.value as TaskStatus })}
                      >
                        {COLUMNS.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <span className="truncate font-medium text-slate-800">{t.title}</span>
                    </div>
                    <ChecklistPreview task={t} compact onToggle={(itemId) => toggleTaskChecklistItem(t.id, itemId)} />
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                      {t.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {formatDate(t.dueDate)}
                          {t.dueTime ? ` ${t.dueTime}` : ''}
                        </span>
                      )}
                      {t.assigneeId && (
                        <span className="flex items-center gap-1">
                          <User size={12} /> {employees.find((e) => e.id === t.assigneeId)?.name}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <AssignTaskModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

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
  const visible = compact ? items.slice(0, 4) : items

  return (
    <div className="mt-2 space-y-1" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      {visible.map((item) => (
        <label key={item.id} className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={item.done}
            onChange={() => onToggle(item.id)}
            className="mt-0.5 rounded border-slate-300 text-brand-600"
          />
          <span className={clsx('text-xs leading-5', item.done ? 'text-slate-400 line-through' : 'font-medium text-slate-700')}>{item.text}</span>
        </label>
      ))}
      {!compact && items.length > 4 && <div className="text-xs text-slate-400">+{items.length - 4} mục khác</div>}
      <div className="text-[11px] font-medium text-slate-400">
        {done}/{items.length} hoàn thành
      </div>
    </div>
  )
}

function TaskCard({
  task,
  draggable,
  onDragStart,
  employeeName,
  onToggleChecklist,
}: {
  task: Task
  draggable?: boolean
  onDragStart?: () => void
  employeeName?: string
  onToggleChecklist: (itemId: string) => void
}) {
  return (
    <div draggable={draggable} onDragStart={onDragStart} className="cursor-grab rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm active:cursor-grabbing">
      <Link to={`/nhiem-vu/${task.id}`} className="text-sm font-medium text-slate-800 hover:text-brand-600">{task.title}</Link>
      <ChecklistPreview task={task} compact onToggle={onToggleChecklist} />
      {employeeName && (
        <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-600">
          <User size={12} /> {employeeName}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
        {task.dueDate && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            {task.priority === 'urgent' && <AlertCircle size={12} className="text-red-500" />}
            {formatDate(task.dueDate)}
            {task.dueTime ? ` ${task.dueTime}` : ''}
          </span>
        )}
      </div>
    </div>
  )
}

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

  const today = new Date().toISOString().slice(0, 10)

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

  function updateChecklistText(idx: number, value: string) {
    setChecklistTexts((rows) => rows.map((row, i) => (i === idx ? value : row)))
  }

  function addChecklistRow() {
    setChecklistTexts((rows) => [...rows, ''])
  }

  function removeChecklistRow(idx: number) {
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

  return (
    <Modal open={open} onClose={onClose} title="Giao nhiệm vụ mới">
      <div className="space-y-4">
        <div>
          <label className="label">Tiêu đề *</label>
          <input className="input" placeholder="VD: Vệ sinh xe 5678" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label !mb-0">Checklist</label>
            <button type="button" className="text-xs font-medium text-brand-600 hover:underline" onClick={addChecklistRow}>
              + Thêm mục
            </button>
          </div>
          <div className="space-y-2">
            {checklistTexts.map((text, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  className="input"
                  placeholder={`Bước ${idx + 1}: VD: Rửa xe`}
                  value={text}
                  onChange={(e) => updateChecklistText(idx, e.target.value)}
                />
                {checklistTexts.length > 1 && (
                  <button type="button" className="btn-secondary !px-3" onClick={() => removeChecklistRow(idx)}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Các mục này hiển thị ngay trên thẻ nhiệm vụ để theo dõi tiến độ.</p>
        </div>

        <div>
          <label className="label">Mô tả</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Ưu tiên</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              <option value="low">Thấp</option>
              <option value="medium">Trung bình</option>
              <option value="high">Cao</option>
              <option value="urgent">Khẩn cấp</option>
            </select>
          </div>
          <div>
            <label className="label">Người thực hiện</label>
            <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Chọn...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Xe liên quan (tuỳ chọn)</label>
          <select className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            <option value="">— Việc chung —</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} • {v.model}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Hạn hoàn thành</label>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="text-sm font-medium text-slate-700">
              {dueDate ? `${formatDate(dueDate)}${dueTime ? ` • ${dueTime}` : ''}` : 'Chưa đặt hạn'}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={() => setDueDate(today)}>
                Hôm nay
              </button>
              <input type="date" className="input w-auto" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <input type="time" className="input w-auto" value={dueTime} onChange={(e) => setDueTime(e.target.value)} placeholder="Giờ" />
            </div>
          </div>
        </div>
        <button className="btn-primary w-full" onClick={handleSubmit}>
          <Check size={16} />
          Tạo nhiệm vụ
        </button>
      </div>
    </Modal>
  )
}
