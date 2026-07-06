import { supabase } from '../lib/supabase'

// ====== TYPES ======

export interface VehicleImageRow {
  id: string
  vehicle_id: string
  path: string
  bucket: string
  url: string
  thumbnail: string | null
  size_bytes: number | null
  mime_type: string | null
  sort_order: number
  created_at: string
}

export interface VehicleDocumentRow {
  id: string
  vehicle_id: string
  label: string | null
  path: string
  bucket: string
  url: string
  size_bytes: number | null
  mime_type: string | null
  sort_order: number
  created_at: string
}

// ====== VEHICLE IMAGES ======

function mapImageRow(row: Record<string, unknown>): VehicleImageRow {
  return {
    id: row.id as string,
    vehicle_id: row.vehicle_id as string,
    path: row.path as string,
    bucket: row.bucket as string,
    url: row.url as string,
    thumbnail: row.thumbnail as string | null,
    size_bytes: row.size_bytes as number | null,
    mime_type: row.mime_type as string | null,
    sort_order: row.sort_order as number,
    created_at: row.created_at as string,
  }
}

/**
 * Save image metadata to DB after uploading file to Supabase Storage.
 */
export async function addVehicleImage(
  vehicleId: string,
  path: string,
  bucket: string,
  url: string,
  sizeBytes?: number,
  mimeType?: string,
  sortOrder?: number
): Promise<VehicleImageRow> {
  const { data, error } = await supabase
    .from('vehicle_images')
    .insert({
      vehicle_id: vehicleId,
      path,
      bucket,
      url,
      size_bytes: sizeBytes ?? null,
      mime_type: mimeType ?? null,
      sort_order: sortOrder ?? 0,
    })
    .select()
    .single()

  if (error) throw error
  return mapImageRow(data as Record<string, unknown>)
}

/**
 * Get all images for a specific vehicle, ordered by sort_order.
 */
export async function getVehicleImages(vehicleId: string): Promise<VehicleImageRow[]> {
  const { data, error } = await supabase
    .from('vehicle_images')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data as Record<string, unknown>[]).map(mapImageRow)
}

/**
 * Delete image metadata + file from Supabase Storage.
 */
export async function deleteVehicleImage(imageId: string, storagePath: string): Promise<void> {
  // Delete from Supabase Storage
  const { error: storageError } = await supabase.storage
    .from('vehicle-images')
    .remove([storagePath])

  // Log but don't fail if storage deletion fails
  if (storageError) {
    console.error('[vehicleMedia] Failed to delete storage file:', storageError)
  }

  // Delete DB record
  const { error: dbError } = await supabase
    .from('vehicle_images')
    .delete()
    .eq('id', imageId)

  if (dbError) throw dbError
}

// ====== VEHICLE DOCUMENTS ======

function mapDocumentRow(row: Record<string, unknown>): VehicleDocumentRow {
  return {
    id: row.id as string,
    vehicle_id: row.vehicle_id as string,
    label: row.label as string | null,
    path: row.path as string,
    bucket: row.bucket as string,
    url: row.url as string,
    size_bytes: row.size_bytes as number | null,
    mime_type: row.mime_type as string | null,
    sort_order: row.sort_order as number,
    created_at: row.created_at as string,
  }
}

/**
 * Save document metadata to DB after uploading file to Supabase Storage.
 */
export async function addVehicleDocument(
  vehicleId: string,
  path: string,
  bucket: string,
  url: string,
  label?: string,
  sizeBytes?: number,
  mimeType?: string,
  sortOrder?: number
): Promise<VehicleDocumentRow> {
  const { data, error } = await supabase
    .from('vehicle_documents')
    .insert({
      vehicle_id: vehicleId,
      path,
      bucket,
      url,
      label: label ?? null,
      size_bytes: sizeBytes ?? null,
      mime_type: mimeType ?? null,
      sort_order: sortOrder ?? 0,
    })
    .select()
    .single()

  if (error) throw error
  return mapDocumentRow(data as Record<string, unknown>)
}

/**
 * Get all documents for a specific vehicle, ordered by sort_order.
 */
export async function getVehicleDocuments(vehicleId: string): Promise<VehicleDocumentRow[]> {
  const { data, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data as Record<string, unknown>[]).map(mapDocumentRow)
}

/**
 * Delete document metadata + file from Supabase Storage.
 */
export async function deleteVehicleDocument(docId: string, storagePath: string): Promise<void> {
  // Delete from Supabase Storage
  const { error: storageError } = await supabase.storage
    .from('vehicle-documents')
    .remove([storagePath])

  // Log but don't fail if storage deletion fails
  if (storageError) {
    console.error('[vehicleMedia] Failed to delete storage file:', storageError)
  }

  // Delete DB record
  const { error: dbError } = await supabase
    .from('vehicle_documents')
    .delete()
    .eq('id', docId)

  if (dbError) throw dbError
}

/**
 * Delete ALL media metadata rows for a vehicle (no storage deletion).
 * Used by deleteVehicle to ensure metadata is cleaned before vehicle row is deleted.
 */
export async function deleteAllVehicleMedia(vehicleId: string): Promise<void> {
  await Promise.all([
    supabase.from('vehicle_images').delete().eq('vehicle_id', vehicleId),
    supabase.from('vehicle_documents').delete().eq('vehicle_id', vehicleId),
  ])
}
