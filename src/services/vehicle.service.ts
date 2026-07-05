import { supabase } from '../lib/supabase'
import type { Vehicle } from '../types'

export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Vehicle[]
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as Vehicle
}

export async function createVehicle(vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      plate: vehicle.plate,
      model: vehicle.model,
      year: vehicle.year,
      fuel_type: vehicle.fuelType,
      displacement: vehicle.displacement,
      mileage: vehicle.mileage,
      color: vehicle.color,
      cost_price: vehicle.costPrice,
      sell_price: vehicle.sellPrice,
      status: vehicle.status,
      position_id: vehicle.positionId,
      assignee_id: vehicle.assigneeId,
      note: vehicle.note,
      images: vehicle.images,
      documents: vehicle.documents,
    })
    .select()
    .single()

  if (error) throw error
  return data as Vehicle
}

export async function updateVehicle(id: string, patch: Partial<Vehicle>): Promise<Vehicle> {
  const updateData: Record<string, unknown> = {}

  if (patch.plate !== undefined) updateData.plate = patch.plate
  if (patch.model !== undefined) updateData.model = patch.model
  if (patch.year !== undefined) updateData.year = patch.year
  if (patch.fuelType !== undefined) updateData.fuel_type = patch.fuelType
  if (patch.displacement !== undefined) updateData.displacement = patch.displacement
  if (patch.mileage !== undefined) updateData.mileage = patch.mileage
  if (patch.color !== undefined) updateData.color = patch.color
  if (patch.costPrice !== undefined) updateData.cost_price = patch.costPrice
  if (patch.sellPrice !== undefined) updateData.sell_price = patch.sellPrice
  if (patch.status !== undefined) updateData.status = patch.status
  if (patch.positionId !== undefined) updateData.position_id = patch.positionId
  if (patch.assigneeId !== undefined) updateData.assignee_id = patch.assigneeId
  if (patch.note !== undefined) updateData.note = patch.note
  if (patch.images !== undefined) updateData.images = patch.images
  if (patch.documents !== undefined) updateData.documents = patch.documents

  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('vehicles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Vehicle
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Move vehicle to a position (wrapper)
export async function moveVehicle(vehicleId: string, toPositionId: string | null): Promise<Vehicle> {
  return updateVehicle(vehicleId, { positionId: toPositionId ?? undefined })
}
