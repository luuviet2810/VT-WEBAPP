import { supabase } from '../lib/supabase'
import type { Vehicle } from '../types'
import { getVehicleImages, getVehicleDocuments } from './vehicleMedia.service'

// ====== HELPERS ======

type VehicleRow = Record<string, unknown>

/** Canonical Vietnamese values; keep legacy English rows readable. */
export function fuelTypeFromDb(value: unknown): Vehicle['fuelType'] | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const aliases: Record<string, Vehicle['fuelType']> = {
    gasoline: 'Xăng', diesel: 'Dầu', lpg: 'Ga', hybrid: 'Hybrid', electric: 'Điện',
  }
  return aliases[value.trim().toLowerCase()] ?? (value as Vehicle['fuelType'])
}

function mapVehicleRow(v: VehicleRow, images: string[] = [], documents: string[] = [], thumbnails?: Record<string, string>): Vehicle {
  return {
    id: v.id as string,
    plate: v.plate as string,
    model: v.model as string,
    brand: (v.brand as string) ?? undefined,
    year: v.year as number | undefined,
    fuelType: fuelTypeFromDb(v.fuel_type),
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
    thumbnails,
    documents,
    createdAt: v.created_at as string,
    updatedAt: v.updated_at as string,
    soldDate: v.sold_date as string | undefined,
    yardPosition: v.yard_position as string | undefined,
    imagesDeletedAt: v.images_deleted_at as string | undefined,
    songNungExpiryDate: v.song_nung_expiry_date as string | null | undefined,
    registrationExpiryDate: v.registration_expiry_date as string | null | undefined,
    isPublic: (v.is_public as boolean) ?? false,
    publicSortOrder: (v.public_sort_order as number) ?? null,
    options: (v.options as string[]) ?? undefined,
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

  // Fetch all images and documents for these vehicles.
  // Only the internal 'vehicle' category (or legacy NULL) belongs in
  // vehicle.images — other categories (website/error/song_nung/documents)
  // are managed separately and must not leak into the Admin cover image.
  const [allImages, allDocs] = await Promise.all([
    supabase.from('vehicle_images').select('vehicle_id, url, thumbnail, sort_order').or('category.eq.vehicle,category.is.null').order('sort_order', { ascending: true }).then(({ data: d }) => d ?? []),
    supabase.from('vehicle_documents').select('vehicle_id, url, sort_order').order('sort_order', { ascending: true }).then(({ data: d }) => d ?? []),
  ])

  // Index by vehicle_id for O(1) lookup
  const imagesByVehicle: Record<string, string[]> = {}
  const thumbnailsByVehicle: Record<string, Record<string, string>> = {}
  const docsByVehicle: Record<string, string[]> = {}
  for (const img of allImages) {
    const vid = img.vehicle_id as string
    if (!imagesByVehicle[vid]) imagesByVehicle[vid] = []
    imagesByVehicle[vid].push(img.url as string)
    // Build thumbnail map: url → thumbnailUrl
    const thumb = img.thumbnail as string | null
    if (thumb) {
      if (!thumbnailsByVehicle[vid]) thumbnailsByVehicle[vid] = {}
      thumbnailsByVehicle[vid][img.url as string] = thumb
    }
  }
  for (const doc of allDocs) {
    const vid = doc.vehicle_id as string
    if (!docsByVehicle[vid]) docsByVehicle[vid] = []
    docsByVehicle[vid].push(doc.url as string)
  }

  return vehicleRows.map((v) => {
    const vid = v.id as string
    return mapVehicleRow(v, imagesByVehicle[vid] ?? [], docsByVehicle[vid] ?? [], thumbnailsByVehicle[vid])
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

/**
 * Compatibility lookup for legacy callers. Plates are no longer unique, so
 * this returns the most recently updated match. Prefer looking up by vehicle ID.
 */
export async function getVehicleByPlate(plate: string): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('plate', plate)
    .order('updated_at', { ascending: false })
    .limit(1)
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
    brand: vehicle.brand,
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
    sold_date: vehicle.soldDate,
    yard_position: vehicle.yardPosition,
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
  if (patch.brand !== undefined) updateData.brand = patch.brand
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
  if (patch.soldDate !== undefined) updateData.sold_date = patch.soldDate
  if (patch.yardPosition !== undefined) updateData.yard_position = patch.yardPosition
  if (patch.imagesDeletedAt !== undefined) updateData.images_deleted_at = patch.imagesDeletedAt
  if (patch.songNungExpiryDate !== undefined) updateData.song_nung_expiry_date = patch.songNungExpiryDate
  if (patch.registrationExpiryDate !== undefined) updateData.registration_expiry_date = patch.registrationExpiryDate
  if (patch.isPublic !== undefined) updateData.is_public = patch.isPublic
  if (patch.publicSortOrder !== undefined) updateData.public_sort_order = patch.publicSortOrder
  if (patch.options !== undefined) updateData.options = patch.options
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

/**
 * Defense-in-depth check using the authenticated user's database role.
 * This deliberately does not use viewMode/localStorage; those are UI state.
 * RLS remains the authoritative database enforcement layer.
 */
export async function assertCanDeleteVehicle(): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    throw new Error('Không xác định được người dùng hiện tại.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', authData.user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (profile?.role !== 'admin') {
    throw new Error('Chỉ Admin được phép xóa xe.')
  }
}

export async function deleteVehicle(id: string): Promise<void> {
  await assertCanDeleteVehicle()

  // CASCADE will auto-delete vehicle_images and vehicle_documents rows.
  // The database RLS policy must independently reject Staff DELETE.
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

// ====== IMPORT CREATE (legacy helper; plate is not unique) ======

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
 * Legacy import helper. Since plates are not unique identifiers, this always
 * inserts a new vehicle row. Any later updates must use the returned vehicle ID.
 *
 * Never modifies existing vehicles or their operational relationships.
 */
export async function upsertVehicle(data: UpsertVehicleInput): Promise<'inserted'> {
  // Plate is not a unique identifier anymore. This legacy import helper now
  // always inserts a distinct vehicle and uses the returned ID for follow-up
  // writes; it must never ON CONFLICT or update a row by plate.
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

  const { data: created, error } = await supabase
    .from('vehicles')
    .insert(record)
    .select('id')
    .single()

  if (error) throw error

  // Follow-up writes are keyed by the new row ID, never by plate.
  if (created?.id) {
    const { error: positionError } = await supabase
      .from('vehicles')
      .update({ position_id: '00000000-0000-0000-0000-000000000001' })
      .eq('id', created.id)
    if (positionError) throw positionError
  }

  return 'inserted'
}
