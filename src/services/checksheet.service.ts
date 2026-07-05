import { supabase } from '../lib/supabase'
import type { CheckSheet } from '../types'

function mapRow(row: Record<string, unknown>): CheckSheet {
  return {
    id: row.id as string,
    vehicleId: row.vehicle_id as string,
    type: row.type as 'in' | 'out',
    checkerId: row.checker_id as string | null,
    checkDate: row.check_date as string,
    fuelLevel: row.fuel_level as CheckSheet['fuelLevel'],
    screen: row.screen as CheckSheet['screen'],
    rearCamera: row.rear_camera as CheckSheet['rearCamera'],
    hipass: row.hipass as CheckSheet['hipass'],
    rearSensor: row.rear_sensor as CheckSheet['rearSensor'],
    dashcam: row.dashcam as CheckSheet['dashcam'],
    interior: row.interior as CheckSheet['interior'],
    exterior: row.exterior as CheckSheet['exterior'],
    exteriorPhotos: row.exterior_photos as CheckSheet['exteriorPhotos'],
    outCheck: row.out_check as CheckSheet['outCheck'],
    outNotes: row.out_notes as string | undefined,
    createdAt: row.created_at as string,
  }
}

export async function getCheckSheets(): Promise<CheckSheet[]> {
  const { data, error } = await supabase
    .from('check_sheets')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Record<string, unknown>[]).map(mapRow)
}

export async function getCheckSheetsByVehicle(vehicleId: string): Promise<CheckSheet[]> {
  const { data, error } = await supabase
    .from('check_sheets')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Record<string, unknown>[]).map(mapRow)
}

export async function getCheckSheetById(id: string): Promise<CheckSheet | null> {
  const { data, error } = await supabase
    .from('check_sheets')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return mapRow(data as Record<string, unknown>)
}

export async function createCheckSheet(
  sheet: Omit<CheckSheet, 'id' | 'createdAt'>
): Promise<CheckSheet> {
  const { data, error } = await supabase
    .from('check_sheets')
    .insert({
      vehicle_id: sheet.vehicleId,
      type: sheet.type,
      checker_id: sheet.checkerId,
      check_date: sheet.checkDate,
      fuel_level: sheet.fuelLevel,
      screen: sheet.screen,
      rear_camera: sheet.rearCamera,
      hipass: sheet.hipass,
      rear_sensor: sheet.rearSensor,
      dashcam: sheet.dashcam,
      interior: sheet.interior,
      exterior: sheet.exterior,
      exterior_photos: sheet.exteriorPhotos,
      out_check: sheet.outCheck,
      out_notes: sheet.outNotes,
    })
    .select()
    .single()

  if (error) throw error
  return mapRow(data as Record<string, unknown>)
}

export async function updateCheckSheet(
  id: string,
  patch: Partial<CheckSheet>
): Promise<CheckSheet> {
  const updateData: Record<string, unknown> = {}

  if (patch.vehicleId !== undefined) updateData.vehicle_id = patch.vehicleId
  if (patch.type !== undefined) updateData.type = patch.type
  if (patch.checkerId !== undefined) updateData.checker_id = patch.checkerId
  if (patch.checkDate !== undefined) updateData.check_date = patch.checkDate
  if (patch.fuelLevel !== undefined) updateData.fuel_level = patch.fuelLevel
  if (patch.screen !== undefined) updateData.screen = patch.screen
  if (patch.rearCamera !== undefined) updateData.rear_camera = patch.rearCamera
  if (patch.hipass !== undefined) updateData.hipass = patch.hipass
  if (patch.rearSensor !== undefined) updateData.rear_sensor = patch.rearSensor
  if (patch.dashcam !== undefined) updateData.dashcam = patch.dashcam
  if (patch.interior !== undefined) updateData.interior = patch.interior
  if (patch.exterior !== undefined) updateData.exterior = patch.exterior
  if (patch.exteriorPhotos !== undefined) updateData.exterior_photos = patch.exteriorPhotos
  if (patch.outCheck !== undefined) updateData.out_check = patch.outCheck
  if (patch.outNotes !== undefined) updateData.out_notes = patch.outNotes

  const { data, error } = await supabase
    .from('check_sheets')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapRow(data as Record<string, unknown>)
}

export async function deleteCheckSheet(id: string): Promise<void> {
  const { error } = await supabase
    .from('check_sheets')
    .delete()
    .eq('id', id)

  if (error) throw error
}
