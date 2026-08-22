/**
 * In-memory cache: original image URL → thumbnail URL.
 * Populated by PhotoUploader after thumbnail upload,
 * consumed by the store's updateVehicle when inserting the DB record.
 * Cleared on page navigation (module-level, session-only).
 */
const thumbnailCache = new Map<string, string>()

export function setThumbnailForUrl(url: string, thumbUrl: string): void {
  thumbnailCache.set(url, thumbUrl)
}

export function getThumbnailForUrl(url: string): string | undefined {
  return thumbnailCache.get(url)
}

export function clearThumbnailCache(): void {
  thumbnailCache.clear()
}