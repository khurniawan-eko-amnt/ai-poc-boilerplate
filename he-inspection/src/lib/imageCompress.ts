// ─── Client-side image compression ─────────────────────────
// Compresses images to ≤1MB before upload to Supabase Storage.
// Uses Canvas API — works in all modern browsers without extra deps.

/**
 * Compress an image File to ≤1MB (configurable).
 * Returns a Blob (File-compatible for upload).
 */
export function compressImage(
  file: File,
  maxBytes: number = 1_000_000,
  maxDimension: number = 1920,
): Promise<File> {
  return new Promise<File>((resolve) => {
    // Only compress images
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }

    // If already small enough, skip compression
    if (file.size <= maxBytes) {
      resolve(file)
      return
    }

    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img

      // Scale down if larger than max dimension (maintaining aspect ratio)
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      // Try quality levels from high to low until ≤maxBytes
      const tryCompress = (quality: number): void => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback: return original file
              resolve(file)
              return
            }

            if (blob.size <= maxBytes || quality <= 0.1) {
              // Good enough — create a File from the blob
              const compressed = new File([blob], file.name, {
                type: 'image/jpeg', // Always output JPEG for max compression
                lastModified: Date.now(),
              })
              resolve(compressed)
            } else {
              // Still too large, try lower quality
              tryCompress(Math.max(0.1, quality - 0.15))
            }
          },
          'image/jpeg',
          quality,
        )
      }

      // Start at 0.85 quality for photos
      tryCompress(0.85)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      // Fallback: return original file
      resolve(file)
    }

    img.src = url
  })
}