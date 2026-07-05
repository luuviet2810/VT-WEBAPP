import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  AttendanceEntry,
  CheckSheet,
  EXTERIOR_SPOTS,
  Employee,
  ExteriorCheck,
  MoveLog,
  Notification,
  Position,
  Settings,
  Task,
  TaskActivityLogEntry,
  Vehicle,
} from '../types'
import { todayISO, uid } from '../utils/format'

function emptyExterior(): ExteriorCheck {
  const out = {} as ExteriorCheck
  EXTERIOR_SPOTS.forEach(([key]) => {
    out[key] = { condition: 'good' }
  })
  return out
}

const seedSettings: Settings = {
  workStartHour: '08:30',
  workEndHour: '17:30',
  workHoursPerDay: 8,
  gpsRadiusMeters: 200,
  overtimeMultiplier: 1.5,
  nightOvertimeMultiplier: 2.0,
  latePenalty30Min: true,
  companyName: 'Gara xe của tôi',
  companyPhone: '',
}

const seedPositions: Position[] = [
  { id: 'pos_a', name: 'Song nưng dưới này', order: 0 },
  { id: 'pos_b', name: 'Song nưng trên này', order: 1 },
  { id: 'pos_c', name: 'Rửa máy', order: 2 },
  { id: 'pos_d', name: 'Song nưng chốt', order: 3 },
  { id: 'pos_e', name: 'Đánh bóng Wolpyong', order: 4 },
]

const seedEmployees: Employee[] = [
  { id: 'emp_viet', name: 'LƯU VĂN VIỆT', phone: '01076565642', isAdmin: true, disabled: false },
  { id: 'emp_thu', name: 'LINH THƯ', phone: '', isAdmin: true, disabled: false },
]

const seedVehicles: Vehicle[] = [
  {
    id: 'veh_k5',
    plate: '9999',
    model: 'K5',
    year: 2020,
    fuelType: 'gasoline',
    displacement: '2.0L',
    mileage: '15 vạn km',
    color: 'Trắng',
    costPrice: 10000000,
    sellPrice: 13000000,
    status: 'available',
    positionId: 'pos_d',
    assigneeId: null,
    note: '',
    images: [],
    documents: [],
    createdAt: todayISO(),
    updatedAt: todayISO(),
  },
  {
    id: 'veh_sonata',
    plate: '1234',
    model: 'Sonata',
    year: 2012,
    fuelType: 'gasoline',
    displacement: '2.0L',
    mileage: '15 vạn km',
    color: 'Đen',
    costPrice: 2000000,
    sellPrice: 5000000,
    status: 'available',
    positionId: 'pos_e',
    assigneeId: 'emp_viet',
    note: '',
    images: [],
    documents: [],
    createdAt: todayISO(),
    updatedAt: todayISO(),
  },
  {
    id: 'veh_sm5',
    plate: '4455',
    model: 'Sm5',
    year: 2011,
    fuelType: 'diesel',
    displacement: '2.0L',
    mileage: '12 vạn km',
    color: 'Bạc',
    costPrice: 1000000,
    sellPrice: 3000000,
    status: 'sold',
    positionId: 'pos_a',
    assigneeId: null,
    note: '',
    images: [],
    documents: [],
    createdAt: todayISO(),
    updatedAt: todayISO(),
  },
]

