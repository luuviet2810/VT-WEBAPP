import { apiGet, apiPost, apiPatch, apiDelete } from './api.client'
import { toInputDateFormat } from '../utils/dateUtils'

// ====== TYPES ======

export interface VehicleImageRow {
  id: string
  vehicle_id: string
  path: string
  bucket: string
  url: string
  thumbnail: string | null
  category?: string
  subtype?: string | null
  resolved?: boolean
  song_nung_expiry_date: string | null
  size_bytes: number | null
  mime_type: string | null
  sort_order: number
  created_at: string
  downloadUrl?: string
  clientKey?: string
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
  downloadUrl?: string
}

// ====== VEHICLE IMAGES ======

function mapImageRow(row: Record<string, any>): VehicleImageRow {
  return {
    id: row.id as string,
    vehicle_id: (row.vehicle_id || row.vehicleId) as string,
    path: row.path as string,
    bucket: row.bucket as string,
    url: row.url as string,
    downloadUrl: (row.downloadUrl || row.download_url || row.url) as string,
    thumbnail: (row.thumbnail as string | null) ?? null,
    category: (row.category as string) ?? undefined,
    subtype: (row.subtype as string) ?? null,
    resolved: Boolean(row.resolved),
    song_nung_expiry_date: toInputDateFormat(row.song_nung_expiry_date || row.songNungExpiryDate) || null,
    size_bytes: row.size_bytes != null ? Number(row.size_bytes) : (row.sizeBytes != null ? Number(row.sizeBytes) : null),
    mime_type: (row.mime_type || row.mimeType) ?? null,
    sort_order: Number(row.sort_order ?? row.sortOrder ?? 0),
    created_at: (row.created_at || row.createdAt) as string,
  }
}

function mapDocumentRow(row: Record<string, any>): VehicleDocumentRow {
  return {
    id: row.id as string,
    vehicle_id: (row.vehicle_id || row.vehicleId) as string,
    label: (row.label as string | null) ?? null,
    path: row.path as string,
    bucket: row.bucket as string,
    url: row.url as string,
    downloadUrl: (row.downloadUrl || row.download_url || row.url) as string,
    size_bytes: row.size_bytes != null ? Number(row.size_bytes) : (row.sizeBytes != null ? Number(row.sizeBytes) : null),
    mime_type: (row.mime_type || row.mimeType) ?? null,
    sort_order: Number(row.sort_order ?? row.sortOrder ?? 0),
    created_at: (row.created_at || row.createdAt) as string,
  }
}

/**
 * Save image metadata to DB via Express API.
 */
export async function addVehicleImage(
  vehicleId: string,
  path: string,
  bucket: string,
  url: string,
  sizeBytes?: number,
  mimeType?: string,
  sortOrder?: number,
  thumbnail?: string | null,
  category?: string,
  songNungExpiryDate?: string | null
): Promise<VehicleImageRow> {
  const data = await apiPost<any>(`/api/vehicles/${vehicleId}/images`, {
    path,
    bucket,
    url,
    thumbnail,
    category,
    songNungExpiryDate,
    sizeBytes,
    mimeType,
    sortOrder,
  })
  return mapImageRow(data)
}

/**
 * Get all images for a specific vehicle, ordered by sort_order.
 */
export async function getVehicleImages(vehicleId: string): Promise<VehicleImageRow[]> {
  const data = await apiGet<any[]>(`/api/vehicles/${vehicleId}/images`)
  return (data ?? []).map(mapImageRow)
}

/**
 * Delete image metadata from DB via Express API.
 */
export async function deleteVehicleImage(imageId: string, _storagePath?: string): Promise<void> {
  await apiDelete(`/api/vehicles/images/${imageId}`)
}

/**
 * Update the display order (sort_order) of a vehicle's images.
 */
export async function updateVehicleImageOrder(imageId: string, sortOrder: number): Promise<void> {
  await apiPatch(`/api/vehicles/images/${imageId}/order`, { sortOrder })
}

export async function updateVehicleImageCategory(imageId: string, category: string, sortOrder: number): Promise<void> {
  await apiPatch(`/api/vehicles/images/${imageId}/category`, { category, sortOrder })
}

export async function updateVehicleImageExpiry(imageId: string, expiryDate: string | null): Promise<void> {
  await apiPatch(`/api/vehicles/images/${imageId}/expiry`, { expiryDate })
}

// ====== VEHICLE DOCUMENTS ======

/**
 * Save document metadata to DB via Express API.
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
  const data = await apiPost<any>(`/api/vehicles/${vehicleId}/documents`, {
    path,
    bucket,
    url,
    label,
    sizeBytes,
    mimeType,
    sortOrder,
  })
  return mapDocumentRow(data)
}

/**
 * Get all documents for a specific vehicle, ordered by sort_order.
 */
export async function getVehicleDocuments(vehicleId: string): Promise<VehicleDocumentRow[]> {
  const data = await apiGet<any[]>(`/api/vehicles/${vehicleId}/documents`)
  return (data ?? []).map(mapDocumentRow)
}

/**
 * Delete document metadata via Express API.
 */
export async function deleteVehicleDocument(docId: string, _storagePath?: string): Promise<void> {
  await apiDelete(`/api/vehicles/documents/${docId}`)
}

/**
 * Delete ALL media metadata rows for a vehicle.
 */
export async function deleteAllVehicleMedia(vehicleId: string): Promise<void> {
  await apiDelete(`/api/vehicles/${vehicleId}/media`)
}
