/**
 * Centralized notification formatter.
 * Every notification renders as:
 *   [Model - Plate] Action
 *   Employee • DD/MM HH:mm
 *
 * Also provides icon color, target route, and target tab for deep linking.
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

/** Parse "2026-07-11T14:24:00" → "11/07 14:24" */
function shortTime(iso: string): string {
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${dd}/${mm} ${hh}:${mi}`
  } catch { return iso }
}

/** Extract vehicle info from notification title/body/data */
function extractVehicle(notif: Notification): { model: string; plate: string } {
  // Try data first
  if (notif.data?.vehicleId) {
    // The store might have set title as "[Model - Plate] Action"
    const match = notif.title.match(/^\[(.+?)\s*-\s*(.+?)\]\s*/)
    if (match) return { model: match[1].trim(), plate: match[2].trim() }
  }
  // Fallback: parse from existing title format
  const match = notif.title.match(/^\[(.+?)\s*-\s*(.+?)\]\s*/)
  if (match) return { model: match[1].trim(), plate: match[2].trim() }
  return { model: '', plate: '' }
}

/** Extract employee name from body */
function extractEmployee(body: string): string {
  const match = body.match(/^(.+?)\s*•/)
  return match ? match[1].trim() : 'Hệ thống'
}

// ====== ACTION TEXT TEMPLATES ======

function actionText(type: NotificationType, title: string, body: string): string {
  switch (type) {
    case 'task_created': {
      // body might be from template: "Cần "Sơn lại..."
      if (body.startsWith('Cần "') || body.startsWith('Cần xử lý')) return body
      // Fallback: extract from title
      const tMatch = title.match(/"(.+?)"/)
      return tMatch ? `Cần "${tMatch[1]}"` : body
    }
    case 'task_done': return body.startsWith('đã hoàn thành') ? body : `đã hoàn thành ${title.replace(/^.+?"(.+?)".*$/, '"$1"')}`
    case 'vehicle_added': return 'Đã nhập bãi'
    case 'vehicle_status': {
      if (body.includes('Đã chuyển sang') || body.includes('chuyển sang')) return body
      if (body.includes('Đã bàn giao') || body.includes('Đã bán')) return 'Đã bàn giao khách'
      return body
    }
    case 'checksheet_in': return 'Đã lưu phiếu Đầu vào'
    case 'checksheet_out': return 'Đã lưu phiếu Đầu ra'
    case 'attendance_edited': return body
    case 'error': return body
    default: return body
  }
}

/** Format employee + timestamp line */
function subtitleLine(notif: Notification): string {
  return `${shortTime(notif.createdAt)}`
}

/** Icon color based on type */
function iconColor(type: NotificationType): string {
  switch (type) {
    case 'task_done':
    case 'checksheet_in':
    case 'checksheet_out':
    case 'vehicle_added':
      return '#34c759' // green
    case 'task_created':
    case 'vehicle_status':
      return '#ff9500' // orange
    default:
      return '#007aff' // blue
  }
}

/** Deep-link target */
function resolveLink(notif: Notification): string | null {
  if (!notif.data?.vehicleId) return null
  const base = `/xe/${notif.data.vehicleId}`
  let tab = 'info'
  switch (notif.type) {
    case 'checksheet_in': tab = 'checksheet'; break
    case 'checksheet_out': tab = 'checksheet'; break
    case 'task_created': tab = 'tasks'; break
    case 'task_done': tab = 'tasks'; break
    case 'vehicle_added': tab = 'info'; break
    case 'vehicle_status': tab = 'history'; break
  }
  return `${base}?tab=${tab}`
}

// ====== MAIN FORMATTER ======

export function formatNotification(notif: Notification): FormattedNotif {
  const { model, plate } = extractVehicle(notif)
  const prefix = model || plate ? `[${model} ${plate}]`.trim() : ''
  const action = actionText(notif.type, notif.title, notif.body)

  return {
    id: notif.id,
    title: `${prefix} ${action}`.trim(),
    subtitle: subtitleLine(notif),
    iconColor: iconColor(notif.type),
    link: resolveLink(notif),
    read: notif.read,
    createdAt: notif.createdAt,
  }
}
