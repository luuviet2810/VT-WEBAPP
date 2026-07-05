import { create } from 'zustand'
import {
  AttendanceEntry,
  CheckSheet,
  EXTERIOR_SPOTS,
  Employee,
  ExteriorCheck,
  Notification,
  Position,
  Settings,
  Task,
  TaskActivityLogEntry,
  Vehicle,
} from '../types'
import { todayISO, uid } from '../utils/format'
import * as vehicleService from '../services/vehicle.service'
import * as positionService from '../services/position.service'
import * as employeeService from '../services/employee.service'
import * as taskService from '../services/task.service'
import * as attendanceService from '../services/attendance.service'
import * as checksheetService from '../services/checksheet.service'
import * as notificationService from '../services/notification.service'
import * as moveLogService from '../services/moveLog.service'

function emptyExterior(): ExteriorCheck {
  const out = {} as ExteriorCheck
  EXTERIOR_SPOTS.forEach(([key]) => {
    out[key] = { condition: 'good' }
  })
  return out
}

const defaultSettings: Settings = {
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

// ====== INITIALIZE FROM SUPABASE ======
export async function initializeFromSupabase(): Promise<void> {
  console.log('🔵 [STORE] Initializing from Supabase...')
  try {
    const [vehicles, positions, employees, tasks, checkSheets, attendance, notifications] = await Promise.all([
      vehicleService.getVehicles().catch(() => []),
      positionService.getPositions().catch(() => []),
      employeeService.getEmployees().catch(() => []),
      taskService.getTasks().catch(() => []),
      checksheetService.getCheckSheets().catch(() => []),
      attendanceService.getAttendanceEntries().catch(() => []),
      notificationService.getNotifications().catch(() => []),
    ])

    console.log('🔵 [STORE] Loaded:', {
      vehicles: vehicles.length,
      positions: positions.length,
      employees: employees.length,
      tasks: tasks.length,
      checkSheets: checkSheets.length,
      attendance: attendance.length,
      notifications: notifications.length,
    })

    // Map vehicles from DB format (created_at) to app format (createdAt)
    const mappedVehicles = vehicles.map((v) => {
      const record = v as unknown as Record<string, unknown>
      return {
        ...v,
        createdAt: v.createdAt ?? (record.created_at as string) ?? todayISO(),
        updatedAt: v.updatedAt ?? (record.updated_at as string) ?? todayISO(),
      }
    })

    useStore.setState({
      vehicles: mappedVehicles,
      positions,
      employees,
      tasks,
      checkSheets,
      attendance,
      notifications,
      isInitialized: true,
    })
  } catch (err) {
    console.error('🔴 [STORE] Failed to initialize from Supabase:', err)
    useStore.setState({ isInitialized: true })
  }
}

// ====== INTERFACE ======
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
  isInitialized: boolean

  // Vehicles
  addVehicle: (v: Partial<Vehicle>) => string
  updateVehicle: (id: string, patch: Partial<Vehicle>) => Promise<void>
  deleteVehicle: (id: string) => Promise<void>
  moveVehicle: (id: string, toPositionId: string) => Promise<void>

  // Tasks
  addTask: (t: Partial<Task>) => Promise<void>
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleTaskChecklistItem: (taskId: string, itemId: string) => Promise<void>
  addTaskActivity: (taskId: string, action: string, employeeId?: string | null) => Promise<void>

  // Employees
  updateEmployee: (id: string, patch: Partial<Employee>) => Promise<void>
  setCurrentEmployee: (id: string) => void

  // Positions
  addPosition: (name: string) => Promise<void>
  updatePosition: (id: string, patch: Partial<Position>) => Promise<void>
  deletePosition: (id: string) => Promise<void>
  reorderPositions: (orderedIds: string[]) => Promise<void>

  // Check sheets
  addCheckSheet: (c: Omit<CheckSheet, 'id' | 'createdAt'>) => Promise<void>
  updateCheckSheet: (id: string, patch: Partial<CheckSheet>) => Promise<void>

  // Attendance
  checkIn: (employeeId: string) => Promise<void>
  checkOut: (employeeId: string) => Promise<void>
  updateAttendanceEntry: (id: string, patch: Partial<AttendanceEntry>) => Promise<void>

  // Notifications
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>

  // Settings
  updateSettings: (patch: Partial<Settings>) => void
}

