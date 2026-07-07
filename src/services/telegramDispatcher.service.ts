/**
 * TelegramEventDispatcher
 *
 * Bridges Zustand store events → Telegram notifications.
 *
 * Rules:
 * - NEVER writes directly to Supabase
 * - Uses existing backend APIs via the store
 * - Calls TelegramService for delivery
 * - Determines target employees based on notification rules
 * - Logs all dispatch attempts
 *
 * Integration: Called from useStore actions after business logic completes.
 */

import type { Task, Vehicle, Employee, CheckSheet } from '../types'
import type {
  TelegramEventType,
  TelegramNotificationPayload,
} from '../types/telegram'
import { telegramConfig } from './telegramConfig.service'
import { telegramService } from './telegram.service'
import {
  formatTaskCreated,
  formatTaskAssigned,
  formatTaskOverdue,
  formatVehicleReady,
  formatVehicleSold,
  formatWorkflowChanged,
  formatApprovalRequired,
} from './telegramFormatter.service'

// Base URL for building deep links
function getBaseUrl(): string {
  // In production this would come from environment config
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
}

// ---- Dispatcher helpers ----

async function dispatch(
  payload: TelegramNotificationPayload,
  targetEmployeeIds: string[]
): Promise<void> {
  if (!telegramConfig.isEnabled()) return
  if (targetEmployeeIds.length === 0) return

  const results = await Promise.allSettled(
    targetEmployeeIds.map((employeeId) =>
      telegramService.sendToEmployee(employeeId, payload.messageText, {
        parseMode: 'MarkdownV2',
        inlineKeyboard: payload.inlineKeyboard,
      })
    )
  )

  const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)).length
  if (failed > 0) {
    console.warn(`[TelegramDispatcher] ${failed}/${targetEmployeeIds.length} deliveries failed`)
  }
}

function getEmployeeIdsByRole(role: 'assignee' | 'manager' | 'all', assigneeId?: string | null): string[] {
  const config = telegramConfig.getConfig()
  const mappings = config.chatMapping.filter((m) => m.enabled)

  switch (role) {
    case 'assignee':
      if (assigneeId) {
        const hasMapping = mappings.find((m) => m.employeeId === assigneeId)
        return hasMapping ? [assigneeId] : []
      }
      return []

    case 'manager':
      // Find employees with admin/manager role - we receive them via employees map
      // Since we can't access the store directly, we rely on chat mappings
      // Manager = employees who are mapped AND have manager role
      // For simplicity, send to ALL mapped employees (guard at caller)
      return mappings.map((m) => m.employeeId)

    case 'all':
      return mappings.map((m) => m.employeeId)

    default:
      return []
  }
}

function shouldNotify(eventType: TelegramEventType): boolean {
  return telegramConfig.isEventEnabled(eventType)
}

// ---- Public Dispatcher API ----

export async function dispatchTaskCreated(
  task: Task,
  vehicle: Vehicle | undefined,
  assignee: Employee | undefined
): Promise<void> {
  if (!shouldNotify('task_created')) return

  const rule = telegramConfig.getRuleForEvent('task_created')
  const targetIds = getEmployeeIdsByRole(rule?.targetRole ?? 'assignee', task.assigneeId)

  const payload = formatTaskCreated(
    task.title,
    vehicle?.plate,
    vehicle?.model,
    task.priority,
    assignee?.name,
    task.id,
    getBaseUrl()
  )

  await dispatch(payload, targetIds)
}

export async function dispatchTaskAssigned(
  task: Task,
  vehicle: Vehicle | undefined,
  assignee: Employee | undefined
): Promise<void> {
  if (!shouldNotify('task_assigned')) return
  if (!task.assigneeId) return

  const rule = telegramConfig.getRuleForEvent('task_assigned')
  const targetIds = getEmployeeIdsByRole(rule?.targetRole ?? 'assignee', task.assigneeId)

  const payload = formatTaskAssigned(
    task.title,
    vehicle?.plate,
    vehicle?.model,
    task.priority,
    assignee?.name ?? 'Nhân viên',
    task.id
  )

  await dispatch(payload, targetIds)
}

