import { apiGet, apiPost, apiPut, apiDelete } from './api.client'
import type { Task, TaskActivityLogEntry } from '../types'

function mapRow(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    checklist: Array.isArray(row.checklist) ? (row.checklist as Task['checklist']) : [],
    priority: (row.priority as Task['priority']) || 'low',
    status: (row.status as Task['status']) || 'todo',
    assigneeId: (row.assignee_id as string) ?? (row.assigneeId as string) ?? null,
    vehicleId: (row.vehicle_id as string) ?? (row.vehicleId as string) ?? null,
    dueDate: (row.due_date as string) ?? (row.dueDate as string) ?? null,
    dueTime: (row.due_time as string) ?? (row.dueTime as string) ?? null,
    ruleId: (row.rule_id as string) ?? (row.ruleId as string) ?? null,
    source: ((row.source as Task['source']) || undefined),
    deferred: Boolean(row.deferred ?? false),
    soldHandled: Boolean(row.sold_handled ?? row.soldHandled ?? false),
    vehicleModelSnapshot: (row.vehicle_model_snapshot as string) ?? (row.vehicleModelSnapshot as string) ?? null,
    vehiclePlateSnapshot: (row.vehicle_plate_snapshot as string) ?? (row.vehiclePlateSnapshot as string) ?? null,
    createdAt: (row.created_at as string) ?? (row.createdAt as string),
  }
}

function mapActivityRow(row: Record<string, unknown>): TaskActivityLogEntry {
  return {
    id: row.id as string,
    taskId: (row.task_id as string) ?? (row.taskId as string),
    action: row.action as string,
    employeeId: (row.user_id as string) ?? (row.employeeId as string) ?? null,
    createdAt: (row.created_at as string) ?? (row.createdAt as string),
  }
}

export async function getTasks(filters?: {
  status?: Task['status']
  priority?: Task['priority']
  assigneeId?: string
  vehicleId?: string
}): Promise<Task[]> {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.priority) params.append('priority', filters.priority)
  if (filters?.assigneeId) params.append('assigneeId', filters.assigneeId)
  if (filters?.vehicleId) params.append('vehicleId', filters.vehicleId)

  const queryStr = params.toString()
  const endpoint = queryStr ? `/api/tasks?${queryStr}` : '/api/tasks'

  const data = await apiGet<Record<string, unknown>[]>(endpoint)
  return (data || []).map(mapRow)
}

export async function getTaskById(id: string): Promise<Task | null> {
  try {
    const data = await apiGet<Record<string, unknown>>(`/api/tasks/${id}`)
    if (!data) return null
    return mapRow(data)
  } catch (err: any) {
    if (err.statusCode === 404) return null
    throw err
  }
}

export async function createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const data = await apiPost<Record<string, unknown>>('/api/tasks', task)
  return mapRow(data)
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<Task> {
  const data = await apiPut<Record<string, unknown>>(`/api/tasks/${id}`, patch)
  return mapRow(data)
}

export async function deleteTask(id: string): Promise<void> {
  await apiDelete(`/api/tasks/${id}`)
}

export async function getTaskActivity(taskId: string): Promise<TaskActivityLogEntry[]> {
  const data = await apiGet<Record<string, unknown>[]>(`/api/tasks/${taskId}/activity`)
  return (data || []).map(mapActivityRow)
}

export async function getAllTaskActivity(): Promise<TaskActivityLogEntry[]> {
  const data = await apiGet<Record<string, unknown>[]>('/api/tasks/activity/all')
  return (data || []).map(mapActivityRow)
}

export async function addTaskActivity(
  taskId: string,
  action: string,
  employeeId?: string | null
): Promise<TaskActivityLogEntry> {
  const data = await apiPost<Record<string, unknown>>(`/api/tasks/${taskId}/activity`, {
    action,
    employeeId,
  })
  return mapActivityRow(data)
}
