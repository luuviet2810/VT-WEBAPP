/**
 * Standardized notification templates for garage operations.
 *
 * Every notification:
 * 1. Has business-language message (not technical)
 * 2. Carries deep-link data for navigation
 * 3. Has priority color: red (urgent), amber (info), green (done)
 * 4. Only real events — no "save success" noise
 */

import type { NotificationType } from '../types'

export type NotifPriority = 'red' | 'amber' | 'green'

export interface NotifInput {
  type: NotificationType
  title: string
  body: string
  data?: { vehicleId?: string; taskId?: string; checksheetId?: string; tab?: string }
}

/** Helper: get employee name from store */
let _getEmployeeName: (() => string) | null = null
export function bindGetEmployeeName(fn: () => string) {
  _getEmployeeName = fn
}
function emp() { return _getEmployeeName?.() ?? 'Hệ thống' }

/** Helper: format plate + model */
function v(plate?: string, model?: string) {
  const parts = [plate, model].filter(Boolean)
  return parts.join(' ') || 'Xe không xác định'
}

/** Helper: format count */
function n(count: number, singular: string, plural: string) {
  return count > 1 ? `${count} ${plural}` : `${count} ${singular}`
}

// ====== TEMPLATES ======

export function taskCreated(plate?: string, model?: string, taskTitle?: string, count?: number): NotifInput {
  return {
    type: 'task_created',
    title: `🛠️ ${v(plate, model)}`,
    body: count && count > 1
      ? `Cần xử lý ${n(count, 'hạng mục', 'hạng mục')}`
      : `Cần "${taskTitle || ''}"`,
    data: { tab: 'tasks' },
  }
}

export function taskCompleted(plate?: string, model?: string, taskTitle?: string): NotifInput {
  return {
    type: 'task_done',
    title: `✅ ${v(plate, model)}`,
    body: `${emp()} đã hoàn thành "${taskTitle || ''}"`,
    data: { tab: 'tasks' },
  }
}

export function taskAdded(plate?: string, model?: string, taskTitle?: string): NotifInput {
  return {
    type: 'task_created',
    title: `📋 ${v(plate, model)}`,
    body: `${emp()} đã thêm nhiệm vụ "${taskTitle || ''}"`,
    data: { tab: 'tasks' },
  }
}

export function vehicleMoved(plate?: string, model?: string, toPosition?: string): NotifInput {
  return {
    type: 'vehicle_status',
    title: `🚗 ${v(plate, model)}`,
    body: toPosition ? `Đã chuyển sang ${toPosition}` : 'Đã chuyển vị trí',
    data: { tab: 'history' },
  }
}

export function vehicleAdded(plate?: string, model?: string): NotifInput {
  return {
    type: 'vehicle_added',
    title: `📦 ${v(plate, model)}`,
    body: 'Đã nhập bãi',
    data: { tab: 'info' },
  }
}

export function checksheetCompleted(plate?: string, model?: string, type?: 'in' | 'out', issueCount?: number): NotifInput {
  const label = type === 'in' ? 'đầu vào' : 'đầu ra'
  return {
    type: type === 'in' ? 'checksheet_in' : 'checksheet_out',
    title: `📋 ${v(plate, model)}`,
    body: issueCount && issueCount > 0
      ? `Đã hoàn thành kiểm tra ${label} — Phát hiện ${n(issueCount, 'hạng mục', 'hạng mục')} cần xử lý`
      : `Đã hoàn thành kiểm tra ${label}`,
    data: { tab: 'checksheet' },
  }
}

export const PRIORITY: Record<string, NotifPriority> = {
  task_created: 'red',
  task_done: 'green',
  vehicle_added: 'green',
  vehicle_status: 'amber',
  checksheet_in: 'amber',
  checksheet_out: 'amber',
  attendance_edited: 'amber',
  system: 'amber',
}
