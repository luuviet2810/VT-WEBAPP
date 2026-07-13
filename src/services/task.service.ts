import { supabase } from '../lib/supabase'
import type { Task, TaskActivityLogEntry, TaskChecklistItem } from '../types'

export async function getTasks(filters?: {
  status?: Task['status']
  priority?: Task['priority']
  assigneeId?: string
  vehicleId?: string
}): Promise<Task[]> {
  const { status, priority, assigneeId, vehicleId } = filters || {}
  let query = supabase.from('tasks').select('*')

  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (assigneeId) query = query.eq('assignee_id', assigneeId)
  if (vehicleId) query = query.eq('vehicle_id', vehicleId)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error

  return (data as Record<string, unknown>[]).map(mapRow)
}

export async function createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: task.title,
      description: task.description || null,
      checklist: task.checklist || [],
      priority: task.priority || 'low',
      status: task.status || 'todo',
      assignee_id: task.assigneeId || null,
      vehicle_id: task.vehicleId || null,
      due_date: task.dueDate || null,
      due_time: task.dueTime || null,
      rule_id: task.ruleId || null,
    })
    .select()
    .single()

  if (error) throw error

  const taskId = (data as Record<string, unknown>).id as string
  await addTaskActivity(taskId, 'Tạo nhiệm vụ', task.assigneeId ?? null)

  return mapRow(data as Record<string, unknown>)
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<Task> {
  const updateData: Record<string, unknown> = {}

  if (patch.title !== undefined) updateData.title = patch.title
  if (patch.description !== undefined) updateData.description = patch.description || null
  if (patch.checklist !== undefined) updateData.checklist = patch.checklist
  if (patch.priority !== undefined) updateData.priority = patch.priority
  if (patch.status !== undefined) updateData.status = patch.status
  if (patch.assigneeId !== undefined) updateData.assignee_id = patch.assigneeId || null
  if (patch.vehicleId !== undefined) updateData.vehicle_id = patch.vehicleId || null
  if (patch.dueDate !== undefined) updateData.due_date = patch.dueDate || null
  if (patch.dueTime !== undefined) updateData.due_time = patch.dueTime || null

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  const row = data as Record<string, unknown>
  if (patch.status) {
    const label: Record<string, string> = {
      todo: 'Chưa bắt đầu',
      doing: 'Đang thực hiện',
      done: 'Hoàn thành',
    }
    const statusLabel = label[patch.status] || patch.status

    await addTaskActivity(id, `Cập nhật trạng thái: ${statusLabel}`, null)
  }

  return mapRow(row)
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
    user_id: string | null
    created_at: string
  }>).map((row) => ({
    id: row.id,
    taskId: row.task_id,
    action: row.action,
    employeeId: row.user_id,
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
    user_id: string | null
    created_at: string
  }>).map((row) => ({
    id: row.id,
    taskId: row.task_id,
    action: row.action,
    employeeId: row.user_id,
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
      user_id: employeeId || null,
    })
    .select()
    .single()

  if (error) throw error

  const row = data as {
    id: string
    task_id: string
    action: string
    user_id: string | null
    created_at: string
  }
  return {
    id: row.id,
    taskId: row.task_id,
    action: row.action,
    employeeId: row.user_id,
    createdAt: row.created_at,
  }
}

function mapRow(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || undefined,
    checklist: (row.checklist as TaskChecklistItem[]) || [],
    priority: (row.priority as Task['priority']) || 'low',
    status: (row.status as Task['status']) || 'todo',
    assigneeId: (row.assignee_id as string) || undefined,
    vehicleId: (row.vehicle_id as string) || undefined,
    dueDate: (row.due_date as string) || undefined,
    dueTime: (row.due_time as string) || undefined,
    createdAt: row.created_at as string,
  }
}
