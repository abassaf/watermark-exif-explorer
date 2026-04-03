import * as exifr from 'exifr'
import type { ExifSections, MetadataRow } from './types'

function row(key: string, label: string, value: string): MetadataRow {
  return { key, label, value, searchable: `${label} ${key} ${value}`.toLowerCase() }
}

function fmtAperture(v: unknown): string {
  if (typeof v === 'number') return `f/${v.toFixed(1)}`
  return '—'
}

function fmtShutter(v: unknown): string {
  if (typeof v !== 'number' || v <= 0) return '—'
  if (v < 1) return `1/${Math.round(1 / v)} s`
  return `${v} s`
}

function fmtFocal(v: unknown): string {
  if (typeof v === 'number') return `${v} mm`
  return '—'
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function fmtCoords(lat: unknown, lng: unknown): string | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  if (!isFinite(lat) || !isFinite(lng)) return null
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function extractExif(file: File): Promise<ExifSections> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let raw: Record<string, any> = {}
  try {
    raw = (await exifr.parse(file, {
      exif: true,
      tiff: true,
      iptc: true,
      xmp: true,
      gps: true,
    })) ?? {}
  } catch {
    // return empty sections
  }

  const camera: MetadataRow[] = []
  const exposure: MetadataRow[] = []
  const location: MetadataRow[] = []
  const fileInfo: MetadataRow[] = []

  if (raw.Make) camera.push(row('Make', 'Camera make', String(raw.Make)))
  if (raw.Model) camera.push(row('Model', 'Camera model', String(raw.Model)))
  if (raw.LensModel) camera.push(row('LensModel', 'Lens', String(raw.LensModel)))

  if (raw.FocalLength !== undefined) exposure.push(row('FocalLength', 'Focal length', fmtFocal(raw.FocalLength)))
  if (raw.FNumber !== undefined) exposure.push(row('FNumber', 'Aperture', fmtAperture(raw.FNumber)))
  if (raw.ExposureTime !== undefined) exposure.push(row('ExposureTime', 'Shutter speed', fmtShutter(raw.ExposureTime)))
  if (raw.ISO !== undefined) exposure.push(row('ISO', 'ISO', String(raw.ISO)))
  const dateVal = raw.DateTimeOriginal ?? raw.CreateDate
  if (dateVal) {
    const d = dateVal instanceof Date ? dateVal : new Date(dateVal)
    exposure.push(row('DateTimeOriginal', 'Date taken', isNaN(d.getTime()) ? String(dateVal) : d.toLocaleString()))
  }

  const coords = fmtCoords(raw.latitude, raw.longitude)
  if (coords) {
    location.push(row('GPS', 'Coordinates', coords))
  }

  fileInfo.push(row('FileName', 'File name', file.name))
  fileInfo.push(row('FileSize', 'File size', fmtBytes(file.size)))
  fileInfo.push(row('MIMEType', 'Type', file.type || 'unknown'))
  if (raw.ColorSpace !== undefined) fileInfo.push(row('ColorSpace', 'Colour space', String(raw.ColorSpace)))
  const w = raw.ExifImageWidth ?? raw.ImageWidth
  const h = raw.ExifImageHeight ?? raw.ImageHeight
  if (w && h) fileInfo.push(row('Dimensions', 'Dimensions', `${w} × ${h} px`))

  return { camera, exposure, location, fileInfo }
}

export function hasRows(sections: ExifSections): boolean {
  return (
    sections.camera.length > 0 ||
    sections.exposure.length > 0 ||
    sections.location.length > 0 ||
    sections.fileInfo.length > 0
  )
}
