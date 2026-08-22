/**
 * Resize an image file to a maximum width using Canvas API.
 * Returns a Blob suitable for upload as a thumbnail.
 * No external library needed — runs in the browser.
 */
export function resizeImage(
  file: File,
  maxWidth: number = 600,
  quality: number = 0.75
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // If the image is already smaller than maxWidth, skip resizing
      if (img.width <= maxWidth) {
        // Re-compress at the requested quality and return as JPEG
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        canvas.getContext('2d')!.drawImage(img, 0, 0)
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality)
        return
      }

      const canvas = document.createElement('canvas')
      const ratio = maxWidth / img.width
      canvas.width = maxWidth
      canvas.height = Math.round(img.height * ratio)

      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality)
    }

    img.onerror = () => reject(new Error('Failed to load image for resize'))
    img.src = url
  })
}