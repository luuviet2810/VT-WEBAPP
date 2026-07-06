// ====== TASKS PAGE - Vehicle Work Board ======

import { useMemo, useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Car, Plus, User } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, Modal } from '../components/ui'
import { Employee, Position, Task, TaskChecklistItem, TaskPriority, TaskStatus, Vehicle } from '../types'
import { formatDate, uid } from '../utils/format'
import clsx from 'clsx'

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
}

type WorkSection = 'todo' | 'doing' | 'done'

const SECTION_CONFIG: { key: WorkSection; label: string; icon: string; tone: 'slate' | 'orange' | 'green' }[] = [
  { key: 'todo', label: 'Chưa làm', icon: '🚗', tone: 'slate' },
  { key: 'doing', label: 'Đang làm', icon: '🟡', tone: 'orange' },
  { key: 'done', label: 'Đã hoàn thành', icon: '✅', tone: 'green' },
]

type VehicleGroup = {
  vehicleId: string
  vehicle: Vehicle | null
  tasks: Task[]
  total: number
  done: number
  section: WorkSection
}

export default function Tasks() {
  const tasks = useStore((s) => s.tasks)
  const employees = useStore((s) => s.employees)
  const vehicles = useStore((s) => s.vehicles)
  const positions = useStore((s) => s.positions)
  const toggleTaskChecklistItem = useStore((s) => s.toggleTaskChecklistItem)
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = useMemo(
    () => tasks.filter((t) => assigneeFilter === 'all' || t.assigneeId === assigneeFilter),
    [tasks, assigneeFilter]
  )

  const groups = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of filtered) {
      const key = t.vehicleId || '__unassigned__'
      const list = map.get(key)
      if (list) list.push(t)
      else map.set(key, [t])
    }

    const result: VehicleGroup[] = []
    for (const [vehicleId, groupedTasks] of map) {
      const total = groupedTasks.length
      const done = groupedTasks.filter((t) => t.status === 'done').length
      const todo = groupedTasks.filter((t) => t.status === 'todo').length
      const doing = groupedTasks.filter((t) => t.status === 'doing').length
      let section: WorkSection
      if (total > 0 && done === total) section = 'done'
      else if (doing > 0 || (todo > 0 && done > 0)) section = 'doing'
      else section = 'todo'

      const vehicle =
        vehicleId === '__unassigned__'
          ? null
          : vehicles.find((v) => v.id === vehicleId) ?? null

      result.push({ vehicleId, vehicle, tasks: groupedTasks, total, done, section })
    }
    return result
  }, [filtered, vehicles])

  return (
    <div className="pb-16 md:pb-0">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nhiệm vụ</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi tiến độ theo từng xe</p>
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
          <button className="btn-primary hidden md:flex" onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            Giao việc
          </button>
        </div>
      </div>

      {/* Vehicle Work Board */}
      <div className="flex flex-col gap-6">
        {SECTION_CONFIG.map((section) => {
          const sectionGroups = groups.filter((g) => g.section === section.key)

          return (
            <WorkBoardSection key={section.key} section={section} groups={sectionGroups}>
              {sectionGroups.map((group) => (
                <WorkBoardVehicleCard
                  key={group.vehicleId}
                  group={group}
                  positions={positions}
                  employees={employees}
                  onToggleChecklist={(taskId, itemId) => toggleTaskChecklistItem(taskId, itemId)}
                />
              ))}
            </WorkBoardSection>
          )
        })}
      </div>

      {/* Create Task Modal */}
      <AssignTaskModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Mobile FAB */}
      <button
        className="fixed bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-brand-700 hover:shadow-xl active:scale-95 md:hidden animate-fade-in"
        onClick={() => setModalOpen(true)}
        title="Giao việc"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </div>
  )
}

