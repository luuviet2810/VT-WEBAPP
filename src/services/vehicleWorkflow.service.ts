import { apiGet, apiPost } from './api.client'
import type { VehicleWorkflowStatus } from '../types'

export interface VehicleWorkflowLog {
  id: string
  vehicleId: string
  status: VehicleWorkflowStatus
  createdAt: string
  createdBy: string | null
}

export async function getVehicleWorkflowLogs(vehicleId: string): Promise<VehicleWorkflowLog[]> {
  const data = await apiGet<any[]>(`/api/vehicles/${vehicleId}/workflow-logs`)
  return (data ?? []).map((row) => ({
    id: row.id as string,
    vehicleId: (row.vehicleId || row.vehicle_id) as string,
    status: row.status as VehicleWorkflowStatus,
    createdAt: (row.createdAt || row.created_at) as string,
    createdBy: (row.createdBy || row.created_by) ?? null,
  }))
}

export async function addVehicleWorkflowLog(
  vehicleId: string,
  status: VehicleWorkflowStatus,
  createdBy?: string | null
): Promise<VehicleWorkflowLog> {
  const data = await apiPost<any>(`/api/vehicles/${vehicleId}/workflow-logs`, {
    status,
    createdBy,
  })
  return {
    id: data.id as string,
    vehicleId: (data.vehicleId || data.vehicle_id) as string,
    status: data.status as VehicleWorkflowStatus,
    createdAt: (data.createdAt || data.created_at) as string,
    createdBy: (data.createdBy || data.created_by) ?? null,
  }
}
