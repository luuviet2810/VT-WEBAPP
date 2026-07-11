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
 *
 * Uses a single atomic INSERT ... ON CONFLICT (plate) DO UPDATE SET
 * to avoid race conditions during concurrent imports.
 *
 * - Plate exists → UPDATE every provided field.
 * - Plate missing → INSERT with fallback defaults for NOT NULL columns.
 *
 * Never modifies: id, created_at, images, documents, check_sheets, tasks,
 * workflow_logs, move_logs, position history, or any relationship.
 */
export async function upsertVehicle(data: UpsertVehicleInput): Promise<'inserted' | 'updated'> {
  // Build the upsert record.
  // Supabase JS serialises to JSON — keys with undefined are dropped
  // by JSON.stringify, so they are omitted from the INSERT/UPDATE entirely.
  // model/status are always included (NOT NULL columns need fallbacks).
  const record: Record<string, unknown> = {
    plate: data.plate,
    model: data.model ?? 'Không xác định',
    status: data.status ?? 'available',
    updated_at: new Date().toISOString(),
  }

  // Optional fields — only included when the caller supplies a value.
  // When omitted:
  //   INSERT → column gets its DEFAULT (NULL for nullable cols).
  //   UPDATE → column is not in the SET clause → unchanged.
  if (data.year != null) record.year = data.year
  if (data.fuelType != null) record.fuel_type = data.fuelType
  if (data.displacement != null) record.displacement = data.displacement
  if (data.mileage != null) record.mileage = data.mileage
  if (data.color != null) record.color = data.color
  if (data.costPrice != null) record.cost_price = data.costPrice
  if (data.sellPrice != null) record.sell_price = data.sellPrice

  const { error, status } = await supabase
    .from('vehicles')
    .upsert(record, { onConflict: 'plate' })

  if (error) throw error

  // Detect whether a row was inserted or updated:
  //  201 = Created (INSERT)
  //  200 = OK      (UPDATE — row existed)
  return status === 201 ? 'inserted' : 'updated'
}
