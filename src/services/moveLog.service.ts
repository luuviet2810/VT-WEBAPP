import { supabase } from '../lib/supabase'
import type { MoveLog } from '../types'

function mapRow(row: Record<string, unknown>): MoveLog {
  return {
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    fromPositionId: row.from_position_id as string | null,
    toPositionId: row.to_position_id as string,
    employeeId: row.user_id as string | null,
    createdAt: row.created_at as string,
  }
}

export async function getMoveLogs(): Promise<MoveLog[]> {
  const { data, error } = await supabase
    .from('move_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Record<string, unknown>[]).map(mapRow)
}

export async function getMoveLogsByVehicle(vehicleId: string): Promise<MoveLog[]> {
  const { data, error } = await supabase
    .from('move_logs')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data as Record<string, unknown>[]).map(mapRow)
}

export async function createMoveLog(
  log: Omit<MoveLog, 'id' | 'createdAt'>
): Promise<MoveLog> {
  console.log('🟢 [moveLog.service] CREATE MOVE LOG', {
    vehicleId: log.vehicleId,
    from: log.fromPositionId,
    to: log.toPositionId,
  })

  const { data, error } = await supabase
    .from('move_logs')
    .insert({
      vehicle_id: log.vehicleId,
      from_position_id: log.fromPositionId,
      to_position_id: log.toPositionId,
      user_id: log.employeeId || null,
    })
    .select()
    .single()

  if (error) {
    console.error('🔴 [moveLog.service] CREATE MOVE LOG ERROR:', error)
    throw error
  }

  console.log('🟢 [moveLog.service] CREATE MOVE LOG SUCCESS:', (data as Record<string, unknown>).id)
  return mapRow(data as Record<string, unknown>)
}
