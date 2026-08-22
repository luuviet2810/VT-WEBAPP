/**
 * Resize an image file to a landscape thumbnail (16:9 aspect ratio).
 *
 * 1. Handles EXIF orientation via createImageBitmap (from-image).
 * 2. If the image is portrait (height > width after orientation):
 *    → center-crop to create a landscape 16:9 thumbnail.
 *    → This ensures upright photos (e.g. car front shots) fill the card.
 * 3. If the image is landscape:
 *    → resize to fit within 16:9 bounds, preserving aspect ratio.
 *
 * No external library needed — runs in the browser.
 */
export async function resizeImage(
  file: File,
  targetWidth: number = 800,
  quality: number = 0.75
): Promise<Blob> {
  // Step 1: decode with EXIF orientation applied
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image', premultiplyAlpha: 'none' })

  const isPortrait = bitmap.height > bitmap.width
  const targetHeight = Math.round(targetWidth * 9 / 16)

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  if (isPortrait) {
    // Portrait → center-crop to landscape 16:9
    // Crop from the center of the bitmap, keeping the full width
    const cropHeight = Math.round(bitmap.width * 16 / 9)
    const sx = 0
    const sy = Math.max(0, Math.round((bitmap.height - cropHeight) / 2))
    const sw = bitmap.width
    const sh = Math.min(cropHeight, bitmap.height - sy)
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight)
  } else {
    // Landscape → resize to fit within 16:9 bounds
    const scale = Math.min(targetWidth / bitmap.width, targetHeight / bitmap.height)
    const dw = Math.round(bitmap.width * scale)
    const dh = Math.round(bitmap.height * scale)
    const dx = Math.round((targetWidth - dw) / 2)
    const dy = Math.round((targetHeight - dh) / 2)
    ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, dx, dy, dw, dh)
  }

  bitmap.close()
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality))
}