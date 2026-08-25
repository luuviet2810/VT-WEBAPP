import { useMemo, useState, useEffect, useRef } from 'react'
import { Plus, X, Trash2, GripVertical, Calendar, User, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useTaskPermissions } from '../rbac/usePermissions'
import { Badge, Modal } from '../components/ui'
import { buildTaskSummary, TaskGroupSummary } from '../utils/taskSummary'
import type { Task, TaskPriority, TaskStatus } from '../types'
import { uid } from '../utils/format'

type WorkSection = 'todo' | 'deferred' | 'doing' | 'done'

const SECTION_CONFIG: { key: WorkSection; label: string; icon: string; tone: 'slate' | 'orange' | 'green' | 'blue' }[] = [
  { key: 'todo', label: 'Chưa làm', icon: '🚗', tone: 'slate' },
  { key: 'deferred', label: 'Chưa cần làm ngay', icon: '📌', tone: 'blue' },
  { key: 'doing', label: 'Đang làm', icon: '🟡', tone: 'orange' },
  { key: 'done', label: 'Đã hoàn thành', icon: '✅', tone: 'green' },
]

const PRIORITY_LABEL: Record<TaskPriority, string> = { high: 'Làm gấp / Giao ngay', medium: 'Ưu tiên hơn', low: 'Cứ từ từ', urgent: 'Làm gấp / Giao ngay' }
const PRIORITY_TONE: Record<TaskPriority, 'slate' | 'blue' | 'orange' | 'red'> = { high: 'red', medium: 'orange', low: 'blue', urgent: 'red' }

const STATUS_BTN_TONE: Record<'slate' | 'blue' | 'orange' | 'green', string> = {
  slate: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
  blue: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
  orange: 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
}

