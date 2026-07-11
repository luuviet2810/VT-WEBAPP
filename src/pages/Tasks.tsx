import { useMemo, useState, useEffect, useRef } from 'react'
import { Plus, X, Trash2, GripVertical } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useTaskPermissions } from '../rbac/usePermissions'
import { Badge } from '../components/ui'
import type { Task, TaskChecklistItem, TaskPriority, TaskStatus } from '../types'
import { uid } from '../utils/format'
import TaskDrawer from '../components/tasks/TaskDrawer'
import VehicleTaskCard, { type VehicleGroup } from '../components/tasks/VehicleTaskCard'

type WorkSection = 'todo' | 'doing' | 'done'

const SECTION_CONFIG: { key: WorkSection; label: string; icon: string; tone: 'slate' | 'orange' | 'green' }[] = [
  { key: 'todo', label: 'Chưa làm', icon: '🚗', tone: 'slate' },
  { key: 'doing', label: 'Đang làm', icon: '🟡', tone: 'orange' },
  { key: 'done', label: 'Đã hoàn thành', icon: '✅', tone: 'green' },
]

export default function Tasks() {
  const tasks = useStore((s) => s.tasks)
  const employees = useStore((s) => s.employees)
  const vehicles = useStore((s) => s.vehicles)
  const positions = useStore((s) => s.positions)
  const toggleTaskChecklistItem = useStore((s) => s.toggleTaskChecklistItem)
  const updateTask = useStore((s) => s.updateTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const addTask = useStore((s) => s.addTask)
  const taskPerms = useTaskPermissions()
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)

  // Add-task drawer
  const [showAddDrawer, setShowAddDrawer] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const [newStatus, setNewStatus] = useState<TaskStatus>('todo')
  const [newVehicleId, setNewVehicleId] = useState('')
  const [newChecklist, setNewChecklist] = useState<TaskChecklistItem[]>([{ id: uid('chk'), text: '', done: false }])
  const [newDueDate, setNewDueDate] = useState('')
  const [newDueTime, setNewDueTime] = useState('')

  // Drag state
  const dragVehicleIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!showAddDrawer) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShowAddDrawer(false); resetAddForm() } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showAddDrawer])

  const filtered = useMemo(
    () => tasks.filter((t) => assigneeFilter === 'all' || t.assigneeId === assigneeFilter),
    [tasks, assigneeFilter]
  )

  // Group tasks by vehicle, compute section
  const groups = useMemo(() => {
    const map = new Map<string, typeof tasks>()
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

      const vehicle = vehicleId === '__unassigned__' ? null : vehicles.find((v) => v.id === vehicleId) ?? null
      const position = vehicle ? positions.find((p) => p.id === vehicle.positionId) : undefined
      const positionName = position?.name ?? null

      result.push({ vehicleId, vehicle, positionName, tasks: groupedTasks, total, done, section })
    }
    return result
  }, [filtered, vehicles, positions])

  const sectionGroups = useMemo(() => {
    const map: Record<WorkSection, VehicleGroup[]> = { todo: [], doing: [], done: [] }
    for (const g of groups) map[g.section].push(g)
    return map
  }, [groups])

  // DnD handlers
  function handleDragStart(_e: React.DragEvent, vehicleId: string) {
    dragVehicleIdRef.current = vehicleId
  }

  function handleColumnDrop(section: WorkSection) {
    return (e: React.DragEvent) => {
      e.preventDefault()
      const vehicleId = dragVehicleIdRef.current
      dragVehicleIdRef.current = null
      if (!vehicleId) return

      // Find the vehicle group
      const group = groups.find((g) => g.vehicleId === vehicleId)
      if (!group || group.section === section) return

      // Update all unfinished tasks in this vehicle to the new section's status
      for (const t of group.tasks) {
        if (t.status !== 'done') {
          const newStatus: TaskStatus = section === 'todo' ? 'todo' : section === 'doing' ? 'doing' : 'done'
          if (t.status !== newStatus) updateTask(t.id, { status: newStatus })
        }
      }
    }
  }

  function handleColumnDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function resetAddForm() {
    setNewTitle('')
    setNewChecklist([{ id: uid('chk'), text: '', done: false }])
    setNewPriority('medium')
    setNewStatus('todo')
    setNewVehicleId('')
    setNewDueDate('')
    setNewDueTime('')
  }

  function handleAddTask() {
    if (!newTitle.trim()) return
    const checklist = newChecklist.map((i) => ({ ...i, text: i.text.trim() })).filter((i) => i.text)
    addTask({
      id: uid('task'),
      title: newTitle.trim(),
      checklist,
      priority: newPriority,
      status: newStatus,
      vehicleId: newVehicleId || null,
      assigneeId: null,
      dueDate: newDueDate || null,
      dueTime: newDueTime || null,
      createdAt: new Date().toISOString(),
    })
    setShowAddDrawer(false)
    resetAddForm()
  }

  return (
    <div className="pb-16 md:pb-0">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nhiệm vụ</h1>
          <p className="mt-1 text-sm text-slate-500">Kéo thả giữa các cột để cập nhật trạng thái</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select className="input w-44" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="all">Tất cả nhân viên</option>
            {employees.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
          </select>
          {taskPerms.canCreate && (
            <button className="btn-primary" onClick={() => { resetAddForm(); setShowAddDrawer(true) }}>
              <Plus size={16} /> Thêm nhiệm vụ
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-5 overflow-x-auto pb-4">
        {SECTION_CONFIG.map((section) => {
          const cards = sectionGroups[section.key]

          return (
            <div
              key={section.key}
              onDragOver={handleColumnDragOver}
              onDrop={handleColumnDrop(section.key)}
              className="flex w-80 shrink-0 flex-col rounded-2xl border-2 p-4 transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.5)', borderColor: 'rgba(0,0,0,0.06)' }}
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">{section.icon} {section.label}</span>
                <Badge tone={section.tone}>{cards.length}</Badge>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-3 min-h-[120px]">
                {cards.length === 0 && (
                  <div className="flex items-center justify-center rounded-xl border-2 border-dashed py-8 text-xs text-slate-400" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                    Kéo xe vào đây
                  </div>
                )}
                {cards.map((group) => (
                  <div
                    key={group.vehicleId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, group.vehicleId)}
                  >
                    <VehicleTaskCard
                      group={group}
                      onClick={() => setSelectedVehicleId(group.vehicleId)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Task Drawer (lightweight — add/edit/delete only) */}
      <TaskDrawer
        open={!!selectedVehicleId}
        onClose={() => setSelectedVehicleId(null)}
        selectedVehicleId={selectedVehicleId}
        groups={groups}
        onToggleChecklist={toggleTaskChecklistItem}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
        onAddTask={addTask}
        employees={employees.map((e) => ({ id: e.id, name: e.name }))}
        vehicles={vehicles.map((v) => ({ id: v.id, plate: v.plate }))}
        positionName={groups.find((g) => g.vehicleId === selectedVehicleId)?.positionName ?? null}
      />

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
                <div>
                  <label className="label">Tên công việc *</label>
                  <input className="input w-full" placeholder="VD: Kiểm tra xe..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Mức ưu tiên</label>
                    <select className="input w-full" value={newPriority} onChange={(e) => setNewPriority(e.target.value as TaskPriority)}>
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                      <option value="urgent">Khẩn cấp</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Trạng thái</label>
                    <select className="input w-full" value={newStatus} onChange={(e) => setNewStatus(e.target.value as TaskStatus)}>
                      <option value="todo">Chưa làm</option>
                      <option value="doing">Đang làm</option>
                      <option value="done">Đã hoàn thành</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Xe liên quan</label>
                  <select className="input w-full" value={newVehicleId} onChange={(e) => setNewVehicleId(e.target.value)}>
                    <option value="">Không có xe</option>
                    {[...vehicles].sort((a, b) => a.plate.localeCompare(b.plate)).map((v) => (
                      <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Các bước kiểm tra</label>
                  <div className="space-y-2">
                    {newChecklist.map((item, idx) => (
                      <div key={item.id} className="flex gap-2">
                        <input className="input flex-1" placeholder="Bước kiểm tra" value={item.text}
                          onChange={(e) => setNewChecklist((rows) => rows.map((r, i) => (i === idx ? { ...r, text: e.target.value } : r)))} />
                        <button type="button" className="btn-icon shrink-0"
                          onClick={() => setNewChecklist((rows) => (rows.length === 1 ? rows : rows.filter((_, i) => i !== idx)))}><Trash2 size={15} /></button>
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
    </div>
  )
}
