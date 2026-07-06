import { supabase } from '../lib/supabase'
import type { Task, TaskActivityLogEntry, TaskChecklistItem } from '../types'

// Map DB row to Task type
function mapRow(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | undefined,
    checklist: (row.checklist as TaskChecklistItem[]) ?? [],
    priority: row.priority as Task['priority'],
    status: row.status as Task['status'],
    assigneeId: row.assignee_id as string | null,
    vehicleId: row.vehicle_id as string | null,
    dueDate: row.due_date as string | null,
    dueTime: row.due_time as string | null,
    ruleId: (row.rule_id as string | undefined) ?? null,
    createdAt: row.created_at as string,
  }
}

export async function getTasks(): Promise<Task[]> {
  const { data, error, status, statusText } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Record<string, unknown>[]).map(mapRow)
}

export async function getTaskById(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return mapRow(data as Record<string, unknown>)
}

export async function createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: task.title,
      description: task.description ?? null,
      checklist: task.checklist,
      priority: task.priority,
      status: task.status,
      assignee_id: task.assigneeId,
      vehicle_id: task.vehicleId,
      due_date: task.dueDate,
      due_time: task.dueTime,
      rule_id: task.ruleId ?? null,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  try {
    await addTaskActivity((data as Record<string, unknown>).id as string, 'Tạo nhiệm vụ', task.assigneeId ?? null)
  } catch (activityError) {
    console.error('🔴 [task.service] Failed to create task activity:', activityError)
  }

  return mapRow(data as Record<string, unknown>)
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<Task> {
  const updateData: Record<string, unknown> = {}

  if (patch.title !== undefined) updateData.title = patch.title
  if (patch.description !== undefined) updateData.description = patch.description ?? null
  if (patch.checklist !== undefined) updateData.checklist = patch.checklist
  if (patch.priority !== undefined) updateData.priority = patch.priority
  if (patch.status !== undefined) updateData.status = patch.status
  if (patch.assigneeId !== undefined) updateData.assignee_id = patch.assigneeId
  if (patch.vehicleId !== undefined) updateData.vehicle_id = patch.vehicleId
  if (patch.dueDate !== undefined) updateData.due_date = patch.dueDate
  if (patch.dueTime !== undefined) updateData.due_time = patch.dueTime
  if (patch.ruleId !== undefined) updateData.rule_id = patch.ruleId

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }
  return mapRow(data as Record<string, unknown>)
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Task activity log
export async function getTaskActivity(taskId: string): Promise<TaskActivityLogEntry[]> {
  const { data, error } = await supabase
    .from('task_activity_logs')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Array<{
    id: string
    task_id: string
    action: string
    employee_id: string | null
    created_at: string
  }>).map((row) => ({
    id: row.id,
    taskId: row.task_id,
    action: row.action,
    employeeId: row.employee_id,
    createdAt: row.created_at,
  }))
}

export async function getAllTaskActivity(): Promise<TaskActivityLogEntry[]> {
  const { data, error } = await supabase
    .from('task_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Array<{
    id: string
    task_id: string
    action: string
    employee_id: string | null
    created_at: string
  }>).map((row) => ({
    id: row.id,
    taskId: row.task_id,
    action: row.action,
    employeeId: row.employee_id,
    createdAt: row.created_at,
  }))
}

export async function addTaskActivity(
  taskId: string,
  action: string,
  employeeId?: string | null
): Promise<TaskActivityLogEntry> {
  const { data, error } = await supabase
    .from('task_activity_logs')
    .insert({
      task_id: taskId,
      action,
      employee_id: employeeId ?? null,
    })
    .select()
    .single()

  if (error) throw error

  const row = data as {
    id: string
    task_id: string
    action: string
    employee_id: string | null
    created_at: string
  }
  return {
    id: row.id,
    taskId: row.task_id,
    action: row.action,
    employeeId: row.employee_id,
    createdAt: row.created_at,
  }
}
