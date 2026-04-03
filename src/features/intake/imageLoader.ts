import type { ImageItem } from '../../store/useAppStore'

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function generateThumbnail(bitmap: ImageBitmap): Promise<string> {
  const MAX_W = 200
  const MAX_H = 150
  const scale = Math.min(MAX_W / bitmap.width, MAX_H / bitmap.height, 1)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.75)
}

export async function loadImageFiles(files: File[]): Promise<ImageItem[]> {
  const items: ImageItem[] = []

  for (const file of files) {
    let mime = file.type
    let processedFile = file

    // HEIC/HEIF conversion
    if (mime === 'image/heic' || mime === 'image/heif' || file.name.match(/\.heic$/i) || file.name.match(/\.heif$/i)) {
      try {
        const { default: heic2any } = await import('heic2any')
        const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
        const converted = Array.isArray(result) ? result[0] : result
        processedFile = new File([converted], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
        mime = 'image/jpeg'
      } catch {
        continue
      }
    }

    if (!ACCEPTED_TYPES.has(mime) && !ACCEPTED_TYPES.has(file.type)) continue

    let bitmap: ImageBitmap
    try {
      bitmap = await createImageBitmap(processedFile)
    } catch {
      continue
    }

    const objectUrl = URL.createObjectURL(processedFile)
    const thumbnailDataUrl = await generateThumbnail(bitmap)
    bitmap.close()

    items.push({
      id: generateId(),
      file: processedFile,
      objectUrl,
      thumbnailDataUrl,
      name: file.name,
      size: file.size,
      mime,
    })
  }

  return items
}