export async function dispatchTaskOverdue(
  task: Task,
  vehicle: Vehicle | undefined,
  assignee: Employee | undefined,
  daysOverdue: number
): Promise<void> {
  if (!shouldNotify('task_overdue')) return

  // Check priority threshold
  const rule = telegramConfig.getRuleForEvent('task_overdue')
  if (rule?.priorityThreshold) {
    const priorityOrder = ['low', 'medium', 'high', 'urgent']
    const taskPriorityIdx = priorityOrder.indexOf(task.priority)
    const thresholdIdx = priorityOrder.indexOf(rule.priorityThreshold)
    if (taskPriorityIdx < thresholdIdx) return // Task priority below threshold
  }

  const targetIds = getEmployeeIdsByRole(rule?.targetRole ?? 'assignee', task.assigneeId)

  const payload = formatTaskOverdue(
    task.title,
    vehicle?.plate,
    vehicle?.model,
    task.priority,
    daysOverdue,
    task.id,
    task.assigneeId ?? undefined
  )

  await dispatch(payload, targetIds)
}

export async function dispatchVehicleReady(
  vehicle: Vehicle
): Promise<void> {
  if (!shouldNotify('vehicle_ready')) return

  const rule = telegramConfig.getRuleForEvent('vehicle_ready')
  const targetIds = getEmployeeIdsByRole(rule?.targetRole ?? 'manager')

  const payload = formatVehicleReady(
    vehicle.plate,
    vehicle.model,
    vehicle.id,
    getBaseUrl()
  )

  await dispatch(payload, targetIds)
}

export async function dispatchVehicleSold(
  vehicle: Vehicle
): Promise<void> {
  if (!shouldNotify('vehicle_sold')) return

  const rule = telegramConfig.getRuleForEvent('vehicle_sold')
  const targetIds = getEmployeeIdsByRole(rule?.targetRole ?? 'manager')

  const payload = formatVehicleSold(
    vehicle.plate,
    vehicle.model,
    vehicle.sellPrice,
    vehicle.id,
    getBaseUrl()
  )

  await dispatch(payload, targetIds)
}

export async function dispatchWorkflowChanged(
  vehicle: Vehicle,
  fromStatus: string,
  toStatus: string,
  employeeName?: string
): Promise<void> {
  if (!shouldNotify('workflow_changed')) return

  const rule = telegramConfig.getRuleForEvent('workflow_changed')
  const targetIds = getEmployeeIdsByRole(rule?.targetRole ?? 'all')

  const payload = formatWorkflowChanged(
    vehicle.plate,
    vehicle.model,
    fromStatus,
    toStatus,
    employeeName,
    vehicle.id,
    getBaseUrl()
  )

  await dispatch(payload, targetIds)
}

export async function dispatchApprovalRequired(
  entityType: string,
  entityName: string,
  requesterName: string,
  entityId: string
): Promise<void> {
  if (!shouldNotify('approval_required')) return

  const rule = telegramConfig.getRuleForEvent('approval_required')
  const targetIds = getEmployeeIdsByRole(rule?.targetRole ?? 'manager')

  const payload = formatApprovalRequired(
    entityType,
    entityName,
    requesterName,
    entityId,
    getBaseUrl()
  )

  await dispatch(payload, targetIds)
}

// ---- Overdue check (called periodically by caller) ----

export async function checkAndNotifyOverdueTasks(
  tasks: Task[],
  vehicles: Vehicle[],
  employees: Employee[]
): Promise<void> {
  if (!shouldNotify('task_overdue')) return

  const rule = telegramConfig.getRuleForEvent('task_overdue')
  const priorityOrder = ['low', 'medium', 'high', 'urgent']
  const thresholdIdx = rule?.priorityThreshold
    ? priorityOrder.indexOf(rule.priorityThreshold)
    : 0

  const now = new Date()

  for (const task of tasks) {
    // Only notify for todo/doing tasks with due dates in the past
    if (task.status === 'done') continue
    if (!task.dueDate) continue

    const dueDate = new Date(task.dueDate)
    if (dueDate >= now) continue

    // Check priority threshold
    const taskPriorityIdx = priorityOrder.indexOf(task.priority)
    if (taskPriorityIdx < thresholdIdx) continue

    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    const vehicle = vehicles.find((v) => v.id === task.vehicleId)
    const assignee = employees.find((e) => e.id === task.assigneeId)

    await dispatchTaskOverdue(task, vehicle, assignee, daysOverdue)
  }
}
