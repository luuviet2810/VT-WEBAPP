import { supabase } from '../lib/supabase'
import type { Vehicle } from '../types'
import { getVehicleImages, getVehicleDocuments } from './vehicleMedia.service'

// ====== HELPERS ======

type VehicleRow = Record<string, unknown>

function mapVehicleRow(v: VehicleRow, images: string[] = [], documents: string[] = []): Vehicle {
  return {
    id: v.id as string,
    plate: v.plate as string,
    model: v.model as string,
    year: v.year as number | undefined,
    fuelType: (v.fuel_type as Vehicle['fuelType']) ?? undefined,
    displacement: v.displacement as string | undefined,
    mileage: v.mileage as string | undefined,
    color: v.color as string | undefined,
    costPrice: v.cost_price as number | undefined,
    sellPrice: v.sell_price as number | undefined,
    status: v.status as Vehicle['status'],
    positionId: v.position_id as string | null,
    assigneeId: v.assignee_id as string | null,
    note: v.note as string | undefined,
    images,
    documents,
    createdAt: v.created_at as string,
    updatedAt: v.updated_at as string,
  }
}

// ====== READ ======

export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error, status, statusText } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!data) return []

  const vehicleRows = data as VehicleRow[]

  // Fetch all images and documents for these vehicles
  const [allImages, allDocs] = await Promise.all([
    supabase.from('vehicle_images').select('vehicle_id, url, sort_order').order('sort_order', { ascending: true }).then(({ data: d }) => d ?? []),
    supabase.from('vehicle_documents').select('vehicle_id, url, sort_order').order('sort_order', { ascending: true }).then(({ data: d }) => d ?? []),
  ])

  // Index by vehicle_id for O(1) lookup
  const imagesByVehicle: Record<string, string[]> = {}
  const docsByVehicle: Record<string, string[]> = {}
  for (const img of allImages) {
    const vid = img.vehicle_id as string
    if (!imagesByVehicle[vid]) imagesByVehicle[vid] = []
    imagesByVehicle[vid].push(img.url as string)
  }
  for (const doc of allDocs) {
    const vid = doc.vehicle_id as string
    if (!docsByVehicle[vid]) docsByVehicle[vid] = []
    docsByVehicle[vid].push(doc.url as string)
  }

  return vehicleRows.map((v) => {
    const vid = v.id as string
    return mapVehicleRow(v, imagesByVehicle[vid] ?? [], docsByVehicle[vid] ?? [])
  })
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

  const v = data as VehicleRow
  const [images, documents] = await Promise.all([
    getVehicleImages(id),
    getVehicleDocuments(id),
  ])

  return mapVehicleRow(
    v,
    images.map((img) => img.url),
    documents.map((doc) => doc.url)
  )
}

export async function getVehicleByPlate(plate: string): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('plate', plate)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const v = data as VehicleRow
  const [images, documents] = await Promise.all([
    getVehicleImages(v.id as string),
    getVehicleDocuments(v.id as string),
  ])

  return mapVehicleRow(
    v,
    images.map((img) => img.url),
    documents.map((doc) => doc.url)
  )
}

// ====== CREATE ======

export async function createVehicle(vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> & { images?: string[]; documents?: string[] }): Promise<Vehicle> {
  const payload = {
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
  }
  const result = await supabase
    .from('vehicles')
    .insert(payload)
    .select()
    .single()

  if (result.error) throw result.error
  if (!result.data) throw new Error('No data returned from insert')

  // Return with empty media arrays — store handles uploading separately
  return mapVehicleRow(result.data as VehicleRow, [], [])
}

// ====== UPDATE ======

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
  // NOTE: images and documents are NOT columns in vehicles table

  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('vehicles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  const v = data as VehicleRow
  const [images, documents] = await Promise.all([
    getVehicleImages(id),
    getVehicleDocuments(id),
  ])

  return mapVehicleRow(
    v,
    images.map((img) => img.url),
    documents.map((doc) => doc.url)
  )
}

// ====== DELETE ======

export async function deleteVehicle(id: string): Promise<void> {
  // CASCADE will auto-delete vehicle_images and vehicle_documents rows
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

// ====== UPSERT (import) ======

export interface UpsertVehicleInput {
  plate: string
  model?: string | null
  year?: number | null
  fuelType?: string | null
  displacement?: string | null
  mileage?: string | null
  color?: string | null
  costPrice?: number | null
  sellPrice?: number | null
  status?: string | null
}

/**
 * Upsert a vehicle by plate.
 * - If plate exists → UPDATE only the provided fields (COALESCE).
 * - If plate does not exist → INSERT with fallback defaults.
 *
 * Never modifies: id, created_at, images, documents, check_sheets, tasks,
 * workflow_logs, move_logs, position history, or any relationship.
 */
export async function upsertVehicle(data: UpsertVehicleInput): Promise<'inserted' | 'updated'> {
  const { data: existing } = await supabase
    .from('vehicles')
    .select('id')
    .eq('plate', data.plate)
    .maybeSingle()

  if (existing) {
    // UPDATE — only set fields that are explicitly provided
    const patch: Record<string, unknown> = {}
    if (data.model != null) patch.model = data.model
    if (data.year != null) patch.year = data.year
    if (data.fuelType != null) patch.fuel_type = data.fuelType
    if (data.displacement != null) patch.displacement = data.displacement
    if (data.mileage != null) patch.mileage = data.mileage
    if (data.color != null) patch.color = data.color
    if (data.costPrice != null) patch.cost_price = data.costPrice
    if (data.sellPrice != null) patch.sell_price = data.sellPrice
    if (data.status != null) patch.status = data.status
    patch.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('vehicles')
      .update(patch)
      .eq('id', existing.id)

    if (error) throw error
    return 'updated'
  }

  // INSERT — use fallback defaults for NOT NULL columns
  const { error } = await supabase
    .from('vehicles')
    .insert({
      plate: data.plate,
      model: data.model ?? 'Không xác định',
      year: data.year ?? null,
      fuel_type: data.fuelType ?? null,
      displacement: data.displacement ?? null,
      mileage: data.mileage ?? null,
      color: data.color ?? null,
      cost_price: data.costPrice ?? null,
      sell_price: data.sellPrice ?? null,
      status: data.status ?? 'available',
    })

  if (error) throw error
  return 'inserted'
}
