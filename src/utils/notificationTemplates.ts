/**
 * Notification creators.
 *
 * Every notification carries structured data in the `data` field.
 * The formatter reads ONLY from `type` + `data` — never from `title` or `body`.
 */

import type { NotificationType } from '../types'

export interface NotifData {
  vehicleId?: string
  vehicleModel?: string
  plateNumber?: string
  employeeName?: string
  taskId?: string
  taskName?: string
  locationName?: string
  imageCount?: number
  checksheetId?: string
  tab?: string
}

export interface NotifInput {
  type: NotificationType
  title: string  // kept for DB compatibility — formatter ignores this
  body: string   // kept for DB compatibility — formatter ignores this
  data: NotifData
}

// ====== CREATORS ======

export function checksheetSaved(
  vehicleId: string, model: string, plate: string, type: 'in' | 'out', employeeName: string
): NotifInput {
  return {
    type: type === 'in' ? 'checksheet_in' : 'checksheet_out',
    title: '',
    body: '',
    data: { vehicleId, vehicleModel: model, plateNumber: plate, employeeName, tab: 'checksheet' },
  }
}

export function taskCreated(
  vehicleId: string, model: string, plate: string, taskName: string, taskId: string
): NotifInput {
  return {
    type: 'task_created',
    title: '',
    body: '',
    data: { vehicleId, vehicleModel: model, plateNumber: plate, taskName, taskId, tab: 'tasks' },
  }
}

export function taskCompleted(
  vehicleId: string, model: string, plate: string, taskName: string, taskId: string, employeeName: string
): NotifInput {
  return {
    type: 'task_done',
    title: '',
    body: '',
    data: { vehicleId, vehicleModel: model, plateNumber: plate, taskName, taskId, employeeName, tab: 'tasks' },
  }
}

export function vehicleMoved(
  vehicleId: string, model: string, plate: string, locationName: string, employeeName: string
): NotifInput {
  return {
    type: 'vehicle_status',
    title: '',
    body: '',
    data: { vehicleId, vehicleModel: model, plateNumber: plate, locationName, employeeName, tab: 'history' },
  }
}

export function vehicleAdded(
  vehicleId: string, model: string, plate: string, employeeName: string
): NotifInput {
  return {
    type: 'vehicle_added',
    title: '',
    body: '',
    data: { vehicleId, vehicleModel: model, plateNumber: plate, employeeName },
  }
}
