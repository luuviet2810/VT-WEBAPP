import { apiPost, apiDelete } from './api.client'

// ====== TYPES ======

export interface UploadResult {
  path: string
  url: string          // Fresh download URL for immediate preview
  downloadUrl?: string
  id?: string
  key?: string
  bucket?: string
  sizeBytes?: number
  mimeType?: string
}

export type StorageBucketType = 'images' | 'documents' | 'photos'

interface PresignedUploadResponse {
  url: string
  key: string
  bucket: string
  bucketType: StorageBucketType
  expiresInSeconds: number
  originalName: string
  mimeType: string
  fileSize: number
}

interface ConfirmUploadResponse {
  id: string
  vehicleId?: string
  path: string
  bucket: string
  url: string
  downloadUrl: string
  sizeBytes: number
  mimeType: string
  category?: string
  sortOrder?: number
}

// ====== CORE R2 UPLOAD WORKFLOW ======

/**
 * 1. Request presigned upload URL from Express backend
 */
export async function getPresignedUpload(params: {
  bucketType: StorageBucketType
  fileName: string
  fileSize: number
  mimeType: string
  vehicleId?: string
  checksheetId?: string
  spotKey?: string
}): Promise<PresignedUploadResponse> {
  return await apiPost<PresignedUploadResponse>('/api/storage/presigned-upload', params)
}

/**
 * 2. Upload file directly to Cloudflare R2 via Presigned PUT URL
 */
export async function putDirectToR2(
  uploadUrl: string,
  file: File | Blob,
  mimeType: string
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
    },
    body: file,
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    throw new Error(`Tải file lên Cloudflare R2 thất bại (HTTP ${res.status}): ${errorText || res.statusText}`)
  }
}

/**
 * 3. Confirm upload with Express backend to verify R2 existence and save metadata into Neon DB
 */
export async function confirmUpload(params: {
  bucketType: StorageBucketType
  key: string
  vehicleId?: string | null
  checksheetId?: string | null
  category?: 'website' | 'documents' | 'error' | 'song_nung' | 'vehicle' | null
  label?: string | null
  spotKey?: string | null
  sortOrder?: number | null
  songNungExpiryDate?: string | null
  thumbnail?: string | null
  fileName?: string | null
  mimeType?: string | null
  fileSize?: number | null
  sizeBytes?: number | null
}): Promise<ConfirmUploadResponse> {
  const cleanBody: Record<string, any> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) {
      cleanBody[k] = v
    }
  }
  return await apiPost<ConfirmUploadResponse>('/api/storage/confirm-upload', cleanBody)
}

/**
 * Request fresh Presigned Download URL for any private R2 object
 */
export async function getPresignedDownloadUrl(
  bucketType: StorageBucketType,
  key: string
): Promise<string> {
  const data = await apiPost<{ url: string }>('/api/storage/presigned-download', {
    bucketType,
    key,
  })
  return data.url
}

// ====== 1. VEHICLE IMAGES ======