const seedTasks: Task[] = [
  {
    id: uid('task'),
    title: 'Tháo biển tất cả',
    checklist: [
      { id: uid('chk'), text: 'Kiểm tra biển trước', done: true },
      { id: uid('chk'), text: 'Tháo biển', done: false },
    ],
    priority: 'medium',
    status: 'todo',
    dueDate: '2026-06-28',
    dueTime: '17:00',
    createdAt: todayISO(),
  },
  { id: uid('task'), title: 'Đánh xe bãi lớn ra 1186, 5115', checklist: [], priority: 'medium', status: 'todo', createdAt: todayISO() },
  { id: uid('task'), title: 'Xuất xe 6027', checklist: [], priority: 'low', status: 'todo', dueDate: '2026-07-01', createdAt: todayISO() },
  {
    id: uid('task'),
    title: 'Chụp ảnh xe hqua 1994, ....',
    checklist: [
      { id: uid('chk'), text: 'Chụp ngoại thất', done: true },
      { id: uid('chk'), text: 'Chụp nội thất', done: true },
      { id: uid('chk'), text: 'Upload ảnh', done: false },
    ],
    priority: 'medium',
    status: 'done',
    createdAt: todayISO(),
  },
  { id: uid('task'), title: 'Chờ 1 xe về đánh lên đổi 3 xe', checklist: [], priority: 'medium', status: 'done', dueDate: '2026-06-23', createdAt: todayISO() },
  { id: uid('task'), title: '9028, 3118 đánh bóng', checklist: [], priority: 'medium', status: 'done', createdAt: todayISO() },
  { id: uid('task'), title: 'Xuất xe 0556', checklist: [], priority: 'high', status: 'done', dueDate: '2026-06-23', createdAt: todayISO() },
  { id: uid('task'), title: 'Đánh xe dập về', checklist: [], priority: 'urgent', status: 'done', dueDate: '2026-06-23', createdAt: todayISO() },
  { id: uid('task'), title: 'Rửa máy', checklist: [], priority: 'medium', status: 'done', createdAt: todayISO() },
  { id: uid('task'), title: 'Đánh xe vào bãi lớn', checklist: [], priority: 'high', status: 'done', assigneeId: 'emp_viet', createdAt: todayISO() },
  { id: uid('task'), title: 'Rửa máy', checklist: [], priority: 'medium', status: 'done', createdAt: todayISO() },
  { id: uid('task'), title: 'Đánh lên đánh bóng', checklist: [], priority: 'medium', status: 'done', createdAt: todayISO() },
]

const seedMoveLogs: MoveLog[] = [
  { id: uid('log'), vehicleId: 'veh_sonata', fromPositionId: 'pos_c', toPositionId: 'pos_e', employeeId: 'emp_thu', createdAt: '2026-06-22T17:36:00' },
  { id: uid('log'), vehicleId: 'veh_sonata', fromPositionId: 'pos_a', toPositionId: 'pos_c', employeeId: 'emp_thu', createdAt: '2026-06-22T17:36:00' },
  { id: uid('log'), vehicleId: 'veh_k5', fromPositionId: 'pos_b', toPositionId: 'pos_d', employeeId: 'emp_viet', createdAt: '2026-06-22T14:07:00' },
  { id: uid('log'), vehicleId: 'veh_sm5', fromPositionId: null, toPositionId: 'pos_a', employeeId: 'emp_viet', createdAt: '2026-06-20T17:13:00' },
]

