import { create } from 'zustand'
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
  TaskTemplate,
  TimelineItem,
  User,
  Vehicle,
} from '../types'
import { generateTasks } from '../utils/taskRules'
import { getVehicleWorkflowStatus, WORKFLOW_STATUS_LABEL } from '../utils/vehicleWorkflow'
import { todayISO, uid } from '../utils/format'
import * as vehicleService from '../services/vehicle.service'
import * as positionService from '../services/position.service'
import * as usersService from '../services/users.service'
import * as taskService from '../services/task.service'
import * as attendanceService from '../services/attendance.service'
import * as checksheetService from '../services/checksheet.service'
import * as notificationService from '../services/notification.service'
import * as moveLogService from '../services/moveLog.service'
import * as vehicleMediaService from '../services/vehicleMedia.service'
import * as storageService from '../services/storage.service'
import * as timelineService from '../services/timeline.service'
import * as vehicleWorkflowService from '../services/vehicleWorkflow.service'
import { templateService } from '../services/template.service'
import {
  dispatchTaskCreated,
  dispatchTaskAssigned,
  dispatchTaskOverdue,
  dispatchVehicleReady,
  dispatchVehicleSold,
  dispatchWorkflowChanged,
  checkAndNotifyOverdueTasks,
} from '../services/telegramDispatcher.service'

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
  companyName: 'Gara xe cu\u0309a to\u0309i',
  companyPhone: '',
}

export async function initializeFromSupabase(): Promise<void> {
  try {
    const [vehicles, positions, employees, tasks, checkSheets, attendance, notifications, moveLogs] = await Promise.all([
      vehicleService.getVehicles().catch(() => []),
      positionService.getPositions().catch(() => []),
      usersService.getEmployees().catch(() => []),
      taskService.getTasks().catch(() => []),
      checksheetService.getCheckSheets().catch(() => []),
      attendanceService.getAttendanceEntries().catch(() => []),
      notificationService.getNotifications().catch(() => []),
      moveLogService.getMoveLogs().catch(() => []),
    ])

    const mappedVehicles = vehicles.map((v) => {
      const record = v as unknown as Record<string, unknown>
      return {
        ...v,
        createdAt: v.createdAt ?? (record.created_at as string) ?? todayISO(),
        updatedAt: v.updatedAt ?? (record.updated_at as string) ?? todayISO(),
      }
    })

    const mappedEmployees: Employee[] = (employees as Employee[]).map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone ?? undefined,
      isAdmin: u.isAdmin,
      disabled: u.disabled ?? false,
    }))

    useStore.setState({
      vehicles: mappedVehicles,
      positions,
      employees: mappedEmployees,
      tasks,
      checkSheets,
      attendance,
      notifications,
      moveLogs,
      isInitialized: true,
    })
    useStore.getState().loadTemplates()
  } catch (err) {
    console.error('\uD83D\uDD34 [STORE] Failed to initialize from Supabase:', err)
    useStore.setState({ isInitialized: true })
  }
}

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
  vehicleTimelines: Record<string, TimelineItem[]>
  currentEmployeeId: string
  isInitialized: boolean
  templates: TaskTemplate[]

  addVehicle: (v: Partial<Vehicle>) => Promise<Vehicle>
  updateVehicle: (id: string, patch: Partial<Vehicle>) => Promise<void>
  deleteVehicle: (id: string) => Promise<void>
  moveVehicle: (id: string, toPositionId: string) => Promise<void>
  loadVehicleTimeline: (vehicleId: string) => Promise<void>

  addTask: (t: Partial<Task>) => Promise<void>
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleTaskChecklistItem: (taskId: string, itemId: string) => Promise<void>
  addTaskActivity: (taskId: string, action: string, employeeId?: string | null) => Promise<void>
  generateTasksFromSheet: (sheet: CheckSheet, vehiclePlate: string) => Promise<void>
  applyTemplate: (templateId: string, vehicleId: string) => Promise<void>

  updateEmployee: (id: string, patch: Partial<Employee>) => Promise<void>
  setCurrentEmployee: (id: string) => void

  addPosition: (name: string) => Promise<void>
  updatePosition: (id: string, patch: Partial<Position>) => Promise<void>
  deletePosition: (id: string) => Promise<void>
  reorderPositions: (orderedIds: string[]) => Promise<void>

  addCheckSheet: (c: Omit<CheckSheet, 'id' | 'createdAt'>) => Promise<void>
  updateCheckSheet: (id: string, patch: Partial<CheckSheet>) => Promise<void>

  checkIn: (employeeId: string) => Promise<void>
  checkOut: (employeeId: string) => Promise<void>
  updateAttendanceEntry: (id: string, patch: Partial<AttendanceEntry>) => Promise<void>

  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>

  updateSettings: (patch: Partial<Settings>) => void

  // Template actions
  loadTemplates: () => void
  createTemplate: (data: Omit<TaskTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>) => void
  updateTemplate: (id: string, patch: Partial<Omit<TaskTemplate, 'id' | 'createdAt'>>) => void
  deleteTemplate: (id: string) => void
  duplicateTemplate: (id: string) => void
  toggleTemplateFavorite: (id: string) => void

  upsertVehicleFromRealtime: (row: Record<string, unknown>) => void
  upsertTaskFromRealtime: (row: Record<string, unknown>) => void
  upsertPositionFromRealtime: (row: Record<string, unknown>) => void
  upsertMoveLogFromRealtime: (row: Record<string, unknown>) => void
  upsertTaskActivityFromRealtime: (row: Record<string, unknown>) => void
}

