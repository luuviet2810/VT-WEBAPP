/**
 * Vehicle Workflow Service
 *
 * Persists vehicle workflow status changes to the `vehicle_workflow_logs` table.
 */

import { supabase } from '../lib/supabase'
import type { VehicleWorkflowStatus } from '../types'

export interface VehicleWorkflowLog {
  id: string
  vehicleId: string
  status: VehicleWorkflowStatus
  createdAt: string
  createdBy: string | null
}

export async function getVehicleWorkflowLogs(vehicleId: string): Promise<VehicleWorkflowLog[]> {
  const { data, error } = await supabase
    .from('vehicle_workflow_logs')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    status: row.status as VehicleWorkflowStatus,
    createdAt: row.created_at as string,
    createdBy: (row.created_by as string) ?? null,
  }))
}

export async function addVehicleWorkflowLog(
  vehicleId: string,
  status: VehicleWorkflowStatus,
  createdBy?: string | null
): Promise<VehicleWorkflowLog> {
  const { data, error } = await supabase
    .from('vehicle_workflow_logs')
    .insert({ vehicle_id: vehicleId, status })
    .select()
    .single()

  if (error) throw error
  return {
    id: data.id as string,
    vehicleId: data.vehicle_id as string,
    status: data.status as VehicleWorkflowStatus,
    createdAt: data.created_at as string,
    createdBy: (data.created_by as string) ?? null,
  }
}
