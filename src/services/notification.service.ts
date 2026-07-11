import { supabase } from '../lib/supabase'
import type { Notification, NotificationType } from '../types'

// ====== TYPES ======

export type EventType =
  | 'INPUT_SAVED'
  | 'OUTPUT_SAVED'
  | 'LOCATION_CHANGED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_COMPLETED'
  | 'TASK_ASSIGNED'
  | 'PHOTO_ADDED'
  | 'DOCUMENT_ADDED'
  | 'VEHICLE_SOLD'

export interface EventPayload {
  vehicleId?: string
  vehicleModel?: string
  plateNumber?: string
  taskName?: string
  taskId?: string
  employeeName?: string
  locationName?: string
  count?: number
}

// ====== EVENT → NOTIFICATION TYPE MAP ======

const EVENT_TYPE_MAP: Record<EventType, NotificationType> = {
  INPUT_SAVED: 'checksheet_in',
  OUTPUT_SAVED: 'checksheet_out',
  LOCATION_CHANGED: 'vehicle_status',
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_created',
  TASK_COMPLETED: 'task_done',
  TASK_ASSIGNED: 'task_created',
  PHOTO_ADDED: 'system',
  DOCUMENT_ADDED: 'system',
  VEHICLE_SOLD: 'vehicle_status',
}

// ====== EVENT → FORMATTED TEXT ======

function formatEvent(event: EventType, data: EventPayload): { title: string; body: string } {
  const prefix = `[${data.vehicleModel || ''} ${data.plateNumber || ''}]`.trim()
  const employee = data.employeeName || 'Hệ thống'

  let action = ''
  switch (event) {
    case 'INPUT_SAVED':
      action = 'Đã lưu phiếu Đầu vào'
      break
    case 'OUTPUT_SAVED':
      action = 'Đã lưu phiếu Đầu ra'
      break
    case 'LOCATION_CHANGED':
      action = data.locationName ? `Đã chuyển sang ${data.locationName}` : 'Đã chuyển vị trí'
      break
    case 'TASK_CREATED':
      action = `Cần "${data.taskName || ''}"`
      break
    case 'TASK_UPDATED':
      action = `Đã cập nhật "${data.taskName || ''}"`
      break
    case 'TASK_COMPLETED':
      action = `Đã hoàn thành "${data.taskName || ''}"`
      break
    case 'TASK_ASSIGNED':
      action = `Đã giao "${data.taskName || ''}" cho ${data.employeeName || ''}`
      break
    case 'PHOTO_ADDED':
      action = data.count ? `Đã thêm ${data.count} ảnh` : 'Đã thêm ảnh'
      break
    case 'DOCUMENT_ADDED':
      action = 'Đã thêm giấy tờ'
      break
    case 'VEHICLE_SOLD':
      action = 'Đã chuyển sang trạng thái Đã bán'
      break
  }

  return {
    title: `${prefix} ${action}`.trim(),
    body: `${employee} • ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
  }
}

// ====== VALIDATION ======

function validate(event: EventType, data: EventPayload): boolean {
  if (!data.vehicleModel || !data.plateNumber) {
    console.warn(`[notif] Drop ${event}: missing vehicle info`, data)
    return false
  }
  if (['TASK_CREATED', 'TASK_UPDATED', 'TASK_COMPLETED', 'TASK_ASSIGNED'].includes(event) && !data.taskName) {
    console.warn(`[notif] Drop ${event}: missing taskName`, data)
    return false
  }
  return true
}

// ====== MAIN API ======

/**
 * Create a notification from an event + payload.
 * This is the SINGLE entry point for all notifications.
 * No other module may create notifications directly.
 */
export async function createEvent(event: EventType, data: EventPayload): Promise<Notification | null> {
  if (!validate(event, data)) return null

  const { title, body } = formatEvent(event, data)
  const notifType = EVENT_TYPE_MAP[event]

  const { data: result, error } = await supabase
    .from('notifications')
    .insert({
      type: notifType,
      title,
      body,
      data: { ...data, event },
      read: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[notif] Insert failed:', error)
    return null
  }

  return mapRow(result as Record<string, unknown>)
}

// ====== READ / MARK ======

function mapRow(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    type: row.type as NotificationType,
    title: row.title as string,
    body: row.body as string,
    read: row.read as boolean,
    createdAt: row.created_at as string,
    data: (row as any).data ?? undefined,
  }
}

export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Record<string, unknown>[]).map(mapRow)
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)

  if (error) throw error
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false)

  if (error) throw error
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)

  if (error) throw error
}
