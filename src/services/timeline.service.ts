/**
 * Timeline Service
 *
 * Aggregates all vehicle events into a unified chronological timeline.
 * Uses a provider registry — register new event types via TimelineProvider.
 *
 * Usage:
 *   const items = await getVehicleTimeline(vehicleId)
 */

import type { CheckSheet, MoveLog, Task, TaskActivityLogEntry, Vehicle } from '../types'
import { getMoveLogsByVehicle } from './moveLog.service'
import { getCheckSheetsByVehicle } from './checksheet.service'
import * as taskService from './task.service'

// ====== TIMELINE ITEM ======

export type TimelineItemType =
  | 'vehicle_created'
  | 'check_sheet_created'
  | 'task_generated'
  | 'task_status_changed'
  | 'move_log'
  | 'vehicle_status_changed'
  | 'custom'

export interface TimelineItem {
  id: string
  time: string          // ISO date string, used for sorting
  type: TimelineItemType
  title: string
  description: string
  user?: string        // employee name who triggered the event
  userId?: string | null
  // Source references
  vehicleId?: string
  checkSheetId?: string
  taskId?: string
  moveLogId?: string
}

// ====== TIMELINE PROVIDER ======

export interface TimelineProvider {
  type: TimelineItemType
  fetch(vehicleId: string): Promise<TimelineItem[]>
}

const providers: TimelineProvider[] = []

export function registerTimelineProvider(provider: TimelineProvider): void {
  providers.push(provider)
  console.log(`🔵 [timeline.service] Registered provider: "${provider.type}"`)
}

// ====== PROVIDER: VEHICLE CREATED ======

registerTimelineProvider({
  type: 'vehicle_created',
  async fetch(vehicleId) {
    return []
  },
})

// ====== PROVIDER: MOVE LOG ======

registerTimelineProvider({
  type: 'move_log',
  async fetch(vehicleId) {
    const logs = await getMoveLogsByVehicle(vehicleId)
    return logs.map((log: MoveLog): TimelineItem => ({
      id: `move_${log.id}`,
      time: log.createdAt,
      type: 'move_log',
      title: `Di chuyển đến vị trí mới`,
      description: log.fromPositionId
        ? `Từ vị trí cũ → Vị trí mới`
        : `Xe được gán vị trí mới`,
      userId: log.employeeId,
      vehicleId: log.vehicleId,
      moveLogId: log.id,
    }))
  },
})

// ====== PROVIDER: CHECK SHEET CREATED ======

registerTimelineProvider({
  type: 'check_sheet_created',
  async fetch(vehicleId) {
    const sheets = await getCheckSheetsByVehicle(vehicleId)
    return sheets.map((sheet: CheckSheet): TimelineItem => ({
      id: `sheet_${sheet.id}`,
      time: sheet.createdAt,
      type: 'check_sheet_created',
      title: `Phiếu kiểm tra ${sheet.type === 'in' ? 'đầu vào' : 'đầu ra'}`,
      description: `Ngày: ${sheet.checkDate}`,
      userId: sheet.checkerId ?? null,
      vehicleId: sheet.vehicleId,
      checkSheetId: sheet.id,
    }))
  },
})

// ====== PROVIDER: TASK ======

registerTimelineProvider({
  type: 'task_generated',
  async fetch(vehicleId) {
    const allTasks = await taskService.getTasks()
    const vehicleTasks = allTasks.filter((t) => t.vehicleId === vehicleId)

    return vehicleTasks.map((task: Task): TimelineItem => ({
      id: `task_${task.id}`,
      time: task.createdAt,
      type: 'task_generated',
      title: task.title,
      description: `Ưu tiên: ${task.priority} | Trạng thái: ${task.status}`,
      userId: task.assigneeId ?? null,
      vehicleId: task.vehicleId ?? undefined,
      taskId: task.id,
    }))
  },
})

// ====== PROVIDER: TASK STATUS CHANGED ======

// Note: taskActivityLogs are fetched separately from the store
// This provider uses a placeholder — actual integration happens via store

registerTimelineProvider({
  type: 'task_status_changed',
  async fetch(_vehicleId) {
    return []
  },
})

// ====== PROVIDER: VEHICLE STATUS CHANGED ======

registerTimelineProvider({
  type: 'vehicle_status_changed',
  async fetch(_vehicleId) {
    return []
  },
})

// ====== MAIN EXPORT ======

export async function getVehicleTimeline(vehicleId: string): Promise<TimelineItem[]> {
  const results = await Promise.all(providers.map((p) => p.fetch(vehicleId).catch(() => [])))

  const allItems: TimelineItem[] = results.flat()
  allItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return allItems
}

export async function loadVehicleTimeline(vehicleId: string): Promise<TimelineItem[]> {
  console.log('🔵 [timeline.service] TIMELINE LOADED — vehicle:', vehicleId)

  const items = await getVehicleTimeline(vehicleId)

  console.log(`  🟢 [timeline.service] TIMELINE LOADED — total: ${items.length}`)

  return items
}

export async function refreshVehicleTimeline(vehicleId: string): Promise<TimelineItem[]> {
  console.log('🔵 [timeline.service] TIMELINE REFRESH — vehicle:', vehicleId)

  const items = await getVehicleTimeline(vehicleId)

  console.log(`  🟢 [timeline.service] TIMELINE REFRESH — total: ${items.length}`)

  return items
}

export async function getVehicleTimelineWithActivity(
  vehicleId: string,
  activityLogs: TaskActivityLogEntry[]
): Promise<TimelineItem[]> {
  const base = await getVehicleTimeline(vehicleId)

  // Inject task activity logs as timeline items
  const taskIds = new Set(
    base.filter((i) => i.taskId).map((i) => i.taskId)
  )

  const activityItems: TimelineItem[] = activityLogs
    .filter((log) => taskIds.has(log.taskId))
    .map((log): TimelineItem => ({
      id: `act_${log.id}`,
      time: log.createdAt,
      type: 'task_status_changed',
      title: 'Cập nhật task',
      description: log.action,
      userId: log.employeeId,
      taskId: log.taskId,
      vehicleId,
    }))

  const merged = [...base, ...activityItems]
  merged.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return merged
}