function QuickStatusBtn({ label, tone, onClick }: { label: string; tone: 'slate' | 'blue' | 'orange' | 'green'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors min-h-[44px] ${STATUS_BTN_TONE[tone]}`}
    >
      {label}
    </button>
  )
}

// ====== TASK CARD ======
function TaskCard({ task, vehiclePlate, onEdit, onDragStart }: { task: Task; vehiclePlate: string; onEdit: () => void; onDragStart: (e: React.DragEvent) => void }) {
  const vehicles = useStore((s) => s.vehicles)
  const employees = useStore((s) => s.employees)
  const assignee = task.assigneeId ? employees.find((e) => e.id === task.assigneeId) : null
  const taskVehicle = task.vehicleId ? vehicles.find((v) => v.id === task.vehicleId) : null

  // Deadline display logic
  const deadlineText = useMemo(() => {
    if (!task.dueDate) return { text: 'Không có hạn', tone: 'text-slate-400' }
    if (task.status === 'done') return null

    const now = new Date()
    const due = new Date(`${task.dueDate}${task.dueTime ? `T${task.dueTime}` : 'T23:59'}`)
    const diffMs = due.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMs < 0) {
      const abs = Math.abs(diffHours)
      return {
        text: abs < 24 ? `Quá hạn ${abs} giờ` : `Quá hạn ${Math.floor(abs / 24)} ngày`,
        tone: 'text-red-500',
      }
    }
    if (diffHours < 24) {
      return {
        text: task.dueTime ? `Hôm nay ${task.dueTime}` : 'Hôm nay',
        tone: 'text-orange-500',
      }
    }
    if (diffDays === 0 || diffDays === 1) {
      return {
        text: task.dueTime ? `Ngày mai ${task.dueTime}` : 'Ngày mai',
        tone: 'text-yellow-600',
      }
    }
    return {
      text: `Còn ${diffDays} ngày`,
      tone: 'text-emerald-600',
    }
  }, [task.dueDate, task.dueTime, task.status])

  return (
    <div draggable onDragStart={onDragStart} onClick={onEdit}
      className="cursor-pointer rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-blue-200 active:scale-[0.98]"
      style={{ borderColor: 'rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-start gap-2">
        <div className="flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded text-slate-300 transition-opacity hover:opacity-100 active:cursor-grabbing">
          <GripVertical size={14} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {/* Title — most prominent, up to 3 lines */}
          <h3 className="text-sm font-bold text-slate-900 leading-5 line-clamp-3">{task.title}</h3>

          {/* Vehicle model · plate */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="truncate">{taskVehicle ? taskVehicle.model : '—'}</span>
            <span className="shrink-0">·</span>
            <span className="shrink-0 font-medium text-slate-500">{vehiclePlate || '—'}</span>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100" />

          {/* Priority — full width, never beside title */}
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_TONE[task.priority] === 'red' ? 'bg-red-500' : PRIORITY_TONE[task.priority] === 'orange' ? 'bg-orange-400' : 'bg-blue-500'}`} />
            <Badge tone={PRIORITY_TONE[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
          </div>

          {/* Metadata rows — each on its own line, never mixed */}
          <div className="flex flex-col gap-1 text-xs">
            {deadlineText && (
              <span className={`flex items-center gap-1.5 ${deadlineText.tone}`}>
                📅 {deadlineText.text}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-slate-500">
              👤 {assignee ? assignee.name : 'Chưa phân công'}
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              {task.ruleId ? '🤖 Auto' : '✍️ Manual'}
            </span>
          </div>
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
  const [deferred, setDeferred] = useState(Boolean(task.deferred))
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '')
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
      title: title.trim(), priority, status, deferred,
      assigneeId: assigneeId || null,
      dueDate: dueDate || null, dueTime: dueTime || null,
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

            {/* Source badge */}
            <div className="flex items-center gap-2">
              <Badge tone={task.ruleId ? 'blue' : 'slate'}>{task.ruleId ? '🤖 Auto' : '✍️ Manual'}</Badge>
              <span className="text-xs text-slate-400">{task.ruleId ? 'Tự động tạo từ biên bản kiểm tra' : 'Được tạo thủ công'}</span>
            </div>

            {/* Title */}
            <div>
              <label className="label">Tên công việc *</label>
              <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>

            {/* Priority */}
            <div>
              <label className="label">Mức ưu tiên</label>
              <select className="input w-full" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                <option value="high">Làm gấp / Giao ngay _ 5⭐</option><option value="medium">Ưu tiên hơn _ 4⭐</option><option value="low">Cứ từ từ _ 3⭐</option>
              </select>
            </div>

          {/* Current Status */}
          <div>
            <label className="label">Trạng thái hiện tại</label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <span className={`h-2 w-2 rounded-full ${deferred ? 'bg-blue-400' : status === 'todo' ? 'bg-slate-400' : status === 'doing' ? 'bg-orange-400' : 'bg-green-500'}`} />
              {deferred ? 'Chưa cần làm ngay' : status === 'todo' ? 'Chưa làm' : status === 'doing' ? 'Đang làm' : 'Hoàn thành'}
            </div>
          </div>

          {/* Quick Actions — move to any of the other 3 states */}
          <div>
            <label className="label">Chuyển nhanh</label>
            <div className="flex flex-wrap gap-2">
              {deferred ? (
                <>
                  <QuickStatusBtn label="Chưa làm" tone="slate" onClick={() => { setStatus('todo'); setDeferred(false); onUpdate(task.id, { status: 'todo', deferred: false }) }} />
                  <QuickStatusBtn label="Đang làm" tone="orange" onClick={() => { setStatus('doing'); setDeferred(false); onUpdate(task.id, { status: 'doing', deferred: false }) }} />
                  <QuickStatusBtn label="Hoàn thành" tone="green" onClick={() => { setStatus('done'); setDeferred(false); onUpdate(task.id, { status: 'done', deferred: false }) }} />
                </>
              ) : status === 'todo' ? (
                <>
                  <QuickStatusBtn label="Chưa cần làm ngay" tone="blue" onClick={() => { setDeferred(true); onUpdate(task.id, { status: 'todo', deferred: true }) }} />
                  <QuickStatusBtn label="Đang làm" tone="orange" onClick={() => { setStatus('doing'); onUpdate(task.id, { status: 'doing' }) }} />
                  <QuickStatusBtn label="Hoàn thành" tone="green" onClick={() => { setStatus('done'); onUpdate(task.id, { status: 'done' }) }} />
                </>
              ) : status === 'doing' ? (
                <>
                  <QuickStatusBtn label="Chưa làm" tone="slate" onClick={() => { setStatus('todo'); onUpdate(task.id, { status: 'todo' }) }} />
                  <QuickStatusBtn label="Chưa cần làm ngay" tone="blue" onClick={() => { setStatus('todo'); setDeferred(true); onUpdate(task.id, { status: 'todo', deferred: true }) }} />
                  <QuickStatusBtn label="Hoàn thành" tone="green" onClick={() => { setStatus('done'); onUpdate(task.id, { status: 'done' }) }} />
                </>
              ) : (
                <>
                  <QuickStatusBtn label="Chưa làm" tone="slate" onClick={() => { setStatus('todo'); onUpdate(task.id, { status: 'todo' }) }} />
                  <QuickStatusBtn label="Chưa cần làm ngay" tone="blue" onClick={() => { setStatus('todo'); setDeferred(true); onUpdate(task.id, { status: 'todo', deferred: true }) }} />
                  <QuickStatusBtn label="Đang làm" tone="orange" onClick={() => { setStatus('doing'); onUpdate(task.id, { status: 'doing' }) }} />
                </>
              )}
            </div>
          </div>

          {deferred && status === 'todo' && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
              📌 Chưa cần làm ngay — vẫn là "Chưa làm", không tự cập nhật checksheet
            </div>
          )}
          {status === 'done' && !deferred && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              ✓ Công việc đã hoàn thành
            </div>
          )}

            {/* Assignee */}
            <div>
              <label className="label">Người phụ trách</label>
              <select className="input w-full" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Không phân công</option>
                {employees.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
              </select>
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

// ====== TASK SUMMARY ======
function TaskSummary({ groups, onDetail }: { groups: TaskGroupSummary[]; onDetail: (g: TaskGroupSummary) => void }) {
  const [collapsed, setCollapsed] = useState(false)
  if (groups.length === 0) return null
  return (
    <div className="card mb-5 p-4">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="mb-3 flex w-full items-center justify-between text-sm font-semibold text-slate-700"
        aria-expanded={!collapsed}
      >
        <span className="flex items-center gap-2">
          📋 Tổng quan nhiệm vụ
          {!collapsed && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{groups.length} loại</span>}
        </span>
        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
      </button>
      {!collapsed && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.key} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-base">{g.icon}</span>
                <span className="truncate text-sm font-medium text-slate-700">{g.label}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">{g.count} {g.isManual ? 'việc' : 'xe'}</span>
                <button
                  onClick={() => onDetail(g)}
                  className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-brand-600 transition-colors hover:border-brand-300 hover:bg-brand-50"
                  style={{ minHeight: 44 }}
                >
                  Chi tiết
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ====== TASK SUMMARY DETAIL (drawer/modal, read-only) ======
function TaskSummaryDetail({ group, vehicles, employees, onClose }: {
  group: TaskGroupSummary
  vehicles: { id: string; plate: string; model: string }[]
  employees: { id: string; name: string }[]
  onClose: () => void
}) {
  const assigneeName = (id?: string | null) => (id ? employees.find((e) => e.id === id)?.name : undefined)

  if (group.isManual) {
    const unit = group.count === 1 ? 'việc' : 'việc'
    return (
      <Modal open onClose={onClose} title={`${group.icon} ${group.label}`} subtitle={`${group.count} ${unit} chưa hoàn thành`} width="max-w-lg">
        <div className="space-y-2">
          {group.tasks.map((t) => {
            const v = t.vehicleId ? vehicles.find((x) => x.id === t.vehicleId) : null
            return (
              <div key={t.id} className="rounded-xl border border-slate-100 p-3">
                <div className="text-sm font-medium text-slate-800">• {t.title}</div>
                <div className="mt-0.5 text-xs text-slate-500">Xe {v ? `${v.model} · ${v.plate}` : '—'}</div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <Badge tone={t.status === 'doing' ? 'orange' : 'slate'}>{t.status === 'todo' ? 'Chưa làm' : 'Đang làm'}</Badge>
                  {assigneeName(t.assigneeId) && <span className="text-slate-500">👤 {assigneeName(t.assigneeId)}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </Modal>
    )
  }

  // Auto group — list unique vehicles, matching the summary count exactly
  const seen = new Set<string>()
  const vehicleTasks = group.tasks.filter((t) => {
    if (!t.vehicleId) return false
    if (seen.has(t.vehicleId)) return false
    seen.add(t.vehicleId)
    return true
  })
  const noVehicleTasks = group.tasks.filter((t) => !t.vehicleId)
  const countUnit = group.count === 1 ? 'xe' : 'xe'

  return (
    <Modal open onClose={onClose} title={`${group.icon} ${group.label}`} subtitle={`${group.count} ${countUnit} cần thực hiện`} width="max-w-lg">
      <div className="space-y-2">
        {vehicleTasks.map((t) => {
          const v = vehicles.find((x) => x.id === t.vehicleId)
          return (
            <div key={t.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">🚗 {v?.plate || '—'}</span>
                <span className="text-sm text-slate-500">{v?.model || ''}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <Badge tone={t.status === 'doing' ? 'orange' : 'slate'}>{t.status === 'todo' ? 'Chưa làm' : 'Đang làm'}</Badge>
                <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                {t.dueDate && <span className="text-slate-400">📅 {t.dueDate}{t.dueTime ? ` ${t.dueTime}` : ''}</span>}
                {assigneeName(t.assigneeId) && <span className="text-slate-500">👤 {assigneeName(t.assigneeId)}</span>}
              </div>
            </div>
          )
        })}
        {noVehicleTasks.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-100 p-3">
            <div className="text-sm font-medium text-slate-800">• {t.title} <span className="text-xs text-slate-400">(không liên kết xe)</span></div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <Badge tone={t.status === 'doing' ? 'orange' : 'slate'}>{t.status === 'todo' ? 'Chưa làm' : 'Đang làm'}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Modal>
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
  const [searchQuery, setSearchQuery] = useState('')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [summaryDetailGroup, setSummaryDetailGroup] = useState<TaskGroupSummary | null>(null)

  // Add-task drawer
  const [showAddDrawer, setShowAddDrawer] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const [newStatus, setNewStatus] = useState<TaskStatus>('todo')
  const [newVehicleId, setNewVehicleId] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newDueTime, setNewDueTime] = useState('')

  // Drag state
  const dragTaskIdRef = useRef<string | null>(null)
  const boardScrollRef = useRef<HTMLDivElement>(null)

  function scrollBoard(dir: 1 | -1) {
    const el = boardScrollRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

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

  // Search: match task title, vehicle plate, or vehicle model
  const searchFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return tasks
    const vById = new Map(vehicles.map((v) => [v.id, v]))
    return tasks.filter((t) => {
      if (t.title.toLowerCase().includes(q)) return true
      const v = t.vehicleId ? vById.get(t.vehicleId) : null
      if (!v) return false
      return v.plate.toLowerCase().includes(q) || v.model.toLowerCase().includes(q)
    })
  }, [tasks, vehicles, searchQuery])

  // Filtered tasks
  const filtered = useMemo(() => searchFiltered.filter((t) => assigneeFilter === 'all' || t.assigneeId === assigneeFilter), [searchFiltered, assigneeFilter])

  // Sort: priority (high→low), then title (A→Z), then plate number (numeric low→high)
  const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 0, medium: 1, low: 2 }
  const sortTasks = (list: Task[]) => [...list].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 9
    const pb = PRIORITY_ORDER[b.priority] ?? 9
    if (pa !== pb) return pa - pb
    const titleCmp = (a.title || '').localeCompare(b.title || '')
    if (titleCmp !== 0) return titleCmp
    // Sort by plate number as numeric tiebreaker
    const plateA = a.vehicleId ? vehiclesMap.get(a.vehicleId) ?? '' : ''
    const plateB = b.vehicleId ? vehiclesMap.get(b.vehicleId) ?? '' : ''
    const numA = parseInt(plateA, 10)
    const numB = parseInt(plateB, 10)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    return plateA.localeCompare(plateB)
  })

  const todoTasks = useMemo(() => sortTasks(filtered.filter((t) => t.status === 'todo' && !t.deferred)), [filtered])
  const deferredTasks = useMemo(() => sortTasks(filtered.filter((t) => t.status === 'todo' && t.deferred)), [filtered])
  const doingTasks = useMemo(() => sortTasks(filtered.filter((t) => t.status === 'doing')), [filtered])
  const doneTasks = useMemo(() => sortTasks(filtered.filter((t) => t.status === 'done')), [filtered])

  const sectionTasks: Record<WorkSection, Task[]> = { todo: todoTasks, deferred: deferredTasks, doing: doingTasks, done: doneTasks }

  // Read-only summary of incomplete tasks — updates automatically with Zustand
  const summaryGroups = useMemo(() => buildTaskSummary(tasks), [tasks])

  function handleDragStart(_e: React.DragEvent, taskId: string) { dragTaskIdRef.current = taskId }
  function handleDrop(section: WorkSection) {
    return (e: React.DragEvent) => {
      e.preventDefault()
      const taskId = dragTaskIdRef.current
      dragTaskIdRef.current = null
      if (!taskId) return
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return

      if (section === 'deferred') {
        // Deferred stays "chưa làm" — never becomes done, never triggers checkSheet sync
        if (task.status === 'todo' && task.deferred) return
        updateTask(taskId, { status: 'todo', deferred: true })
        return
      }

      if (task.status === section && !task.deferred) return
      updateTask(taskId, { status: section, deferred: false })
    }
  }

  function resetAddForm() {
    setNewTitle(''); setNewPriority('medium'); setNewStatus('todo'); setNewVehicleId('')
    setNewDueDate(''); setNewDueTime('')
  }

  function handleAddTask() {
    if (!newTitle.trim()) return
    addTask({ id: uid('task'), title: newTitle.trim(), priority: newPriority, status: newStatus, vehicleId: newVehicleId || null, assigneeId: null, dueDate: newDueDate || null, dueTime: newDueTime || null, createdAt: new Date().toISOString() })
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
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input w-56 pl-9"
              placeholder="Tìm nhiệm vụ, biển số..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:text-slate-600" title="Xoá tìm kiếm">
                <X size={14} />
              </button>
            )}
          </div>
          <select className="input w-44" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="all">Tất cả nhân viên</option>
            {employees.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
          </select>
          {taskPerms.canCreate && (
            <button className="btn-primary" onClick={() => { resetAddForm(); setShowAddDrawer(true) }}><Plus size={16} /> Thêm nhiệm vụ</button>
          )}
        </div>
      </div>

      {/* Task Summary */}
      <TaskSummary groups={summaryGroups} onDetail={setSummaryDetailGroup} />

      {/* Horizontal scroll controls — between summary and board */}
      <div className="mb-2 flex items-center justify-between gap-3 md:hidden">
        <span className="text-xs text-slate-400">Vuốt ngang để xem các cột</span>
        <div className="flex items-center gap-2">
          <button onClick={() => scrollBoard(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50" aria-label="Cuộn trái">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => scrollBoard(1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50" aria-label="Cuộn phải">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div ref={boardScrollRef} className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none">
        {SECTION_CONFIG.map((section) => {
          const tasksInSection = sectionTasks[section.key]
          return (
            <div key={section.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop(section.key)}
              className="flex w-full shrink-0 snap-start flex-col rounded-2xl p-4 transition-all duration-200 md:w-80 md:snap-none"
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
                    <option value="high">Làm gấp / Giao ngay _ 5⭐</option><option value="medium">Ưu tiên hơn _ 4⭐</option><option value="low">Cứ từ từ _ 3⭐</option>
                  </select></div>
                  <div><label className="label">Trạng thái</label><select className="input w-full" value={newStatus} onChange={(e) => setNewStatus(e.target.value as TaskStatus)}>
                    <option value="todo">Chưa làm</option><option value="doing">Đang làm</option><option value="done">Đã hoàn thành</option>
                  </select></div>
                </div>
                <div><label className="label">Xe liên quan</label><select className="input w-full" value={newVehicleId} onChange={(e) => setNewVehicleId(e.target.value)}>
                  <option value="">Không có xe</option>
                  {[...vehicles].sort((a, b) => a.plate.localeCompare(b.plate)).map((v) => (<option key={v.id} value={v.id}>{v.plate} - {v.model}</option>))}
                </select></div>
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

      {/* Task Summary Detail */}
      {summaryDetailGroup && (
        <TaskSummaryDetail
          group={summaryDetailGroup}
          vehicles={vehicles}
          employees={employees}
          onClose={() => setSummaryDetailGroup(null)}
        />
      )}
    </div>
  )
}
