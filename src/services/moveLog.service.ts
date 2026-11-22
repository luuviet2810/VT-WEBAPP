import { apiGet, apiPost } from './api.client'
import type { MoveLog } from '../types'

function mapRow(row: Record<string, unknown>): MoveLog {
  return {
    id: row.id as string,
    vehicleId: (row.vehicle_id as string) ?? (row.vehicleId as string),
    fromPositionId: (row.from_position_id as string | null) ?? (row.fromPositionId as string | null) ?? null,
    toPositionId: (row.to_position_id as string) ?? (row.toPositionId as string),
    employeeId: (row.user_id as string | null) ?? (row.employeeId as string | null) ?? null,
    createdAt: (row.created_at as string) ?? (row.createdAt as string),
  }
}

export async function getMoveLogs(): Promise<MoveLog[]> {
  const data = await apiGet<Record<string, unknown>[]>('/api/move-logs')
  return (data || []).map(mapRow)
}

export async function getMoveLogsByVehicle(vehicleId: string): Promise<MoveLog[]> {
  const data = await apiGet<Record<string, unknown>[]>(`/api/move-logs?vehicleId=${encodeURIComponent(vehicleId)}`)
  return (data || []).map(mapRow)
}

export async function createMoveLog(
  log: Omit<MoveLog, 'id' | 'createdAt'>
): Promise<MoveLog> {
  const data = await apiPost<Record<string, unknown>>('/api/move-logs', log)
  return mapRow(data)
}