export async function uploadVehicleImage(
  vehicleId: string,
  file: File,
  options?: {
    category?: 'website' | 'documents' | 'error' | 'song_nung' | 'vehicle'
    sortOrder?: number
    songNungExpiryDate?: string | null
    thumbnail?: string | null
  }
): Promise<UploadResult> {
  // Validate file size (10 MB max)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error(`Dung lượng ảnh (${(file.size / (1024 * 1024)).toFixed(2)} MB) vượt quá giới hạn tối đa 10 MB`)
  }

  const isUuid = vehicleId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vehicleId)
  const safeVehicleId = isUuid ? vehicleId : undefined

  // 1. Get presigned upload URL
  const presigned = await getPresignedUpload({
    bucketType: 'images',
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'image/jpeg',
    vehicleId: safeVehicleId,
  })

  // 2. Upload binary directly to Cloudflare R2
  await putDirectToR2(presigned.url, file, presigned.mimeType)

  // 3. Confirm upload & persist metadata in Neon
  if (safeVehicleId) {
    try {
      const confirmed = await confirmUpload({
        bucketType: 'images',
        key: presigned.key,
        vehicleId: safeVehicleId,
        category: options?.category || 'vehicle',
        sortOrder: options?.sortOrder ?? 0,
        songNungExpiryDate: options?.songNungExpiryDate || undefined,
        thumbnail: options?.thumbnail || undefined,
      })

      return {
        path: confirmed.path,
        url: confirmed.downloadUrl || confirmed.url,
        downloadUrl: confirmed.downloadUrl,
        id: confirmed.id,
        key: confirmed.path,
        bucket: confirmed.bucket,
        sizeBytes: confirmed.sizeBytes,
        mimeType: confirmed.mimeType,
      }
    } catch (confirmErr) {
      // Rollback: delete orphaned R2 object if database confirm fails
      apiDelete('/api/storage/file', {
        body: JSON.stringify({ bucketType: 'images', key: presigned.key }),
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {})
      throw confirmErr
    }
  }

  const downloadUrl = await getPresignedDownloadUrl('images', presigned.key)
  return {
    path: presigned.key,
    url: downloadUrl,
    downloadUrl,
    key: presigned.key,
    bucket: 'vehicle-images',
    sizeBytes: file.size,
    mimeType: file.type,
  }
}

export async function uploadVehicleImages(
  vehicleId: string,
  files: File[],
  options?: {
    category?: 'website' | 'documents' | 'error' | 'song_nung' | 'vehicle'
    onProgress?: (completed: number, total: number) => void
  }
): Promise<UploadResult[]> {
  const results: UploadResult[] = []
  let completed = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const res = await uploadVehicleImage(vehicleId, file, {
      category: options?.category,
      sortOrder: i,
    })
    results.push(res)
    completed++
    options?.onProgress?.(completed, files.length)
  }

  return results
}