// ====== STORE ======
// MoveLog is used for type only (loaded from Supabase, local state only)
type MoveLog = { id: string; vehicleId: string; fromPositionId: string | null; toPositionId: string; employeeId: string | null; createdAt: string }

export const useStore = create<StoreState>()(
  (set, get) => ({
    // Initial empty state — loaded via initializeFromSupabase()
    vehicles: [],
    positions: [],
    tasks: [],
    employees: [],
    moveLogs: [],
    checkSheets: [],
    attendance: [],
    notifications: [],
    settings: defaultSettings,
    taskActivityLogs: [],
    currentEmployeeId: '',
    isInitialized: false,

    // ====== VEHICLES ======
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

      // Optimistic update
      set((s) => ({ vehicles: [vehicle, ...s.vehicles] }))

      // Sync to Supabase (fire-and-forget)
      vehicleService.createVehicle({
        ...vehicle,
        fuelType: vehicle.fuelType,
        costPrice: vehicle.costPrice,
        sellPrice: vehicle.sellPrice,
        positionId: vehicle.positionId,
        assigneeId: vehicle.assigneeId,
      }).catch((err) => console.error('🔴 [STORE] Failed to create vehicle in Supabase:', err))

      const emp = get().employees.find((e) => e.id === get().currentEmployeeId)
      get().addNotification({ type: 'vehicle_added', title: 'Xe mới được thêm', body: `${emp?.name || 'Ai đó'} vừa thêm xe "${vehicle.model}" (${vehicle.plate})` })
      return id
    },

    updateVehicle: async (id, patch) => {
      const before = get().vehicles.find((v) => v.id === id)
      set((s) => ({
        vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...patch, updatedAt: todayISO() } : v)),
      }))

      // Sync to Supabase
      try {
        await vehicleService.updateVehicle(id, patch)
      } catch (err) {
        console.error('🔴 [STORE] Failed to update vehicle in Supabase:', err)
      }

      const after = get().vehicles.find((v) => v.id === id)
      if (patch.status && before && patch.status !== before.status) {
        const labels: Record<string, string> = { available: 'Chưa bán', deposited: 'Đã cọc', sold: 'Đã bán' }
        get().addNotification({ type: 'vehicle_status', title: 'Xe đổi trạng thái', body: `${after?.model} (${after?.plate}) chuyển sang "${labels[patch.status]}"` })
      }
    },

    deleteVehicle: async (id) => {
      set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) }))
      try {
        await vehicleService.deleteVehicle(id)
      } catch (err) {
        console.error('🔴 [STORE] Failed to delete vehicle in Supabase:', err)
      }
    },

    moveVehicle: async (id, toPositionId) => {
      const vehicle = get().vehicles.find((v) => v.id === id)
      if (!vehicle) return
      const fromPositionId = vehicle.positionId ?? null
      if (fromPositionId === toPositionId) return

      const log: MoveLog = { id: uid('log'), vehicleId: id, fromPositionId, toPositionId, employeeId: get().currentEmployeeId, createdAt: todayISO() }

      set((s) => ({
        vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, positionId: toPositionId, updatedAt: todayISO() } : v)),
        moveLogs: [log, ...s.moveLogs],
      }))

      // Sync to Supabase
      try {
        await vehicleService.moveVehicle(id, toPositionId)
        await moveLogService.createMoveLog({
          vehicleId: id,
          fromPositionId,
          toPositionId,
          employeeId: get().currentEmployeeId,
        })
      } catch (err) {
        console.error('🔴 [STORE] Failed to move vehicle in Supabase:', err)
      }
    },

    // ====== TASKS ======
    addTask: async (t) => {
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

      try {
        await taskService.createTask(task)
      } catch (err) {
        console.error('🔴 [STORE] Failed to create task in Supabase:', err)
      }

      const emp = get().employees.find((e) => e.id === get().currentEmployeeId)
      get().addNotification({ type: 'task_created', title: 'Nhiệm vụ mới', body: `${emp?.name || 'Ai đó'} vừa tạo nhiệm vụ "${task.title}"` })
    },

    updateTask: async (id, patch) => {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))

      try {
        await taskService.updateTask(id, patch)
      } catch (err) {
        console.error('🔴 [STORE] Failed to update task in Supabase:', err)
      }

      const emp = get().employees.find((e) => e.id === get().currentEmployeeId)
      const task = get().tasks.find((t) => t.id === id)
      if (task) {
        get().addTaskActivity(id, `${emp?.name || 'Ai đó'} đã cập nhật nhiệm vụ`, get().currentEmployeeId)
      }
    },

    deleteTask: async (id) => {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
      try {
        await taskService.deleteTask(id)
      } catch (err) {
        console.error('🔴 [STORE] Failed to delete task in Supabase:', err)
      }
    },

    toggleTaskChecklistItem: async (taskId, itemId) => {
      const task = get().tasks.find((t) => t.id === taskId)
      const item = task?.checklist.find((i) => i.id === itemId)
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id !== taskId
            ? t
            : { ...t, checklist: (t.checklist || []).map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) }
        ),
      }))

      const updated = get().tasks.find((t) => t.id === taskId)
      if (updated) {
        try {
          await taskService.updateTask(taskId, { checklist: updated.checklist })
        } catch (err) {
          console.error('🔴 [STORE] Failed to update checklist in Supabase:', err)
        }
      }

      const emp = get().employees.find((e) => e.id === get().currentEmployeeId)
      get().addTaskActivity(taskId, `${emp?.name || 'Ai đó'} ${item && !item.done ? 'hoàn thành' : 'bỏ hoàn thành'} "${item?.text}"`, get().currentEmployeeId)

      if (updated && updated.checklist.every((i) => i.done)) {
        get().addNotification({ type: 'task_done', title: 'Nhiệm vụ hoàn thành', body: `"${updated.title}" — tất cả checklist đã xong!` })
      }
    },

    addTaskActivity: async (taskId, action, employeeId) => {
      const entry = { id: uid('act'), taskId, action, employeeId: employeeId || get().currentEmployeeId, createdAt: todayISO() }
      set((s) => ({ taskActivityLogs: [entry, ...s.taskActivityLogs] }))
      try {
        await taskService.addTaskActivity(taskId, action, employeeId)
      } catch (err) {
        console.error('🔴 [STORE] Failed to add task activity in Supabase:', err)
      }
    },

    // ====== EMPLOYEES ======
    updateEmployee: async (id, patch) => {
      set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
      try {
        await employeeService.updateEmployee(id, patch)
      } catch (err) {
        console.error('🔴 [STORE] Failed to update employee in Supabase:', err)
      }
      if (patch.isAdmin !== undefined) {
        const emp = get().employees.find((e) => e.id === id)
        get().addNotification({ type: 'system', title: 'Thay đổi quyền Admin', body: `Tài khoản "${emp?.name}" đã ${patch.isAdmin ? ' được cấp quyền Admin' : ' bị gỡ quyền Admin'}` })
      }
    },

    setCurrentEmployee: (id) => set({ currentEmployeeId: id }),

    // ====== POSITIONS ======
    addPosition: async (name) => {
      const pos: Position = { id: uid('pos'), name, order: get().positions.length }
      set((s) => ({ positions: [...s.positions, pos] }))
      try {
        const created = await positionService.createPosition(name)
        // Update with real DB id
        set((s) => ({
          positions: s.positions.map((p) => (p.id === pos.id ? { ...p, id: created.id } : p)),
        }))
      } catch (err) {
        console.error('🔴 [STORE] Failed to create position in Supabase:', err)
      }
    },

    updatePosition: async (id, patch) => {
      set((s) => ({ positions: s.positions.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
      try {
        await positionService.updatePosition(id, patch)
      } catch (err) {
        console.error('🔴 [STORE] Failed to update position in Supabase:', err)
      }
    },

    deletePosition: async (id) => {
      const vehiclesAtPosition = get().vehicles.filter((v) => v.positionId === id)
      if (vehiclesAtPosition.length > 0) {
        alert(`Không thể xoá: còn ${vehiclesAtPosition.length} xe tại vị trí này.`)
        return
      }
      set((s) => ({ positions: s.positions.filter((p) => p.id !== id) }))
      try {
        await positionService.deletePosition(id)
      } catch (err) {
        console.error('🔴 [STORE] Failed to delete position in Supabase:', err)
      }
    },

    reorderPositions: async (orderedIds) => {
      const currentPositions = get().positions
      const positionMap = new Map(currentPositions.map((p) => [p.id, p]))
      const reordered = orderedIds
        .map((id, index) => {
          const pos = positionMap.get(id)
          return pos ? { ...pos, order: index } : null
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)

      set({ positions: reordered })

      try {
        await positionService.reorderPositions(reordered.map((p) => ({ id: p.id, sort_order: p.order })))
      } catch (err) {
        console.error('🔴 [STORE] Failed to reorder positions in Supabase:', err)
      }
    },

    // ====== CHECK SHEETS ======
    addCheckSheet: async (c) => {
      const sheet: CheckSheet = { ...c, id: uid('chk'), createdAt: todayISO() }
      set((s) => ({ checkSheets: [sheet, ...s.checkSheets] }))
      try {
        await checksheetService.createCheckSheet(sheet)
      } catch (err) {
        console.error('🔴 [STORE] Failed to create checkSheet in Supabase:', err)
      }
    },

    updateCheckSheet: async (id, patch) => {
      set((s) => ({
        checkSheets: s.checkSheets.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }))
      try {
        await checksheetService.updateCheckSheet(id, patch)
      } catch (err) {
        console.error('🔴 [STORE] Failed to update checkSheet in Supabase:', err)
      }
    },

    // ====== ATTENDANCE ======
    checkIn: async (employeeId) => {
      const dateStr = new Date().toISOString().slice(0, 10)
      const timeStr = new Date().toTimeString().slice(0, 5)

      set((s) => {
        const existing = s.attendance.find((a) => a.employeeId === employeeId && a.date === dateStr)
        if (existing) {
          return {
            attendance: s.attendance.map((a) =>
              a.id === existing.id ? { ...a, checkIn: a.checkIn || timeStr } : a
            ),
          }
        }
        const entry: AttendanceEntry = { id: uid('att'), employeeId, date: dateStr, checkIn: timeStr, checkOut: null }
        return { attendance: [entry, ...s.attendance] }
      })

      try {
        await attendanceService.checkIn(employeeId)
      } catch (err) {
        console.error('🔴 [STORE] Failed to check in in Supabase:', err)
      }
    },

    checkOut: async (employeeId) => {
      const dateStr = new Date().toISOString().slice(0, 10)
      const timeStr = new Date().toTimeString().slice(0, 5)

      set((s) => {
        const existing = s.attendance.find((a) => a.employeeId === employeeId && a.date === dateStr)
        if (existing) {
          return {
            attendance: s.attendance.map((a) =>
              a.id === existing.id ? { ...a, checkOut: timeStr } : a
            ),
          }
        }
        const entry: AttendanceEntry = { id: uid('att'), employeeId, date: dateStr, checkIn: null, checkOut: timeStr }
        return { attendance: [entry, ...s.attendance] }
      })

      try {
        await attendanceService.checkOut(employeeId)
      } catch (err) {
        console.error('🔴 [STORE] Failed to check out in Supabase:', err)
      }
    },

    updateAttendanceEntry: async (id, patch) => {
      set((s) => ({ attendance: s.attendance.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))

      const entry = get().attendance.find((a) => a.id === id)
      if (entry) {
        try {
          await attendanceService.updateAttendanceEntry(id, patch)
        } catch (err) {
          console.error('🔴 [STORE] Failed to update attendance in Supabase:', err)
        }
        const emp = get().employees.find((e) => e.id === entry.employeeId)
        get().addNotification({ type: 'attendance_edited', title: 'Chấm công được chỉnh sửa', body: `Admin vừa sửa giờ của ${emp?.name} ngày ${entry.date}` })
      }
    },

    // ====== NOTIFICATIONS ======
    addNotification: async (n) => {
      const notif: Notification = { ...n, id: uid('notif'), read: false, createdAt: todayISO() }
      set((s) => ({ notifications: [notif, ...s.notifications] }))
      try {
        await notificationService.createNotification(n)
      } catch (err) {
        console.error('🔴 [STORE] Failed to create notification in Supabase:', err)
      }
    },

    markNotificationRead: async (id) => {
      set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
      try {
        await notificationService.markNotificationRead(id)
      } catch (err) {
        console.error('🔴 [STORE] Failed to mark notification read in Supabase:', err)
      }
    },

    markAllNotificationsRead: async () => {
      set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
      try {
        await notificationService.markAllNotificationsRead()
      } catch (err) {
        console.error('🔴 [STORE] Failed to mark all notifications read in Supabase:', err)
      }
    },

    // ====== SETTINGS ======
    updateSettings: (patch) => {
      set((s) => ({ settings: { ...s.settings, ...patch } }))
      // TODO: Settings persistence in Supabase (settings table)
    },
  })
)

export function emptyExteriorCheck() {
  return emptyExterior()
}
