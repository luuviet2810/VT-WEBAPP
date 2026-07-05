import { supabase } from '../lib/supabase'

// TODO: Supabase Storage bucket configuration
// Create buckets:
// - vehicle-images (public)
// - documents (public)
// - checksheet-photos (public)
// Then enable Row Level Security policies.

export async function uploadVehicleImage(
  vehicleId: string,
  file: File
): Promise<string> {
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
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

export async function uploadVehicleImages(
  vehicleId: string,
  files: File[]
): Promise<string[]> {
  const urls: string[] = []
  for (const file of files) {
    const url = await uploadVehicleImage(vehicleId, file)
    urls.push(url)
  }
  return urls
}

export async function deleteVehicleImage(url: string): Promise<void> {
  const path = url.split('/storage/v1/object/public/vehicle-images/')[1]
  if (!path) return

  const { error } = await supabase.storage
    .from('vehicle-images')
    .remove([path])

  if (error) throw error
}

export async function uploadDocument(
  vehicleId: string,
  file: File
): Promise<string> {
  const path = `documents/${vehicleId}/${Date.now()}_${file.name}`

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

export async function uploadExteriorPhoto(
  vehicleId: string,
  spotKey: string,
  file: File
): Promise<string> {
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
    .getPublicUrl(data.path)

  return urlData.publicUrl
}
