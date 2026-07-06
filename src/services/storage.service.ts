import { supabase } from '../lib/supabase'

// ====== VEHICLE IMAGES ======
// Bucket: vehicle-images (public)

export interface UploadResult {
  path: string
  url: string
}

export async function uploadVehicleImage(
  vehicleId: string,
  file: File
): Promise<UploadResult> {
  const path = `vehicles/${vehicleId}/${Date.now()}_${file.name}`

  const { data, error } = await supabase.storage
    .from('vehicle-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('vehicle-images')
    .getPublicUrl(path)

  return { path, url: urlData.publicUrl }
}

export async function uploadVehicleImages(
  vehicleId: string,
  files: File[]
): Promise<UploadResult[]> {
  const results: UploadResult[] = []
  for (const file of files) {
    results.push(await uploadVehicleImage(vehicleId, file))
  }
  return results
}

export async function deleteVehicleImage(url: string): Promise<string | null> {
  const path = extractStoragePath(url, 'vehicle-images')
  if (!path) return null

  const { error } = await supabase.storage
    .from('vehicle-images')
    .remove([path])

  if (error) throw error
  return path
}

// ====== VEHICLE DOCUMENTS ======
// Bucket: vehicle-documents (public)

export async function uploadVehicleDocument(
  vehicleId: string,
  file: File
): Promise<UploadResult> {
  const path = `documents/${vehicleId}/${Date.now()}_${file.name}`

  const { data, error } = await supabase.storage
    .from('vehicle-documents')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('vehicle-documents')
    .getPublicUrl(path)

  return { path, url: urlData.publicUrl }
}

export async function uploadVehicleDocuments(
  vehicleId: string,
  files: File[]
): Promise<UploadResult[]> {
  const results: UploadResult[] = []
  for (const file of files) {
    results.push(await uploadVehicleDocument(vehicleId, file))
  }
  return results
}

export async function deleteVehicleDocument(url: string): Promise<string | null> {
  const path = extractStoragePath(url, 'vehicle-documents')
  if (!path) return null

  const { error } = await supabase.storage
    .from('vehicle-documents')
    .remove([path])

  if (error) throw error
  return path
}

// ====== CHECKSHEET PHOTOS ======
// Bucket: checksheet-photos (public)

export async function uploadExteriorPhoto(
  vehicleId: string,
  spotKey: string,
  file: File
): Promise<UploadResult> {
  const path = `checksheets/${vehicleId}/${spotKey}/${Date.now()}_${file.name}`

  const { data, error } = await supabase.storage
    .from('checksheet-photos')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('checksheet-photos')
    .getPublicUrl(path)

  return { path, url: urlData.publicUrl }
}

// ====== UTILITIES ======

function extractStoragePath(url: string, bucket: string): string | null {
  const pattern = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(pattern)
  if (idx === -1) return null
  return url.slice(idx + pattern.length)
}