const seedNotifications: Notification[] = [
  {
    id: uid('notif'),
    type: 'task_created',
    title: 'Nhiệm vụ mới',
    body: 'LƯU VĂN VIỆT vừa tạo nhiệm vụ "Tháo biển tất cả"',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: uid('notif'),
    type: 'vehicle_status',
    title: 'Xe đổi trạng thái',
    body: 'Sm5 đã chuyển sang "Đã bán"',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
]

interface StoreState {
  vehicles: Vehicle[]
  positions: Position[]
  tasks: Task[]
  employees: Employee[]
  moveLogs: MoveLog[]
  checkSheets: CheckSheet[]
  attendance: AttendanceEntry[]
  notifications: Notification[]
  settings: Settings
  taskActivityLogs: TaskActivityLogEntry[]
  currentEmployeeId: string

  // Vehicles
  addVehicle: (v: Partial<Vehicle>) => string
  updateVehicle: (id: string, patch: Partial<Vehicle>) => void
  deleteVehicle: (id: string) => void
  moveVehicle: (id: string, toPositionId: string) => void

  // Tasks
  addTask: (t: Partial<Task>) => void
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  toggleTaskChecklistItem: (taskId: string, itemId: string) => void
  addTaskActivity: (taskId: string, action: string, employeeId?: string | null) => void

  // Employees
  updateEmployee: (id: string, patch: Partial<Employee>) => void
  setCurrentEmployee: (id: string) => void

  // Positions
  addPosition: (name: string) => void
  updatePosition: (id: string, patch: Partial<Position>) => void
  deletePosition: (id: string) => void

  // Check sheets
  addCheckSheet: (c: Omit<CheckSheet, 'id' | 'createdAt'>) => void
  updateCheckSheet: (id: string, patch: Partial<CheckSheet>) => void

  // Attendance
  checkIn: (employeeId: string) => void
  checkOut: (employeeId: string) => void
  updateAttendanceEntry: (id: string, patch: Partial<AttendanceEntry>) => void

  // Notifications
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void

  // Settings
  updateSettings: (patch: Partial<Settings>) => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      vehicles: seedVehicles,
      positions: seedPositions,
      tasks: seedTasks,
      employees: seedEmployees,
      moveLogs: seedMoveLogs,
      checkSheets: [],
      attendance: [],
      notifications: seedNotifications,
      settings: seedSettings,
      taskActivityLogs: [],
      currentEmployeeId: 'emp_viet',

      addVehicle: (v) => {
        const id = uid('veh')
        const vehicle: Vehicle = {
          id,
          plate: v.plate || '',
          model: v.model || '',
          year: v.year,
          fuelType: v.fuelType,
          displacement: v.displacement,
          mileage: v.mileage,
          color: v.color,
          costPrice: v.costPrice,
          sellPrice: v.sellPrice,
          status: v.status || 'available',
          positionId: v.positionId ?? null,
          assigneeId: v.assigneeId ?? null,
          note: v.note || '',
          images: v.images || [],
          documents: v.documents || [],
          createdAt: todayISO(),
          updatedAt: todayISO(),
        }
        set((s) => ({ vehicles: [vehicle, ...s.vehicles] }))
        const emp = s.employees.find((e) => e.id === s.currentEmployeeId)
        get().addNotification({ type: 'vehicle_added', title: 'Xe mới được thêm', body: `${emp?.name || 'Ai đó'} vừa thêm xe "${vehicle.model}" (${vehicle.plate})` })
        return id
      },

      updateVehicle: (id, patch) => {
        const before = get().vehicles.find((v) => v.id === id)
        set((s) => ({
          vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...patch, updatedAt: todayISO() } : v)),
        }))
        const after = get().vehicles.find((v) => v.id === id)
        if (patch.status && before && patch.status !== before.status) {
          const labels: Record<string, string> = { available: 'Chưa bán', deposited: 'Đã cọc', sold: 'Đã bán' }
          get().addNotification({ type: 'vehicle_status', title: 'Xe đổi trạng thái', body: `${after?.model} (${after?.plate}) chuyển sang "${labels[patch.status]}"` })
        }
      },

      deleteVehicle: (id) => {
        set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) }))
      },

      moveVehicle: (id, toPositionId) => {
        const vehicle = get().vehicles.find((v) => v.id === id)
        if (!vehicle) return
        const fromPositionId = vehicle.positionId ?? null
        if (fromPositionId === toPositionId) return
        set((s) => ({
          vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, positionId: toPositionId, updatedAt: todayISO() } : v)),
          moveLogs: [{ id: uid('log'), vehicleId: id, fromPositionId, toPositionId, employeeId: s.currentEmployeeId, createdAt: todayISO() }, ...s.moveLogs],
        }))
      },

      addTask: (t) => {
        const task: Task = {
          id: uid('task'),
          title: t.title || '',
          description: t.description || '',
          checklist: t.checklist || [],
          priority: t.priority || 'medium',
          status: t.status || 'todo',
          assigneeId: t.assigneeId ?? null,
          vehicleId: t.vehicleId ?? null,
          dueDate: t.dueDate ?? null,
          dueTime: t.dueTime ?? null,
          createdAt: todayISO(),
        }
        set((s) => ({ tasks: [task, ...s.tasks] }))
        const emp = s.employees.find((e) => e.id === s.currentEmployeeId)
        get().addNotification({ type: 'task_created', title: 'Nhiệm vụ mới', body: `${emp?.name || 'Ai đó'} vừa tạo nhiệm vụ "${task.title}"` })
      },

      updateTask: (id, patch) => {
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
        const emp = get().employees.find((e) => e.id === get().currentEmployeeId)
        const task = get().tasks.find((t) => t.id === id)
        if (task) {
          get().addTaskActivity(id, `${emp?.name || 'Ai đó'} đã cập nhật nhiệm vụ`, get().currentEmployeeId)
        }
      },

      deleteTask: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
      },

      toggleTaskChecklistItem: (taskId, itemId) => {
        const task = get().tasks.find((t) => t.id === taskId)
        const item = task?.checklist.find((i) => i.id === itemId)
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id !== taskId
              ? t
              : { ...t, checklist: (t.checklist || []).map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) }
          ),
        }))
        const emp = get().employees.find((e) => e.id === get().currentEmployeeId)
        get().addTaskActivity(taskId, `${emp?.name || 'Ai đó'} ${item && !item.done ? 'hoàn thành' : 'bỏ hoàn thành'} "${item?.text}"`, get().currentEmployeeId)
        const updated = get().tasks.find((t) => t.id === taskId)
        if (updated && updated.checklist.every((i) => i.done)) {
          get().addNotification({ type: 'task_done', title: 'Nhiệm vụ hoàn thành', body: `"${updated.title}" — tất cả checklist đã xong!` })
        }
      },

      addTaskActivity: (taskId, action, employeeId) => {
        set((s) => ({
          taskActivityLogs: [{ id: uid('act'), taskId, action, employeeId: employeeId || s.currentEmployeeId, createdAt: todayISO() }, ...s.taskActivityLogs],
        }))
      },

      updateEmployee: (id, patch) => {
        set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
        if (patch.isAdmin !== undefined) {
          const emp = get().employees.find((e) => e.id === id)
          get().addNotification({ type: 'system', title: 'Thay đổi quyền Admin', body: `Tài khoản "${emp?.name}" đã ${patch.isAdmin ? ' được cấp quyền Admin' : ' bị gỡ quyền Admin'}` })
        }
      },

      setCurrentEmployee: (id) => set({ currentEmployeeId: id }),

      addPosition: (name) => {
        set((s) => ({ positions: [...s.positions, { id: uid('pos'), name, order: s.positions.length }] }))
      },

      updatePosition: (id, patch) => {
        set((s) => ({ positions: s.positions.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
      },

      deletePosition: (id) => {
        const vehiclesAtPosition = get().vehicles.filter((v) => v.positionId === id)
        if (vehiclesAtPosition.length > 0) {
          alert(`Không thể xoá: còn ${vehiclesAtPosition.length} xe tại vị trí này.`)
          return
        }
        set((s) => ({ positions: s.positions.filter((p) => p.id !== id) }))
      },

      addCheckSheet: (c) => {
        console.log('🔵 [STORE] addCheckSheet được gọi với:', JSON.stringify(c, null, 2))
        const sheet: CheckSheet = { ...c, id: uid('chk'), createdAt: todayISO() }
        console.log('🔵 [STORE] Sheet sẽ được thêm:', JSON.stringify(sheet, null, 2))
        set((s) => ({ checkSheets: [sheet, ...s.checkSheets] }))
        console.log('🔵 [STORE] checkSheets sau khi set:', JSON.stringify(get().checkSheets, null, 2))
      },

      updateCheckSheet: (id, patch) => {
        console.log('🔵 [STORE] updateCheckSheet được gọi với id:', id)
        set((s) => ({
          checkSheets: s.checkSheets.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }))
        console.log('🔵 [STORE] checkSheets sau khi update:', JSON.stringify(get().checkSheets, null, 2))
      },

      checkIn: (employeeId) => {
        const dateStr = new Date().toISOString().slice(0, 10)
        const timeStr = new Date().toTimeString().slice(0, 5)
        set((s) => {
          const existing = s.attendance.find((a) => a.employeeId === employeeId && a.date === dateStr)
          if (existing) {
            return { attendance: s.attendance.map((a) => (a.id === existing.id ? { ...a, checkIn: a.checkIn || timeStr } : a)) }
          }
          return { attendance: [{ id: uid('att'), employeeId, date: dateStr, checkIn: timeStr, checkOut: null }, ...s.attendance] }
        })
      },

      checkOut: (employeeId) => {
        const dateStr = new Date().toISOString().slice(0, 10)
        const timeStr = new Date().toTimeString().slice(0, 5)
        set((s) => {
          const existing = s.attendance.find((a) => a.employeeId === employeeId && a.date === dateStr)
          if (existing) {
            return { attendance: s.attendance.map((a) => (a.id === existing.id ? { ...a, checkOut: timeStr } : a)) }
          }
          return { attendance: [{ id: uid('att'), employeeId, date: dateStr, checkIn: null, checkOut: timeStr }, ...s.attendance] }
        })
      },

      updateAttendanceEntry: (id, patch) => {
        set((s) => ({ attendance: s.attendance.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))
        const entry = get().attendance.find((a) => a.id === id)
        if (entry) {
          const emp = get().employees.find((e) => e.id === entry.employeeId)
          get().addNotification({ type: 'attendance_edited', title: 'Chấm công được chỉnh sửa', body: `Admin vừa sửa giờ của ${emp?.name} ngày ${entry.date}` })
        }
      },

      addNotification: (n) => {
        const notif: Notification = { ...n, id: uid('notif'), read: false, createdAt: todayISO() }
        set((s) => ({ notifications: [notif, ...s.notifications] }))
      },

      markNotificationRead: (id) => {
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
      },

      markAllNotificationsRead: () => {
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
      },

      updateSettings: (patch) => {
        set((s) => ({ settings: { ...s.settings, ...patch } }))
      },
    }),
    { name: 'gara-manager-storage' }
  )
)

export function emptyExteriorCheck() {
  return emptyExterior()
}