function WorkBoardSection({
  section,
  groups,
  children,
}: {
  section: { key: WorkSection; label: string; icon: string; tone: 'slate' | 'orange' | 'green' }
  groups: VehicleGroup[]
  children: React.ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, scrollLeft: 0 })
  const nodeRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    nodeRef.current = node

    function onWheel(event: WheelEvent) {
      const current = nodeRef.current
      if (!current || !(event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX))) return
      event.preventDefault()
      current.scrollTo({ left: current.scrollLeft + event.deltaY, behavior: 'smooth' })
    }

    function onMouseDown(event: MouseEvent) {
      const current = nodeRef.current
      if (!current || (event.target as HTMLElement).closest('a, button, input, label')) return
      isDragging.current = true
      dragStart.current = { x: event.clientX, scrollLeft: current.scrollLeft }
      current.style.userSelect = 'none'
    }

    function onMouseMove(event: MouseEvent) {
      const current = nodeRef.current
      if (!current || !isDragging.current) return
      const dx = event.clientX - dragStart.current.x
      current.scrollLeft = dragStart.current.scrollLeft - dx
    }

    function onMouseUp() {
      isDragging.current = false
      if (nodeRef.current) nodeRef.current.style.userSelect = ''
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    node.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      node.removeEventListener('wheel', onWheel)
      node.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      nodeRef.current = null
    }
  }, [])

  return (
    <div className="animate-fade-in-up">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700">{section.icon} {section.label}</span>
        <Badge tone={section.tone}>{groups.length}</Badge>
      </div>

      <div
        ref={scrollRef}
        className="snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex gap-4 p-[1px]">
          {children}
        </div>
      </div>
    </div>
  )
}

function WorkBoardVehicleCard({
  group,
  positions,
  employees,
  onToggleChecklist,
}: {
  group: VehicleGroup
  positions: Position[]
  employees: Employee[]
  onToggleChecklist: (taskId: string, itemId: string) => void
}) {
  const { vehicle, tasks, total, done } = group
  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  const image = vehicle?.images?.[0]
  const position = vehicle ? positions.find((p) => p.id === vehicle.positionId) : undefined
  const assignee = vehicle?.assigneeId ? employees.find((e) => e.id === vehicle.assigneeId) : undefined

  const prevSectionRef = useRef(group.section)
  const [sectionClass, setSectionClass] = useState('')

  useEffect(() => {
    if (prevSectionRef.current !== group.section) {
      setSectionClass('animate-slide-in-right')
      const timer = window.setTimeout(() => setSectionClass(''), 500)
      prevSectionRef.current = group.section
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [group.section])

  return (
    <div className={`w-[88vw] sm:w-[500px] md:w-[540px] shrink-0 snap-start ${sectionClass}`}>
      <div className="card flex h-[280px] md:h-[210px] flex-col md:flex-row overflow-hidden">
        {/* LEFT: Vehicle image */}
        <div className="hidden md:flex w-[28%] shrink-0 items-center justify-center bg-slate-50">
          {vehicle ? (
            <Link to={`/xe/${vehicle.id}`} className="block h-full w-full">
              <div className="flex h-full w-full items-center justify-center bg-slate-100">
                {image ? (
                  <img src={image} alt={vehicle.model} className="h-full w-full object-cover" />
                ) : (
                  <Car size={32} className="text-slate-300" />
                )}
              </div>
            </Link>
          ) : (
            <div className="px-3 text-sm font-semibold text-slate-500">Chưa có xe liên quan</div>
          )}
        </div>

        {/* CENTER: Vehicle info */}
        <div className="flex w-full md:w-[30%] shrink-0 flex-col justify-between md:border-l md:border-slate-100 p-3">
          <div className="space-y-1">
            <div className="text-base font-bold text-slate-900">{vehicle?.plate || '—'}</div>
            <div className="text-xs text-slate-500">{vehicle?.model}</div>
            <div className="text-xs text-slate-500">{position ? position.name : 'Chưa phân bổ'}</div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <User size={12} />
              <span className="truncate">{assignee?.name || 'Chưa phân công'}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{done}/{total} hoàn thành</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* RIGHT: Tasks */}
        <div className="flex w-full md:w-[42%] shrink-0 flex-col md:border-l md:border-slate-100">
          <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
            Nhiệm vụ
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar]:h-1">
            <div className="space-y-3">
              {tasks.map((task, idx) => (
                <div key={task.id} className="space-y-1">
                  <Link to={`/nhiem-vu/${task.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                    📋 {task.title}
                  </Link>
                  <div className="pl-5">
                    <div className="space-y-0.5">
                      {task.checklist.map((item) => (
                        <label key={item.id} className="flex cursor-pointer items-start gap-2">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => onToggleChecklist(task.id, item.id)}
                            className="mt-0.5 shrink-0 rounded border-slate-300 text-brand-600"
                          />
                          <span className={clsx('text-[11px] text-slate-600', item.done && 'text-slate-400 line-through')}>{item.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {idx < tasks.length - 1 && <div className="border-b border-dashed border-slate-100" />}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 px-3 py-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{done}/{total}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
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
                    ? key === 'urgent'
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : key === 'high'
                        ? 'border-orange-300 bg-orange-50 text-orange-700'
                        : key === 'medium'
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-slate-300 bg-slate-50 text-slate-700'
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
