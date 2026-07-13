import { useMemo, useState, useEffect, useRef } from 'react'
import { Plus, X, Trash2, GripVertical, Calendar, User } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useTaskPermissions } from '../rbac/usePermissions'
import { Badge } from '../components/ui'
import type { Task, TaskChecklistItem, TaskPriority, TaskStatus } from '../types'
import { uid } from '../utils/format'

type WorkSection = 'todo' | 'doing' | 'done'

const SECTION_CONFIG: { key: WorkSection; label: string; icon: string; tone: 'slate' | 'orange' | 'green' }[] = [
  { key: 'todo', label: 'Chưa làm', icon: '🚗', tone: 'slate' },
  { key: 'doing', label: 'Đang làm', icon: '🟡', tone: 'orange' },
  { key: 'done', label: 'Đã hoàn thành', icon: '✅', tone: 'green' },
]

const PRIORITY_LABEL: Record<TaskPriority, string> = { urgent: 'Làm gấp', priority: 'Ưu tiên hơn', normal: 'Cứ từ từ' }
const PRIORITY_TONE: Record<TaskPriority, 'slate' | 'blue' | 'orange' | 'red'> = { urgent: 'red', priority: 'orange', normal: 'slate' }

// ====== TASK CARD ======
function TaskCard({ task, vehiclePlate, onEdit, onDragStart }: { task: Task; vehiclePlate: string; onEdit: () => void; onDragStart: (e: React.DragEvent) => void }) {
  const checklistTotal = task.checklist?.length ?? 0
  const checklistDone = task.checklist?.filter((i) => i.done).length ?? 0
  const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10) && task.status !== 'done'

  return (
    <div draggable onDragStart={onDragStart} onClick={onEdit}
      className="cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-200 active:scale-[0.98]"
      style={{ borderColor: 'rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start gap-2">
        <div className="flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded text-slate-300 opacity-0 transition-opacity hover:opacity-100 active:cursor-grabbing">
          <GripVertical size={14} />
        </div>
        <div className="min-w-0 flex-1">
          {/* Title + Priority */}
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold text-slate-800 line-clamp-2">{task.title}</span>
            <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
          </div>

          {/* Vehicle plate */}
          <div className="mt-1 text-xs font-medium text-slate-400">{vehiclePlate || 'Không có xe'}</div>

          {/* Meta */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {isOverdue && <span className="flex items-center gap-1 font-medium text-red-500"><Calendar size={12} /> Quá hạn</span>}
            {checklistTotal > 0 && (
              <span className="flex items-center gap-1">
                {checklistDone}/{checklistTotal} bước
              </span>
            )}
          </div>

          {/* Progress bar */}
          {checklistTotal > 0 && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(0,0,0,0.06)' }}>
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.round((checklistDone / checklistTotal) * 100)}%` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ====== TASK EDIT DRAWER ======
function TaskEditDrawer({ task, vehicles, employees, onClose, onUpdate, onDelete }: {
  task: Task; vehicles: { id: string; plate: string; model: string }[]; employees: { id: string; name: string }[]; onClose: () => void; onUpdate: (id: string, patch: Partial<Task>) => void; onDelete: (id: string) => void
}) {
  const [title, setTitle] = useState(task.title)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '')
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>(task.checklist ?? [])
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [dueTime, setDueTime] = useState(task.dueTime ?? '')
  const [saving, setSaving] = useState(false)
  const vehicle = vehicles.find((v) => v.id === task.vehicleId)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    onUpdate(task.id, {
      title: title.trim(), priority, status,
      assigneeId: assigneeId || null,
      dueDate: dueDate || null, dueTime: dueTime || null,
      checklist: checklist.filter((i) => i.text.trim()),
    })
    setSaving(false)
    onClose()
  }

  function handleDelete() {
    if (window.confirm('Xóa nhiệm vụ này?')) { onDelete(task.id); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-slide-in-right">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Chi tiết nhiệm vụ</h2>
          <button type="button" className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            {/* Vehicle — read-only */}
            <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(0,0,0,0.02)' }}>
              <div className="text-xs font-medium text-slate-400">Xe</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-700">{vehicle ? `${vehicle.plate} ${vehicle.model}` : 'Không có xe'}</div>
            </div>

            {/* Title */}
            <div>
              <label className="label">Tên công việc *</label>
              <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>

            {/* Priority + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Mức ưu tiên</label>
                <select className="input w-full" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                  <option value="low">Thấp</option><option value="medium">Trung bình</option><option value="high">Cao</option><option value="urgent">Khẩn cấp</option>
                </select>
              </div>
              <div>
                <label className="label">Trạng thái</label>
                <select className="input w-full" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                  <option value="todo">Chưa làm</option><option value="doing">Đang làm</option><option value="done">Đã hoàn thành</option>
                </select>
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="label">Người phụ trách</label>
              <select className="input w-full" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Không phân công</option>
                {employees.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
              </select>
            </div>

            {/* Checklist */}
            <div>
              <label className="label">Các bước kiểm tra</label>
              <div className="space-y-2">
                {checklist.map((item, idx) => (
                  <div key={item.id} className="flex gap-2">
                    <input type="checkbox" checked={item.done} onChange={() => setChecklist((rows) => rows.map((r, i) => (i === idx ? { ...r, done: !r.done } : r)))}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600" />
                    <input className="input flex-1" placeholder="Bước kiểm tra" value={item.text}
                      onChange={(e) => setChecklist((rows) => rows.map((r, i) => (i === idx ? { ...r, text: e.target.value } : r)))} />
                    <button type="button" className="btn-icon shrink-0" onClick={() => setChecklist((rows) => rows.filter((_, i) => i !== idx))}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
              <button type="button" className="mt-2 flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setChecklist((rows) => [...rows, { id: uid('chk'), text: '', done: false }])}><Plus size={14} /> Thêm bước</button>
            </div>

            {/* Due Date / Time */}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Ngày hạn</label><input type="date" className="input w-full" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
              <div><label className="label">Giờ hạn</label><input type="time" className="input w-full" value={dueTime} onChange={(e) => setDueTime(e.target.value)} /></div>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="flex gap-3">
            <button type="button" className="btn-danger !px-3" onClick={handleDelete}><Trash2 size={15} /> Xoá</button>
            <div className="flex-1" />
            <button type="button" className="btn-secondary" onClick={onClose}>Huỷ</button>
            <button type="button" className="btn-primary" onClick={handleSave} disabled={saving || !title.trim()}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ====== MAIN TASKS PAGE ======
export default function Tasks() {
  const tasks = useStore((s) => s.tasks)
  const employees = useStore((s) => s.employees)
  const vehicles = useStore((s) => s.vehicles)
  const updateTask = useStore((s) => s.updateTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const addTask = useStore((s) => s.addTask)
  const taskPerms = useTaskPermissions()
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

  // Add-task drawer
  const [showAddDrawer, setShowAddDrawer] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('normal')
  const [newStatus, setNewStatus] = useState<TaskStatus>('todo')
  const [newVehicleId, setNewVehicleId] = useState('')
  const [newChecklist, setNewChecklist] = useState<TaskChecklistItem[]>([{ id: uid('chk'), text: '', done: false }])
  const [newDueDate, setNewDueDate] = useState('')
  const [newDueTime, setNewDueTime] = useState('')

  // Drag state
  const dragTaskIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!showAddDrawer && !editingTaskId) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShowAddDrawer(false); setEditingTaskId(null) } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showAddDrawer, editingTaskId])

  // Vehicle plate lookup
  const vehiclesMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of vehicles) m.set(v.id, v.plate)
    return m
  }, [vehicles])

  // Filtered tasks
  const filtered = useMemo(() => tasks.filter((t) => assigneeFilter === 'all' || t.assigneeId === assigneeFilter), [tasks, assigneeFilter])

  const todoTasks = useMemo(() => filtered.filter((t) => t.status === 'todo'), [filtered])
  const doingTasks = useMemo(() => filtered.filter((t) => t.status === 'doing'), [filtered])
  const doneTasks = useMemo(() => filtered.filter((t) => t.status === 'done'), [filtered])

  const sectionTasks: Record<WorkSection, Task[]> = { todo: todoTasks, doing: doingTasks, done: doneTasks }

  function handleDragStart(_e: React.DragEvent, taskId: string) { dragTaskIdRef.current = taskId }
  function handleDrop(section: WorkSection) {
    return (e: React.DragEvent) => {
      e.preventDefault()
      const taskId = dragTaskIdRef.current
      dragTaskIdRef.current = null
      if (!taskId) return
      const task = tasks.find((t) => t.id === taskId)
      if (!task || task.status === section) return
      updateTask(taskId, { status: section })
    }
  }

  function resetAddForm() {
    setNewTitle(''); setNewChecklist([{ id: uid('chk'), text: '', done: false }])
    setNewPriority('normal'); setNewStatus('todo'); setNewVehicleId('')
    setNewDueDate(''); setNewDueTime('')
  }

  function handleAddTask() {
    if (!newTitle.trim()) return
    const checklist = newChecklist.map((i) => ({ ...i, text: i.text.trim() })).filter((i) => i.text)
    addTask({ id: uid('task'), title: newTitle.trim(), checklist, priority: newPriority, status: newStatus, vehicleId: newVehicleId || null, assigneeId: null, dueDate: newDueDate || null, dueTime: newDueTime || null, createdAt: new Date().toISOString() })
    setShowAddDrawer(false); resetAddForm()
  }

  const editingTask = editingTaskId ? tasks.find((t) => t.id === editingTaskId) ?? null : null

  return (
    <div className="pb-16 md:pb-0">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nhiệm vụ</h1>
          <p className="mt-1 text-sm text-slate-500">Kéo thả để cập nhật trạng thái</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className="input w-44" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="all">Tất cả nhân viên</option>
            {employees.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
          </select>
          {taskPerms.canCreate && (
            <button className="btn-primary" onClick={() => { resetAddForm(); setShowAddDrawer(true) }}><Plus size={16} /> Thêm nhiệm vụ</button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {SECTION_CONFIG.map((section) => {
          const tasksInSection = sectionTasks[section.key]
          return (
            <div key={section.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop(section.key)}
              className="flex w-80 shrink-0 flex-col rounded-2xl p-4 transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">{section.icon} {section.label}</span>
                <Badge tone={section.tone}>{tasksInSection.length}</Badge>
              </div>
              <div className="flex-1 space-y-2 min-h-[120px]">
                {tasksInSection.length === 0 && (
                  <div className="flex items-center justify-center rounded-xl border-2 border-dashed py-8 text-xs text-slate-400" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                    Kéo task vào đây
                  </div>
                )}
                {tasksInSection.map((task) => (
                  <div key={task.id} onDragStart={(e) => handleDragStart(e, task.id)}>
                    <TaskCard task={task} vehiclePlate={vehiclesMap.get(task.vehicleId ?? '') ?? ''} onEdit={() => setEditingTaskId(task.id)} onDragStart={(e) => handleDragStart(e, task.id)} />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add-task Drawer */}
      {showAddDrawer && (
        <div className="fixed inset-0 z-50 animate-fade-in">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { setShowAddDrawer(false); resetAddForm() }} />
          <div className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-slide-in-right">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Tạo nhiệm vụ mới</h2>
              <button type="button" className="btn-icon" onClick={() => { setShowAddDrawer(false); resetAddForm() }}><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-4">
                <div><label className="label">Tên công việc *</label><input className="input w-full" placeholder="VD: Kiểm tra xe..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus /></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><label className="label">Mức ưu tiên</label><select className="input w-full" value={newPriority} onChange={(e) => setNewPriority(e.target.value as TaskPriority)}>
                    <option value="low">Thấp</option><option value="medium">Trung bình</option><option value="high">Cao</option><option value="urgent">Khẩn cấp</option>
                  </select></div>
                  <div><label className="label">Trạng thái</label><select className="input w-full" value={newStatus} onChange={(e) => setNewStatus(e.target.value as TaskStatus)}>
                    <option value="todo">Chưa làm</option><option value="doing">Đang làm</option><option value="done">Đã hoàn thành</option>
                  </select></div>
                </div>
                <div><label className="label">Xe liên quan</label><select className="input w-full" value={newVehicleId} onChange={(e) => setNewVehicleId(e.target.value)}>
                  <option value="">Không có xe</option>
                  {[...vehicles].sort((a, b) => a.plate.localeCompare(b.plate)).map((v) => (<option key={v.id} value={v.id}>{v.plate} - {v.model}</option>))}
                </select></div>
                <div>
                  <label className="label">Các bước kiểm tra</label>
                  <div className="space-y-2">
                    {newChecklist.map((item, idx) => (
                      <div key={item.id} className="flex gap-2">
                        <input className="input flex-1" placeholder="Bước kiểm tra" value={item.text} onChange={(e) => setNewChecklist((rows) => rows.map((r, i) => (i === idx ? { ...r, text: e.target.value } : r)))} />
                        <button type="button" className="btn-icon shrink-0" onClick={() => setNewChecklist((rows) => (rows.length === 1 ? rows : rows.filter((_, i) => i !== idx)))}><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="mt-2 flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setNewChecklist((rows) => [...rows, { id: uid('chk'), text: '', done: false }])}><Plus size={14} /> Thêm bước</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Ngày hạn</label><input type="date" className="input w-full" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} /></div>
                  <div><label className="label">Giờ hạn</label><input type="time" className="input w-full" value={newDueTime} onChange={(e) => setNewDueTime(e.target.value)} /></div>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 px-5 py-4">
              <div className="flex gap-3">
                <button type="button" className="btn-secondary flex-1" onClick={() => { setShowAddDrawer(false); resetAddForm() }}>Huỷ</button>
                <button type="button" className="btn-primary flex-1" disabled={!newTitle.trim()} onClick={handleAddTask}>Tạo nhiệm vụ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Edit Drawer */}
      {editingTask && (
        <TaskEditDrawer task={editingTask} vehicles={vehicles} employees={employees}
          onClose={() => setEditingTaskId(null)} onUpdate={updateTask} onDelete={deleteTask} />
      )}
    </div>
  )
}
