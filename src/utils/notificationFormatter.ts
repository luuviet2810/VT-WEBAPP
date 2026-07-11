/**
 * Centralized notification formatter.
 *
 * Builds every notification display from notification.type + notification.data ONLY.
 * NEVER reads notification.title or notification.body.
 *
 * Output format:
 *   [Model - Plate] Action
 *   Employee • DD/MM HH:mm
 */

import type { Notification, NotificationType } from '../types'

export interface FormattedNotif {
  id: string
  title: string
  subtitle: string
  iconColor: string
  link: string | null
  read: boolean
  createdAt: string
}

function shortTime(iso: string): string {
  try {
    const d = new Date(iso)
    return [
      String(d.getDate()).padStart(2, '0'),
      '/',
      String(d.getMonth() + 1).padStart(2, '0'),
      ' ',
      String(d.getHours()).padStart(2, '0'),
      ':',
      String(d.getMinutes()).padStart(2, '0'),
    ].join('')
  } catch { return iso }
}

/** Build action text purely from type + data */
function actionText(type: NotificationType, data: Notification['data']): string {
  switch (type) {
    case 'checksheet_in':
      return 'Đã lưu phiếu Đầu vào'
    case 'checksheet_out':
      return 'Đã lưu phiếu Đầu ra'
    case 'task_created':
      return `Cần "${data?.taskName || ''}"`
    case 'task_done':
      return `Đã hoàn thành "${data?.taskName || ''}"`
    case 'vehicle_status':
      return data?.locationName
        ? `Đã chuyển sang ${data.locationName}`
        : 'Đã chuyển vị trí'
    case 'vehicle_added':
      return 'Đã nhập bãi'
    case 'attendance_edited':
      return 'Đã cập nhật chấm công'
    default:
      return ''
  }
}

function iconColor(type: NotificationType): string {
  switch (type) {
    case 'task_done':
    case 'checksheet_in':
    case 'checksheet_out':
    case 'vehicle_added':
      return '#34c759'
    case 'task_created':
    case 'vehicle_status':
      return '#ff9500'
    default:
      return '#007aff'
  }
}

function resolveLink(notif: Notification): string | null {
  if (!notif.data?.vehicleId) return null
  const base = `/xe/${notif.data.vehicleId}`
  let tab = 'info'
  switch (notif.type) {
    case 'checksheet_in': case 'checksheet_out': tab = 'checksheet'; break
    case 'task_created': case 'task_done': tab = 'tasks'; break
    case 'vehicle_status': tab = 'history'; break
  }
  return `${base}?tab=${tab}`
}

/** Build vehicle prefix from data */
function vehiclePrefix(data: Notification['data']): string {
  if (data?.vehicleModel || data?.plateNumber) {
    return `[${data.vehicleModel || ''} ${data.plateNumber || ''}]`.trim()
  }
  return ''
}

/** Build employee line */
function employeeLine(notif: Notification): string {
  const name = notif.data?.employeeName || 'Hệ thống'
  return `${name} • ${shortTime(notif.createdAt)}`
}

// ====== MAIN ======

export function formatNotification(notif: Notification): FormattedNotif {
  const prefix = vehiclePrefix(notif.data)
  const action = actionText(notif.type, notif.data)

  return {
    id: notif.id,
    title: `${prefix} ${action}`.trim(),
    subtitle: employeeLine(notif),
    iconColor: iconColor(notif.type),
    link: resolveLink(notif),
    read: notif.read,
    createdAt: notif.createdAt,
  }
}
