/**
 * Supabase Realtime type definitions
 */

import type { RealtimeChannel } from '@supabase/supabase-js'

// ---- Channel refs ----
export interface RealtimeChannels {
  vehicles: RealtimeChannel | null
  tasks: RealtimeChannel | null
  positions: RealtimeChannel | null
  moveLogs: RealtimeChannel | null
  taskActivity: RealtimeChannel | null
  vehicleImages: RealtimeChannel | null
  vehicleDocs: RealtimeChannel | null
}

// ---- Store update actions passed from hook to service ----
export interface RealtimeStoreActions {
  upsertVehicle: (v: Record<string, unknown>) => void
  deleteVehicle: (id: string) => void
  upsertTask: (t: Record<string, unknown>) => void
  deleteTask: (id: string) => void
  upsertPosition: (p: Record<string, unknown>) => void
  deletePosition: (id: string) => void
  upsertMoveLog: (m: Record<string, unknown>) => void
  upsertTaskActivity: (a: Record<string, unknown>) => void
  upsertVehicleImage: (v: Record<string, unknown>) => void
  deleteVehicleImage: (id: string) => void
  upsertVehicleDoc: (v: Record<string, unknown>) => void
  deleteVehicleDoc: (id: string) => void
  reloadVehicleTimeline: (vehicleId: string) => void
}

// ---- Table name literals ----
export type TableName = 'vehicles' | 'tasks' | 'positions' | 'move_logs' | 'task_activity_logs' | 'vehicle_images' | 'vehicle_documents'