export const useStore = create<StoreState>()(
  (set, get) => ({
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
    vehicleTimelines: {},
    currentEmployeeId: '',
    isInitialized: false,
    templates: [],

    addVehicle: async (v) => {
      const created = await vehicleService.createVehicle({
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
        images: [],
        documents: [],
      })
      set((s) => ({ vehicles: [created, ...s.vehicles] }))
      const emp = get().employees.find((e) => e.id === get().currentEmployeeId)
      get().addNotification({ type: 'vehicle_added', title: 'Xe m\u1edbi \u0111\u01b0\u1ee3c th\u00eam', body: `${emp?.name || 'Ai \u0111\u00f3'} v\u1eeba th\u00eam xe "${created.model}" (${created.plate})`, data: { vehicleId: created.id } })
      return created
    },

    updateVehicle: async (id, patch) => {
      const before = get().vehicles.find((v) => v.id === id)
      const beforeImages = before?.images ?? []
      const beforeDocs = before?.documents ?? []

      const { images, documents, ...vehiclePatch } = patch as typeof patch & { images?: string[]; documents?: string[] }

      if (images !== undefined) {
        set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, images } : v)) }))

        try {
          const oldSet = new Set(beforeImages)
          const newUrls = images.filter((url) => !oldSet.has(url))
          let sortOrder = beforeImages.length
          for (const dataUrl of newUrls) {
            if (dataUrl.startsWith('data:')) {
              const base64 = dataUrl.split(',')[1]
              if (!base64) {
                console.warn('\u23E9 [STORE] Skip image upload: missing base64 payload', dataUrl)
                continue
              }
              const binary = atob(base64)
              const bytes = new Uint8Array(binary.length)
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
              const blob = new Blob([bytes], { type: dataUrl.match(/:([^;]+)/)?.[1] ?? 'image/jpeg' })
              const file = new File([blob], 'image.jpg', { type: blob.type })
              const uploaded = await storageService.uploadVehicleImage(id, file)
              try {
                await vehicleMediaService.addVehicleImage(id, uploaded.path, 'vehicle-images', uploaded.url, file.size, file.type, sortOrder++)
              } catch (dbErr) {
                await storageService.deleteVehicleImage(uploaded.url)
                throw dbErr
              }
              continue
            }

            const publicMatch = dataUrl.match(/\/storage\/v[12]\/object\/public\/([^/]+)\/(.+)$/)
            if (!publicMatch) {
              console.warn('\u23E9 [STORE] Skip image metadata insert: unsupported URL format', dataUrl)
              continue
            }
            const bucket = publicMatch[1]
            const path = publicMatch[2]
            await vehicleMediaService.addVehicleImage(id, path, bucket, dataUrl, undefined, undefined, sortOrder++)
          }

          const newSet = new Set(images)
          const toRemove = beforeImages.filter((url) => !newSet.has(url))
          for (const url of toRemove) {
            const existingImages = await vehicleMediaService.getVehicleImages(id)
            const match = existingImages.find((img) => img.url === url)
            if (match) {
              await vehicleMediaService.deleteVehicleImage(match.id, match.path)
            }
          }
        } catch (err) {
          console.error('\uD83D\uDD34 [STORE] Failed to sync vehicle images:', err)
          set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, images: beforeImages } : v)) }))
        }
      }

      if (documents !== undefined) {
        set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, documents } : v)) }))

        try {
          const oldSet = new Set(beforeDocs)
          const newUrls = documents.filter((url) => !oldSet.has(url))
          let sortOrder = beforeDocs.length
          for (const dataUrl of newUrls) {
            if (dataUrl.startsWith('data:')) {
              const base64 = dataUrl.split(',')[1]
              if (!base64) {
                console.warn('\u23E9 [STORE] Skip document upload: missing base64 payload', dataUrl)
                continue
              }
              const binary = atob(base64)
              const bytes = new Uint8Array(binary.length)
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
              const blob = new Blob([bytes], { type: dataUrl.match(/:([^;]+)/)?.[1] ?? 'application/pdf' })
              const file = new File([blob], 'document', { type: blob.type })
              const uploaded = await storageService.uploadVehicleDocument(id, file)
              try {
                await vehicleMediaService.addVehicleDocument(id, uploaded.path, 'vehicle-documents', uploaded.url, undefined, file.size, file.type, sortOrder++)
              } catch (dbErr) {
                await storageService.deleteVehicleDocument(uploaded.url)
                throw dbErr
              }
              continue
            }

            const publicMatch = dataUrl.match(/\/storage\/v[12]\/object\/public\/([^/]+)\/(.+)$/)
            if (!publicMatch) {
              console.warn('\u23E9 [STORE] Skip document metadata insert: unsupported URL format', dataUrl)
              continue
            }
            const bucket = publicMatch[1]
            const path = publicMatch[2]
            await vehicleMediaService.addVehicleDocument(id, path, bucket, dataUrl, undefined, undefined, undefined, sortOrder++)
          }

          const newSet = new Set(documents)
          const toRemove = beforeDocs.filter((url) => !newSet.has(url))
          for (const url of toRemove) {
            const existingDocs = await vehicleMediaService.getVehicleDocuments(id)
            const match = existingDocs.find((doc) => doc.url === url)
            if (match) {
              await vehicleMediaService.deleteVehicleDocument(match.id, match.path)
            }
          }
        } catch (err) {
          console.error('\uD83D\uDD34 [STORE] Failed to sync vehicle documents:', err)
          set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, documents: beforeDocs } : v)) }))
        }
      }

      if (Object.keys(vehiclePatch).length > 0) {
        set((s) => ({
          vehicles: s.vehicles.map((v) => (v.id === id ? { ...v, ...vehiclePatch, updatedAt: todayISO() } : v)),
        }))

        try {
          await vehicleService.updateVehicle(id, vehiclePatch)
          get().loadVehicleTimeline(id)
        } catch (err) {
          if (before) set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? before : v)) }))
          console.error('\uD83D\uDD34 [STORE] Failed to update vehicle in Supabase:', err)
          get().addNotification({ type: 'error', title: 'Lỗi', body: 'Không thể cập nhật xe. Vui lòng thử lại.' })
        }
      }

      const after = get().vehicles.find((v) => v.id === id)
      if (patch.status && before && patch.status !== before.status) {
        const labels: Record<string, string> = { available: 'Chưa bán', deposited: 'Đã cọc', sold: 'Đã bán' }
        get().addNotification({ type: 'vehicle_status', title: 'Xe đổi trạng thái', body: `${after?.model} (${after?.plate}) chuyển sang "${labels[patch.status]}"` })

        // Telegram: notify on vehicle sold or ready status changes
        if (patch.status === 'sold') {
          dispatchVehicleSold(after!).catch((err) => {
            console.error('[STORE] Telegram dispatchVehicleSold failed:', err)
          })
        } else if (patch.status === 'available' && before.status !== 'available') {
          dispatchVehicleReady(after!).catch((err) => {
            console.error('[STORE] Telegram dispatchVehicleReady failed:', err)
          })
        }
      }
    },

    deleteVehicle: async (id) => {
      const before = get().vehicles.find((v) => v.id === id)
      const imagesToDelete = before?.images ?? []
      const docsToDelete = before?.documents ?? []

      set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) }))

      try {
        for (const url of imagesToDelete) {
          try {
            await storageService.deleteVehicleImage(url)
          } catch (err) {
            console.error('\uD83D\uDD34 [STORE] Failed to delete image from storage:', err)
          }
        }
        for (const url of docsToDelete) {
          try {
            await storageService.deleteVehicleDocument(url)
          } catch (err) {
            console.error('\uD83D\uDD34 [STORE] Failed to delete document from storage:', err)
          }
        }

        await vehicleMediaService.deleteAllVehicleMedia(id)
        await vehicleService.deleteVehicle(id)
      } catch (err) {
        if (before) set((s) => ({ vehicles: [...s.vehicles, before] }))
        console.error('\uD83D\uDD34 [STORE] Failed to delete vehicle in Supabase:', err)
        get().addNotification({ type: 'error', title: 'Lỗi', body: 'Không thể xóa xe. Vui lòng thử lại.' })
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

      try {
        await vehicleService.moveVehicle(id, toPositionId)
        await moveLogService.createMoveLog({
          vehicleId: id,
          fromPositionId,
          toPositionId,
          employeeId: get().currentEmployeeId,
        })
        get().loadVehicleTimeline(id)
      } catch (err) {
        set((s) => ({
          vehicles: s.vehicles.map((v) => (v.id === id ? vehicle : v)),
          moveLogs: s.moveLogs.filter((l) => l.id !== log.id),
        }))
        console.error('\uD83D\uDD34 [STORE] Failed to move vehicle in Supabase:', err)
        get().addNotification({ type: 'error', title: 'Lỗi', body: 'Không thể di chuyển xe. Vui lòng thử lại.' })
      }
    },

    loadVehicleTimeline: async (vehicleId) => {
      const timeline = await timelineService.getVehicleTimeline(vehicleId)
      set((s) => ({
        vehicleTimelines: {
          ...s.vehicleTimelines,
          [vehicleId]: timeline,
        },
      }))
    },

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
        const created = await taskService.createTask(task)
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === task.id ? created : t)),
        }))
      } catch (err) {
        console.error('\uD83D\uDD34 [STORE] Failed to create task in Supabase:', err)
        get().addNotification({ type: 'error', title: 'Lỗi', body: 'Không thể tạo nhiệm vụ. Vui lòng thử lại.' })
      }

      const emp = get().employees.find((e) => e.id === get().currentEmployeeId)
      get().addNotification({ type: 'task_created', title: 'Nhiệm vụ mới', body: `${emp?.name || 'Ai đó'} vừa tạo nhiệm vụ "${task.title}"`, data: { vehicleId: task.vehicleId ?? undefined, taskId: task.id } })

      // Telegram notification - fire and forget, never blocks business flow
      const vehicle = get().vehicles.find((v) => v.id === task.vehicleId)
      const assignee = task.assigneeId ? get().employees.find((e) => e.id === task.assigneeId) : undefined
      dispatchTaskCreated(task, vehicle, assignee).catch((err) => {
        console.error('[STORE] Telegram dispatchTaskCreated failed:', err)
      })
    },

    updateTask: async (id, patch) => {
      const stateBefore = get()
      const taskBefore = stateBefore.tasks.find((t) => t.id === id)
      const vehicleId = taskBefore?.vehicleId

      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))

      const prevStatus = vehicleId
        ? getVehicleWorkflowStatus(
            stateBefore.vehicles.find((v) => v.id === vehicleId)!,
            stateBefore.tasks.filter((t) => t.vehicleId === vehicleId),
            stateBefore.checkSheets.filter((s2) => s2.vehicleId === vehicleId)
          )
        : null

      try {
        await taskService.updateTask(id, patch)
      } catch (err) {
        console.error('\uD83D\uDD34 [STORE] Failed to update task in Supabase:', err)
      }

      const emp = get().employees.find((e) => e.id === get().currentEmployeeId)
      const task = get().tasks.find((t) => t.id === id)
      if (task) {
        get().addTaskActivity(id, `${emp?.name || 'Ai \u0111\u00f3'} \u0111\u00e3 c\u1eadp nh\u1eadt nhi\u1ec7m v\u1ee5`, get().currentEmployeeId)
      }

      // Record workflow status change if it changed
      if (vehicleId && prevStatus !== null) {
        const stateAfter = get()
        const nextStatus = getVehicleWorkflowStatus(
          stateAfter.vehicles.find((v) => v.id === vehicleId)!,
          stateAfter.tasks.filter((t) => t.vehicleId === vehicleId),
          stateAfter.checkSheets.filter((s2) => s2.vehicleId === vehicleId)
        )
        if (nextStatus !== prevStatus) {
          const newEntry: TimelineItem = {
            id: uid('wf'),
            time: todayISO(),
            type: 'vehicle_workflow_changed',
            title: 'Cập nhật tiến độ',
            description: `Tình trạng: ${WORKFLOW_STATUS_LABEL[nextStatus]}`,
            vehicleId,
          }
          set((s) => ({
            vehicleTimelines: {
              ...s.vehicleTimelines,
              [vehicleId]: [newEntry, ...(s.vehicleTimelines[vehicleId] ?? [])],
            },
          }))
          try {
            await vehicleWorkflowService.addVehicleWorkflowLog(vehicleId, nextStatus, stateAfter.currentEmployeeId)
          } catch (logErr) {
            console.error('\uD83D\uDD34 [STORE] Failed to record workflow log:', logErr)
          }

          // Telegram: notify on workflow status change
          const changedVehicle = stateAfter.vehicles.find((v) => v.id === vehicleId)
          if (changedVehicle) {
            dispatchWorkflowChanged(changedVehicle, prevStatus!, nextStatus, emp?.name).catch((err) => {
              console.error('[STORE] Telegram dispatchWorkflowChanged failed:', err)
            })
          }
        }
      }
    },

    deleteTask: async (id) => {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
      try {
        await taskService.deleteTask(id)
      } catch (err) {
        console.error('\uD83D\uDD34 [STORE] Failed to delete task in Supabase:', err)
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
          console.error('\uD83D\uDD34 [STORE] Failed to update checklist in Supabase:', err)
        }
      }

      const emp = get().employees.find((e) => e.id === get().currentEmployeeId)
      get().addTaskActivity(taskId, `${emp?.name || 'Ai \u0111\u00f3'} ${item && !item.done ? 'ho\u00e0n th\u00e0nh' : 'b\u1ecf ho\u00e0n th\u00e0nh'} "${item?.text}"`, get().currentEmployeeId)

      if (updated && updated.checklist.every((i) => i.done)) {
        get().addNotification({ type: 'task_done', title: 'Nhi\u1ec7m v\u1ee5 ho\u00e0n th\u00e0nh', body: `"${updated.title}" -- t\u1ea5t c\u1ea3 checklist \u0111\u00e3 xong!` })
      }
    },

    addTaskActivity: async (taskId, action, employeeId) => {
      const entry = { id: uid('act'), taskId, action, employeeId: employeeId || get().currentEmployeeId, createdAt: todayISO() }
      set((s) => ({ taskActivityLogs: [entry, ...s.taskActivityLogs] }))
      try {
        await taskService.addTaskActivity(taskId, action, employeeId)
      } catch (err) {
        console.error('\uD83D\uDD34 [STORE] Failed to add task activity in Supabase:', err)
      }
    },

    generateTasksFromSheet: async (sheet, vehiclePlate) => {
      const generated = generateTasks(sheet, vehiclePlate)
      const stateBefore = get()
      const vehicleId = sheet.vehicleId

      // Capture workflow status before changes
      const prevStatus = vehicleId
        ? getVehicleWorkflowStatus(
            stateBefore.vehicles.find((v) => v.id === vehicleId)!,
            stateBefore.tasks.filter((t) => t.vehicleId === vehicleId),
            stateBefore.checkSheets.filter((s2) => s2.vehicleId === vehicleId)
          )
        : null

      const existingTasks = get().tasks.filter((t) => t.vehicleId === sheet.vehicleId)
      const existingByRuleId = new Map(existingTasks.map((t) => [t.ruleId, t]))


      const keepRuleIds = new Set(generated.map((g) => g.ruleId))

      for (const existing of existingTasks) {
        if (!existing.ruleId || !keepRuleIds.has(existing.ruleId)) {
          get().deleteTask(existing.id)
        }
      }

      for (const gen of generated) {
        const match = existingByRuleId.get(gen.ruleId)

        if (!match) {
          try {
            const created = await taskService.createTask({
              title: gen.title,
              description: gen.description,
              checklist: gen.checklist,
              priority: gen.priority,
              status: gen.status,
              vehicleId: gen.vehicleId,
              assigneeId: null,
              dueDate: null,
              dueTime: null,
              ruleId: gen.ruleId,
            })
            set((s) => ({ tasks: [created, ...s.tasks] }))
          } catch (err) {
            console.error(`  \uD83D\uDD34 [STORE] CREATE TASK FAILED: "${gen.title}"`, err)
          }
          continue
        }

        if (match.title !== gen.title || match.status !== gen.status) {
          get().updateTask(match.id, { title: gen.title, status: gen.status })
        }

        const activeTexts = gen.checklist.map((item) => item.text)
        const updatedChecklist = match.checklist
          .map((item) => {
            if (item.done) return item
            if (activeTexts.includes(item.text)) return item
            return null
          })
          .filter(Boolean) as Task['checklist']

        const existingTexts = new Set(updatedChecklist.map((item) => item.text))
        const newChecklistItems = gen.checklist.filter((item) => !existingTexts.has(item.text))

        if (newChecklistItems.length > 0 || updatedChecklist.length !== match.checklist.length) {
          get().updateTask(match.id, { checklist: [...updatedChecklist, ...newChecklistItems.map((item) => ({ id: uid('chk'), text: item.text, done: false }))] })
        }
      }

      // Record workflow status change after all tasks are generated
      if (vehicleId && prevStatus !== null) {
        const stateAfter = get()
        const nextStatus = getVehicleWorkflowStatus(
          stateAfter.vehicles.find((v) => v.id === vehicleId)!,
          stateAfter.tasks.filter((t) => t.vehicleId === vehicleId),
          stateAfter.checkSheets.filter((s2) => s2.vehicleId === vehicleId)
        )
        if (nextStatus !== prevStatus) {
          const newEntry: TimelineItem = {
            id: uid('wf'),
            time: todayISO(),
            type: 'vehicle_workflow_changed',
            title: 'Cập nhật tiến độ',
            description: `Tình trạng: ${WORKFLOW_STATUS_LABEL[nextStatus]}`,
            vehicleId,
          }
          set((s) => ({
            vehicleTimelines: {
              ...s.vehicleTimelines,
              [vehicleId]: [newEntry, ...(s.vehicleTimelines[vehicleId] ?? [])],
            },
          }))
          try {
            await vehicleWorkflowService.addVehicleWorkflowLog(vehicleId, nextStatus, stateAfter.currentEmployeeId)
          } catch (logErr) {
            console.error('\uD83D\uDD34 [STORE] Failed to record workflow log:', logErr)
          }
        }
      }
    },

    updateEmployee: async (id, patch) => {
      set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
      try {
        await usersService.updateEmployee(id, patch)
      } catch (err) {
        console.error('\uD83D\uDD34 [STORE] Failed to update employee in Supabase:', err)
      }
      if (patch.isAdmin !== undefined) {
        const emp = get().employees.find((e) => e.id === id)
        get().addNotification({ type: 'system', title: 'Thay \u0111\u1ed5i quy\u1ec1n Admin', body: `T\u00e0i kho\u1ea3n "${emp?.name}" \u0111\u00e3 ${patch.isAdmin ? ' \u0111\u01b0\u1ee3c c\u1ea5p quy\u1ec1n Admin' : ' b\u1ecb g\u1ee1 quy\u1ec1n Admin'}` })
      }
    },

    setCurrentEmployee: (id) => set({ currentEmployeeId: id }),

    addPosition: async (name) => {
      const pos: Position = { id: uid('pos'), name, order: get().positions.length }
      set((s) => ({ positions: [...s.positions, pos] }))
      try {
        const created = await positionService.createPosition(name)
        set((s) => ({
          positions: s.positions.map((p) => (p.id === pos.id ? { ...p, id: created.id } : p)),
        }))
      } catch (err) {
        console.error('\uD83D\uDD34 [STORE] Failed to create position in Supabase:', err)
      }
    },

    updatePosition: async (id, patch) => {
      set((s) => ({ positions: s.positions.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
      try {
        await positionService.updatePosition(id, patch)
      } catch (err) {
        console.error('\uD83D\uDD34 [STORE] Failed to update position in Supabase:', err)
      }
    },

    deletePosition: async (id) => {
      const vehiclesAtPosition = get().vehicles.filter((v) => v.positionId === id)
      if (vehiclesAtPosition.length > 0) {
        alert(`Kh\u00f4ng th\u1ec3 xo\u00e1: c\u00f2n ${vehiclesAtPosition.length} xe t\u1ea1i v\u1ecb tr\u00ed n\u00e0y.`)
        return
      }
      set((s) => ({ positions: s.positions.filter((p) => p.id !== id) }))
      try {
        await positionService.deletePosition(id)
      } catch (err) {
        console.error('\uD83D\uDD34 [STORE] Failed to delete position in Supabase:', err)
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
        console.error('\uD83D\uDD34 [STORE] Failed to reorder positions in Supabase:', err)
      }
    },

    addCheckSheet: async (c) => {
      const sheet: CheckSheet = { ...c, id: uid('chk'), createdAt: todayISO() }
      set((s) => ({ checkSheets: [sheet, ...s.checkSheets] }))
      try {
        const created = await checksheetService.createCheckSheet(sheet)
        set((s) => ({
          checkSheets: s.checkSheets.map((cs) => (cs.id === sheet.id ? created : cs)),
        }))

        // Record workflow status change in timeline
        if (c.vehicleId) {
          const state = get()
          const vehicle = state.vehicles.find((v) => v.id === c.vehicleId)
          const vehicleTasks = state.tasks.filter((t) => t.vehicleId === c.vehicleId)
          const vehicleSheets = state.checkSheets.filter((s2) => s2.vehicleId === c.vehicleId)
          const newStatus = getVehicleWorkflowStatus(vehicle!, vehicleTasks, vehicleSheets)
          const timeline = state.vehicleTimelines[c.vehicleId] ?? []
          const prevStatus = timeline[0]?.description?.startsWith('Tình trạng:')
            ? (timeline[0].description.replace('Tình trạng: ', '') as ReturnType<typeof getVehicleWorkflowStatus>)
            : null
          if (prevStatus !== newStatus) {
            const newEntry: TimelineItem = {
              id: uid('wf'),
              time: todayISO(),
              type: 'vehicle_workflow_changed',
              title: 'Cập nhật tiến độ',
              description: `Tình trạng: ${WORKFLOW_STATUS_LABEL[newStatus]}`,
              vehicleId: c.vehicleId,
            }
            set((s) => ({
              vehicleTimelines: {
                ...s.vehicleTimelines,
                [c.vehicleId!]: [newEntry, ...(s.vehicleTimelines[c.vehicleId!] ?? [])],
              },
            }))
            try {
              await vehicleWorkflowService.addVehicleWorkflowLog(c.vehicleId!, newStatus, state.currentEmployeeId)
            } catch (logErr) {
              console.error('\uD83D\uDD34 [STORE] Failed to record workflow log:', logErr)
            }
          }
        }
      } catch (err) {
        console.error('\uD83D\uDD34 [STORE] Failed to create checkSheet in Supabase:', err)
      }
    },

    updateCheckSheet: async (id, patch) => {
      const prev = get().checkSheets.find((c) => c.id === id)
      set((s) => ({
        checkSheets: s.checkSheets.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }))
      try {
        const updated = await checksheetService.updateCheckSheet(id, patch)
        set((s) => ({
          checkSheets: s.checkSheets.map((c) => (c.id === id ? updated : c)),
        }))
        // Auto-generate tasks from updated checksheet using rule engine
        const vehicle = get().vehicles.find((v) => v.id === updated.vehicleId)
        if (vehicle) {
          get().generateTasksFromSheet(updated, vehicle.plate)
        }
      } catch (err) {
        // Revert optimistic update
        if (prev) set((s) => ({ checkSheets: s.checkSheets.map((c) => (c.id === id ? prev : c)) }))
        console.error('\uD83D\uDD34 [STORE] Failed to update checkSheet in Supabase:', err)
        throw err
      }
    },

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
        console.error('\uD83D\uDD34 [STORE] Failed to check in in Supabase:', err)
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
        console.error('\uD83D\uDD34 [STORE] Failed to check out in Supabase:', err)
      }
    },

    updateAttendanceEntry: async (id, patch) => {
      set((s) => ({ attendance: s.attendance.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))

      const entry = get().attendance.find((a) => a.id === id)
      if (entry) {
        try {
          await attendanceService.updateAttendanceEntry(id, patch)
        } catch (err) {
          console.error('\uD83D\uDD34 [STORE] Failed to update attendance in Supabase:', err)
        }
        const emp = get().employees.find((e) => e.id === entry.employeeId)
        get().addNotification({ type: 'attendance_edited', title: 'Ch\u1ea5m c\u00f4ng \u0111\u01b0\u1ee3c ch\u1ec9nh s\u1eeda', body: `Admin v\u1eeba s\u1eeda gi\u1edd c\u1ee7a ${emp?.name} ng\u00e0y ${entry.date}` })
      }
    },

    addNotification: async (n) => {
      const notif: Notification = { ...n, id: uid('notif'), read: false, createdAt: todayISO() }
      set((s) => ({ notifications: [notif, ...s.notifications] }))
      try {
        await notificationService.createNotification(n)
      } catch (err) {
        console.error('\uD83D\uDD34 [STORE] Failed to create notification in Supabase:', err)
      }
    },

    markNotificationRead: async (id) => {
      set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
      try {
        await notificationService.markNotificationRead(id)
      } catch (err) {
        console.error('\uD83D\uDD34 [STORE] Failed to mark notification read in Supabase:', err)
      }
    },

    markAllNotificationsRead: async () => {
      set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
      try {
        await notificationService.markAllNotificationsRead()
      } catch (err) {
        console.error('\uD83D\uDD34 [STORE] Failed to mark all notifications read in Supabase:', err)
      }
    },

    updateSettings: (patch) => {
      set((s) => ({ settings: { ...s.settings, ...patch } }))
    },

    upsertVehicleFromRealtime(row) {
      const fuelTypeRaw = row.fuel_type as string | undefined
      const fuelTypeVal = fuelTypeRaw as Vehicle['fuelType']
      const statusRaw = row.status as string | undefined
      const statusVal = statusRaw as Vehicle['status']
      const v = {
        id: row.id as string,
        plate: (row.plate as string) || '',
        model: (row.model as string) || '',
        year: (row.year as number) ?? undefined,
        fuelType: fuelTypeVal,
        displacement: (row.displacement as string) ?? undefined,
        mileage: (row.mileage as string) ?? undefined,
        color: (row.color as string) ?? undefined,
        costPrice: (row.cost_price as number) ?? 0,
        sellPrice: (row.sell_price as number) ?? 0,
        status: statusVal,
        positionId: (row.position_id as string) ?? null,
        assigneeId: (row.assignee_id as string) ?? null,
        note: (row.note as string) ?? undefined,
        images: [] as string[],
        documents: [] as string[],
        createdAt: (row.created_at as string) ?? new Date().toISOString(),
        updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
      }
      set((s) => {
        const idx = s.vehicles.findIndex((x) => x.id === v.id)
        if (idx >= 0) {
          const next = [...s.vehicles]
          next[idx] = { ...next[idx], ...v }
          return { vehicles: next }
        }
        return { vehicles: [v, ...s.vehicles] }
      })
    },

    upsertTaskFromRealtime(row) {
      const checklist = (row.checklist ?? []) as Task['checklist']
      const priorityRaw = row.priority as string | undefined
      const statusRaw = row.status as string | undefined
      const t: Task = {
        id: row.id as string,
        title: row.title as string,
        description: (row.description as string | undefined),
        checklist,
        priority: priorityRaw as Task['priority'],
        status: statusRaw as Task['status'],
        assigneeId: (row.assignee_id as string) ?? null,
        vehicleId: (row.vehicle_id as string) ?? null,
        dueDate: (row.due_date as string) ?? null,
        dueTime: (row.due_time as string) ?? null,
        ruleId: (row.rule_id as string) ?? null,
        createdAt: row.created_at as string,
      }
      set((s) => {
        const idx = s.tasks.findIndex((x) => x.id === t.id)
        if (idx >= 0) {
          const next = [...s.tasks]
          next[idx] = { ...next[idx], ...t }
          return { tasks: next }
        }
        return { tasks: [t, ...s.tasks] }
      })
    },

    upsertPositionFromRealtime(row) {
      const p: Position = {
        id: row.id as string,
        name: row.name as string,
        order: (row.sort_order as number) ?? 0,
      }
      set((s) => {
        const idx = s.positions.findIndex((x) => x.id === p.id)
        if (idx >= 0) {
          const next = [...s.positions]
          next[idx] = { ...next[idx], ...p }
          return { positions: next }
        }
        return { positions: [...s.positions, p] }
      })
    },

    upsertMoveLogFromRealtime(row) {
      const m: MoveLog = {
        id: row.id as string,
        vehicleId: row.vehicle_id as string,
        fromPositionId: (row.from_position_id as string) ?? null,
        toPositionId: row.to_position_id as string,
        employeeId: (row.user_id as string) ?? null,
        createdAt: row.created_at as string,
      }
      set((s) => {
        const exists = s.moveLogs.some((x) => x.id === m.id)
        const vehicles = [...s.vehicles]
        const vehicleIdx = vehicles.findIndex((x) => x.id === m.vehicleId)
        if (vehicleIdx >= 0) {
          vehicles[vehicleIdx] = { ...vehicles[vehicleIdx], positionId: m.toPositionId }
        }
        return {
          moveLogs: exists ? s.moveLogs : [m, ...s.moveLogs],
          vehicles,
        }
      })
    },

    upsertTaskActivityFromRealtime(row) {
      const a: TaskActivityLogEntry = {
        id: row.id as string,
        taskId: row.task_id as string,
        action: row.action as string,
        employeeId: (row.user_id as string) ?? null,
        createdAt: row.created_at as string,
      }
      set((s) => {
        const exists = s.taskActivityLogs.some((x) => x.id === a.id)
        return { taskActivityLogs: exists ? s.taskActivityLogs : [a, ...s.taskActivityLogs] }
      })
    },

    // ====== TEMPLATE ACTIONS ======

    loadTemplates() {
      const templates = templateService.getTemplates()
      set({ templates })
    },

    createTemplate(data) {
      const created = templateService.createTemplate(data)
      set((s) => ({ templates: [...s.templates, created] }))
    },

    updateTemplate(id, patch) {
      const updated = templateService.updateTemplate(id, patch)
      if (!updated) return
      set((s) => ({ templates: s.templates.map((t) => (t.id === id ? updated : t)) }))
    },

    deleteTemplate(id) {
      templateService.deleteTemplate(id)
      set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }))
    },

    duplicateTemplate(id) {
      const copy = templateService.duplicateTemplate(id)
      if (!copy) return
      set((s) => ({ templates: [...s.templates, copy] }))
    },

    toggleTemplateFavorite(id) {
      const updated = templateService.toggleFavorite(id)
      if (!updated) return
      set((s) => ({ templates: s.templates.map((t) => (t.id === id ? updated : t)) }))
    },

    async applyTemplate(templateId, vehicleId) {
      const templates = get().templates
      const template = templates.find((t) => t.id === templateId)
      if (!template) return

      // Increment usage count optimistically
      templateService.incrementUsage(templateId)
      set((s) => ({
        templates: s.templates.map((t) =>
          t.id === templateId ? { ...t, usageCount: t.usageCount + 1 } : t
        ),
      }))

      // Generate tasks from template
      const newTasks = templateService.applyTemplateToVehicle(template, vehicleId)
      const vehicle = get().vehicles.find((v) => v.id === vehicleId)
      const existingTasks = get().tasks.filter((t) => t.vehicleId === vehicleId)

      // Merge: for tasks with same ruleId, merge checklist items (add new items, preserve done state)
      const createPromises: Promise<unknown>[] = []
      for (const newTask of newTasks) {
        const existing = existingTasks.find((et) => et.ruleId === newTask.ruleId)
        if (existing) {
          const existingTexts = new Set(existing.checklist.map((i) => i.text))
          const newItems = newTask.checklist.filter((i) => !existingTexts.has(i.text))
          if (newItems.length > 0) {
            get().updateTask(existing.id, { checklist: [...existing.checklist, ...newItems] })
          }
          continue
        }

        // Create brand new task
        const p = taskService.createTask(newTask).then((created) => {
          set((s) => ({ tasks: [created, ...s.tasks] }))
        })
        createPromises.push(p)
      }

      await Promise.all(createPromises)
      get().addNotification({
        type: 'task_created',
        title: 'Mẫu công việc',
        body: `Đã áp dụng "${template.name}" cho xe ${vehicle?.plate || ''}`,
      })
    },
  })
)

export function emptyExteriorCheck() {
  return emptyExterior()
}
