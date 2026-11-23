/**
 * Notification Service (Decoupled Mode)
 *
 * Tính năng thông báo hiện tại đang tạm tắt trên giao diện (NotificationCenter).
 * File service này hoạt động ở chế độ decoupled an toàn không kết nối Supabase.
 */

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
      action = `Tạo nhiệm vụ: ${data.taskName || ''}`
      break
    case 'TASK_UPDATED':
      action = `Cập nhật nhiệm vụ: ${data.taskName || ''}`
      break
    case 'TASK_COMPLETED':
      action = `Hoàn thành nhiệm vụ: ${data.taskName || ''}`
      break
    case 'TASK_ASSIGNED':
      action = `Giao việc: ${data.taskName || ''}`
      break
    case 'PHOTO_ADDED':
      action = `Thêm ${data.count || 1} ảnh xe`
      break
    case 'DOCUMENT_ADDED':
      action = `Thêm ${data.count || 1} tài liệu xe`
      break
    case 'VEHICLE_SOLD':
      action = 'Đã xuất bán xe'
      break
  }

  const title = prefix ? `${prefix} ${action}` : action
  const body = `${employee} • ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`

  return { title, body }
}

export async function createEvent(_event: EventType, _data: EventPayload): Promise<Notification | null> {
  // Notifications currently decoupled from Supabase
  return null
}

export async function getNotifications(): Promise<Notification[]> {
  return []
}

export async function markNotificationRead(_id: string): Promise<void> {
  return
}

export async function markAllNotificationsRead(): Promise<void> {
  return
}

export async function deleteNotification(_id: string): Promise<void> {
  return
}