export async function deleteVehicleImage(imageIdOrUrl: string, storagePath?: string): Promise<void> {
  if (!imageIdOrUrl) return

  // If passed an ID directly (UUID)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(imageIdOrUrl)
  if (isUuid) {
    await apiDelete(`/api/vehicles/images/${imageIdOrUrl}`)
    return
  }

  // If passed a URL or storage path
  const path = storagePath || extractStoragePath(imageIdOrUrl, 'vehicle-images')
  if (path) {
    await apiDelete('/api/storage/file', {
      body: JSON.stringify({
        bucketType: 'images',
        key: path,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ====== 2. VEHICLE DOCUMENTS ======

export async function uploadVehicleDocument(
  vehicleId: string,
  file: File,
  label?: string,
  sortOrder = 0
): Promise<UploadResult> {
  // Validate file size (25 MB max)
  if (file.size > 25 * 1024 * 1024) {
    throw new Error(`Dung lượng tài liệu (${(file.size / (1024 * 1024)).toFixed(2)} MB) vượt quá giới hạn tối đa 25 MB`)
  }

  const isUuid = vehicleId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vehicleId)
  const safeVehicleId = isUuid ? vehicleId : undefined

  const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream')

  // 1. Get presigned upload URL
  const presigned = await getPresignedUpload({
    bucketType: 'documents',
    fileName: file.name,
    fileSize: file.size,
    mimeType,
    vehicleId: safeVehicleId,
  })

  // 2. Direct PUT to R2
  await putDirectToR2(presigned.url, file, presigned.mimeType)

  // 3. Confirm upload & persist metadata
  if (safeVehicleId) {
    try {
      const confirmed = await confirmUpload({
        bucketType: 'documents',
        key: presigned.key,
        vehicleId: safeVehicleId,
        label: label || file.name,
        sortOrder,
      })

      return {
        path: confirmed.path,
        url: confirmed.downloadUrl || confirmed.url,
        downloadUrl: confirmed.downloadUrl,
        id: confirmed.id,
        key: confirmed.path,
        bucket: confirmed.bucket,
        sizeBytes: confirmed.sizeBytes,
        mimeType: confirmed.mimeType,
      }
    } catch (confirmErr) {
      // Rollback: delete orphaned R2 object if database confirm fails
      apiDelete('/api/storage/file', {
        body: JSON.stringify({ bucketType: 'documents', key: presigned.key }),
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {})
      throw confirmErr
    }
  }

  const downloadUrl = await getPresignedDownloadUrl('documents', presigned.key)
  return {
    path: presigned.key,
    url: downloadUrl,
    downloadUrl,
    key: presigned.key,
    bucket: 'vehicle-documents',
    sizeBytes: file.size,
    mimeType: file.type,
  }
}

export async function uploadVehicleDocuments(
  vehicleId: string,
  files: File[],
  label?: string
): Promise<UploadResult[]> {
  const results: UploadResult[] = []
  for (let i = 0; i < files.length; i++) {
    results.push(await uploadVehicleDocument(vehicleId, files[i], label, i))
  }
  return results
}

export async function deleteVehicleDocument(docIdOrUrl: string, storagePath?: string): Promise<void> {
  if (!docIdOrUrl) return

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docIdOrUrl)
  if (isUuid) {
    await apiDelete(`/api/vehicles/documents/${docIdOrUrl}`)
    return
  }

  const path = storagePath || extractStoragePath(docIdOrUrl, 'vehicle-documents')
  if (path) {
    await apiDelete('/api/storage/file', {
      body: JSON.stringify({
        bucketType: 'documents',
        key: path,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ====== 3. CHECKSHEET PHOTOS ======

export async function uploadExteriorPhoto(
  vehicleId: string,
  spotKey: string,
  file: File,
  checksheetId?: string
): Promise<UploadResult> {
  // Validate file size (10 MB max)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error(`Dung lượng ảnh (${(file.size / (1024 * 1024)).toFixed(2)} MB) vượt quá giới hạn tối đa 10 MB`)
  }

  // 1. Get presigned upload URL
  const presigned = await getPresignedUpload({
    bucketType: 'photos',
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'image/jpeg',
    vehicleId,
    checksheetId,
    spotKey,
  })

  // 2. Direct PUT to R2
  await putDirectToR2(presigned.url, file, presigned.mimeType)

  // 3. Confirm upload & merge into checksheet
  if (checksheetId) {
    try {
      const confirmed = await confirmUpload({
        bucketType: 'photos',
        key: presigned.key,
        checksheetId,
        spotKey,
      })

      return {
        path: presigned.key,
        url: confirmed.downloadUrl || presigned.key,
        downloadUrl: confirmed.downloadUrl,
        key: presigned.key,
        bucket: 'checksheet-photos',
      }
    } catch (confirmErr) {
      // Rollback: delete orphaned R2 object if database confirm fails
      apiDelete('/api/storage/file', {
        body: JSON.stringify({ bucketType: 'photos', key: presigned.key }),
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {})
      throw confirmErr
    }
  }

  // If checksheet not yet created, return key and presigned download URL
  const downloadUrl = await getPresignedDownloadUrl('photos', presigned.key)
  return {
    path: presigned.key,
    url: downloadUrl,
    downloadUrl,
    key: presigned.key,
    bucket: 'checksheet-photos',
  }
}

// ====== UTILITIES ======

function extractStoragePath(url: string, bucket: string): string | null {
  if (!url) return null
  // Match R2 endpoint path pattern
  const r2Pattern = `/${bucket}/`
  const r2Idx = url.indexOf(r2Pattern)
  if (r2Idx !== -1) {
    const rawPath = url.slice(r2Idx + r2Pattern.length).split('?')[0]
    return decodeURIComponent(rawPath)
  }

  // Match legacy Supabase path pattern
  const supaPattern = `/storage/v1/object/public/${bucket}/`
  const supaIdx = url.indexOf(supaPattern)
  if (supaIdx !== -1) {
    const rawPath = url.slice(supaIdx + supaPattern.length).split('?')[0]
    return decodeURIComponent(rawPath)
  }

  // If url is already a storage key
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return url
  }

  return null
}
