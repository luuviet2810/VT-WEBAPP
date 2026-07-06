/**
 * Timeline Service
 *
 * Aggregates all vehicle events into a unified chronological timeline.
 * Uses a provider registry — register new event types via TimelineProvider.
 *
 * Usage:
 *   const items = await getVehicleTimeline(vehicleId)
 */

import type { CheckSheet, MoveLog, Task, TaskActivityLogEntry, TimelineItem, TimelineItemType, Vehicle } from '../types'
import { getMoveLogsByVehicle } from './moveLog.service'
import { getCheckSheetsByVehicle } from './checksheet.service'
import * as taskService from './task.service'

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

registerTimelineProvider({
  type: 'task_status_changed',
  async fetch(vehicleId) {
    const [allActivities, allTasks] = await Promise.all([taskService.getAllTaskActivity(), taskService.getTasks()])
    const vehicleTaskIds = new Set(allTasks.filter((task) => task.vehicleId === vehicleId).map((task) => task.id))
    const taskMap = new Map(allTasks.map((task) => [task.id, task]))

    return allActivities
      .filter((activity) => vehicleTaskIds.has(activity.taskId))
      .map((activity): TimelineItem => {
        const task = taskMap.get(activity.taskId)
        return {
          id: `act_${activity.id}`,
          time: activity.createdAt,
          type: 'task_status_changed',
          title: task?.title ?? 'Cập nhật nhiệm vụ',
          description: activity.action,
          userId: activity.employeeId,
          taskId: activity.taskId,
          vehicleId,
        }
      })
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
  return getVehicleTimeline(vehicleId)
}

export async function refreshVehicleTimeline(vehicleId: string): Promise<TimelineItem[]> {
  return getVehicleTimeline(vehicleId)
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
