/**
 * Centralized Supabase Realtime Manager
 *
 * Subscribes to database changes for: vehicles, tasks, positions, move_logs,
 * task_activity_logs, vehicle_images, vehicle_documents.
 *
 * All subscriptions are started by `subscribe()` and stopped by `unsubscribe()`.
 * Call `subscribe()` when the user is authenticated, `unsubscribe()` on logout.
 *
 * This module owns the Supabase Realtime channel lifecycle.
 * It does NOT know about React or Zustand — it receives raw DB rows and
 * calls back into store actions via `RealtimeStoreActions`.
 */

import { supabase } from '../lib/supabase'
import type {
  RealtimeChannels,
  RealtimeStoreActions,
  TableName,
} from '../types/realtime'

const CHANNELS: RealtimeChannels = {
  vehicles: null,
  tasks: null,
  positions: null,
  moveLogs: null,
  taskActivity: null,
  vehicleImages: null,
  vehicleDocs: null,
}

let isSubscribed = false

// ---- Helpers ----

function tableChannel(table: TableName): keyof RealtimeChannels {
  const map: Record<TableName, keyof RealtimeChannels> = {
    vehicles: 'vehicles',
    tasks: 'tasks',
    positions: 'positions',
    move_logs: 'moveLogs',
    task_activity_logs: 'taskActivity',
    vehicle_images: 'vehicleImages',
    vehicle_documents: 'vehicleDocs',
  }
  return map[table]
}

// ---- Subscribe / Unsubscribe ----

export function subscribe(store: RealtimeStoreActions): void {
  if (isSubscribed) return
  isSubscribed = true

  // ====== VEHICLES ======
  CHANNELS.vehicles = supabase
    .channel('realtime-vehicles')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'vehicles' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          store.deleteVehicle(payload.old.id as string)
        } else {
          const newRow = payload.new as Record<string, unknown>
          store.upsertVehicle(newRow)
          // Reload timeline for the affected vehicle
          const vehicleId = newRow.id as string | undefined
          if (vehicleId) store.reloadVehicleTimeline(vehicleId)
        }
      }
    )
    .subscribe()

  // ====== TASKS ======
  CHANNELS.tasks = supabase
    .channel('realtime-tasks')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          store.deleteTask(payload.old.id as string)
        } else {
          const newRow = payload.new as Record<string, unknown>
          store.upsertTask(newRow)
          // Reload timeline for the affected vehicle
          const vehicleId = newRow.vehicle_id as string | undefined
          if (vehicleId) store.reloadVehicleTimeline(vehicleId)
        }
      }
    )
    .subscribe()

  // ====== POSITIONS ======
  CHANNELS.positions = supabase
    .channel('realtime-positions')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'positions' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          store.deletePosition(payload.old.id as string)
        } else {
          store.upsertPosition(payload.new as Record<string, unknown>)
        }
      }
    )
    .subscribe()

  // ====== MOVE LOGS ======
  CHANNELS.moveLogs = supabase
    .channel('realtime-movelogs')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'move_logs' },
      (payload) => {
        store.upsertMoveLog(payload.new as Record<string, unknown>)
        // Reload timeline for the affected vehicle
        const vehicleId = (payload.new as Record<string, unknown>).vehicle_id as string | undefined
        if (vehicleId) store.reloadVehicleTimeline(vehicleId)
      }
    )
    .subscribe()

  // ====== TASK ACTIVITY LOGS ======
  CHANNELS.taskActivity = supabase
    .channel('realtime-taskactivity')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'task_activity_logs' },
      (payload) => {
        store.upsertTaskActivity(payload.new as Record<string, unknown>)
        // Reload timeline for the affected task's vehicle
        const taskId = (payload.new as Record<string, unknown>).task_id as string | undefined
        if (taskId) store.reloadVehicleTimeline(taskId) // harmless if no match
      }
    )
    .subscribe()

  // ====== VEHICLE IMAGES ======
  CHANNELS.vehicleImages = supabase
    .channel('realtime-vehicleimages')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'vehicle_images' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          store.deleteVehicleImage(payload.old.id as string)
        } else {
          store.upsertVehicleImage(payload.new as Record<string, unknown>)
        }
      }
    )
    .subscribe()

  // ====== VEHICLE DOCUMENTS ======
  CHANNELS.vehicleDocs = supabase
    .channel('realtime-vehicledocs')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'vehicle_documents' },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          store.deleteVehicleDoc(payload.old.id as string)
        } else {
          store.upsertVehicleDoc(payload.new as Record<string, unknown>)
        }
      }
    )
    .subscribe()
}

export function unsubscribe(): void {
  if (!isSubscribed) return
  isSubscribed = false

  const channels = Object.values(CHANNELS) as NonNullable<typeof CHANNELS.vehicles>[]
  for (const channel of channels) {
    if (channel) supabase.removeChannel(channel)
  }

  CHANNELS.vehicles = null
  CHANNELS.tasks = null
  CHANNELS.positions = null
  CHANNELS.moveLogs = null
  CHANNELS.taskActivity = null
  CHANNELS.vehicleImages = null
  CHANNELS.vehicleDocs = null
}

export function isActive(): boolean {
  return isSubscribed
}
