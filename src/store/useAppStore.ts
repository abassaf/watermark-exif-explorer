import { create } from 'zustand'
import type { WatermarkConfig, WatermarkAnchor } from '../features/watermark/types/watermark'

// ─── Image ─────────────────────────────────────────────────────────────────

export interface ImageItem {
  id: string
  file: File
  objectUrl: string
  thumbnailDataUrl: string
  name: string
  size: number
  mime: string
}

interface ImageSlice {
  images: ImageItem[]
  selectedIds: Set<string>
  primaryId: string | null
  addImages: (items: ImageItem[]) => void
  removeImage: (id: string) => void
  selectImage: (id: string, multi?: boolean, range?: boolean) => void
  selectPrev: () => void
  selectNext: () => void
}

// ─── Export ─────────────────────────────────────────────────────────────────

export type ExportMode = 'all' | 'selected'
export type ExportPhase = 'idle' | 'processing' | 'zipping' | 'done' | 'error'

interface ExportSlice {
  exportMode: ExportMode
  exportQuality: number
  stripExif: boolean
  exportPhase: ExportPhase
  exportTotal: number
  exportProcessed: number
  exportPercent: number
  exportError: string | null
  setExportMode: (mode: ExportMode) => void
  setExportQuality: (q: number) => void
  setStripExif: (v: boolean) => void
  setExportState: (partial: Partial<Pick<ExportSlice, 'exportPhase' | 'exportTotal' | 'exportProcessed' | 'exportPercent' | 'exportError'>>) => void
}

// ─── Watermark ──────────────────────────────────────────────────────────────

interface WatermarkSlice {
  watermark: WatermarkConfig
  setWatermarkMode: (mode: WatermarkConfig['mode']) => void
  setWatermarkText: (text: string) => void
  setWatermarkFontId: (fontId: string) => void
  setWatermarkFontPx: (px: number) => void
  setWatermarkAutoContrast: (v: boolean) => void
  setWatermarkManualColor: (c: '#FFFFFF' | '#000000') => void
  setWatermarkResolvedColor: (c: '#FFFFFF' | '#000000') => void
  setWatermarkLogo: (file: File, url: string, w: number, h: number) => void
  clearWatermarkLogo: () => void
  setWatermarkLogoWidthPct: (pct: number) => void
  setWatermarkAnchor: (anchor: WatermarkAnchor) => void
  setWatermarkOpacity: (pct: number) => void
  setWatermarkDragOffset: (x: number, y: number) => void
  resetWatermarkDragOffset: () => void
}

// ─── Combined store ─────────────────────────────────────────────────────────

type AppStore = ImageSlice & ExportSlice & WatermarkSlice

const defaultWatermark: WatermarkConfig = {
  mode: 'text',
  text: {
    content: '© Your Name',
    fontId: 'inter',
    fontPx: 36,
    autoContrast: true,
    manualColor: '#FFFFFF',
    resolvedColor: '#FFFFFF',
  },
  image: {
    logoFile: null,
    logoUrl: null,
    logoNaturalW: 0,
    logoNaturalH: 0,
    widthPctOfImage: 25,
  },
  placement: {
    anchor: 'br',
    offsetX: 0,
    offsetY: 0,
    paddingPx: 16,
  },
  style: {
    opacityPct: 80,
  },
}

export const useAppStore = create<AppStore>((set, get) => ({
  // ── Image slice ────────────────────────────────────────────────
  images: [],
  selectedIds: new Set(),
  primaryId: null,

  addImages: (items) =>
    set((s) => {
      const existing = new Set(s.images.map((i) => i.id))
      const fresh = items.filter((i) => !existing.has(i.id))
      if (fresh.length === 0) return s
      const next = [...s.images, ...fresh]
      const primaryId = s.primaryId ?? fresh[0].id
      const selectedIds = new Set(s.selectedIds)
      selectedIds.add(primaryId)
      return { images: next, primaryId, selectedIds }
    }),

  removeImage: (id) =>
    set((s) => {
      URL.revokeObjectURL(s.images.find((i) => i.id === id)?.objectUrl ?? '')
      const images = s.images.filter((i) => i.id !== id)
      const selectedIds = new Set(s.selectedIds)
      selectedIds.delete(id)
      const primaryId = s.primaryId === id ? (images[0]?.id ?? null) : s.primaryId
      if (primaryId && !selectedIds.has(primaryId) && images.length > 0) {
        selectedIds.add(primaryId)
      }
      return { images, selectedIds, primaryId }
    }),

  selectImage: (id, multi = false, _range = false) =>
    set((s) => {
      if (multi) {
        const selectedIds = new Set(s.selectedIds)
        if (selectedIds.has(id)) {
          selectedIds.delete(id)
          const primaryId = selectedIds.size > 0 ? [...selectedIds][0] : null
          return { selectedIds, primaryId }
        } else {
          selectedIds.add(id)
          return { selectedIds, primaryId: id }
        }
      }
      return { selectedIds: new Set([id]), primaryId: id }
    }),

  selectPrev: () =>
    set((s) => {
      if (s.images.length === 0) return s
      const idx = s.images.findIndex((i) => i.id === s.primaryId)
      const next = s.images[(idx - 1 + s.images.length) % s.images.length]
      return { primaryId: next.id, selectedIds: new Set([next.id]) }
    }),

  selectNext: () =>
    set((s) => {
      if (s.images.length === 0) return s
      const idx = s.images.findIndex((i) => i.id === s.primaryId)
      const next = s.images[(idx + 1) % s.images.length]
      return { primaryId: next.id, selectedIds: new Set([next.id]) }
    }),

  // ── Export slice ────────────────────────────────────────────────
  exportMode: 'all',
  exportQuality: 92,
  stripExif: false,
  exportPhase: 'idle',
  exportTotal: 0,
  exportProcessed: 0,
  exportPercent: 0,
  exportError: null,

  setExportMode: (exportMode) => set({ exportMode }),
  setExportQuality: (exportQuality) => set({ exportQuality }),
  setStripExif: (stripExif) => set({ stripExif }),
  setExportState: (partial) => set(partial),

  // ── Watermark slice ────────────────────────────────────────────
  watermark: defaultWatermark,

  setWatermarkMode: (mode) =>
    set((s) => ({ watermark: { ...s.watermark, mode } })),

  setWatermarkText: (content) =>
    set((s) => ({
      watermark: { ...s.watermark, text: { ...s.watermark.text, content } },
    })),

  setWatermarkFontId: (fontId) =>
    set((s) => ({
      watermark: { ...s.watermark, text: { ...s.watermark.text, fontId } },
    })),

  setWatermarkFontPx: (fontPx) =>
    set((s) => ({
      watermark: { ...s.watermark, text: { ...s.watermark.text, fontPx } },
    })),

  setWatermarkAutoContrast: (autoContrast) =>
    set((s) => ({
      watermark: { ...s.watermark, text: { ...s.watermark.text, autoContrast } },
    })),

  setWatermarkManualColor: (manualColor) =>
    set((s) => ({
      watermark: { ...s.watermark, text: { ...s.watermark.text, manualColor } },
    })),

  setWatermarkResolvedColor: (resolvedColor) =>
    set((s) => ({
      watermark: { ...s.watermark, text: { ...s.watermark.text, resolvedColor } },
    })),

  setWatermarkLogo: (logoFile, logoUrl, logoNaturalW, logoNaturalH) =>
    set((s) => ({
      watermark: {
        ...s.watermark,
        image: { ...s.watermark.image, logoFile, logoUrl, logoNaturalW, logoNaturalH },
      },
    })),

  clearWatermarkLogo: () => {
    const prev = get().watermark.image.logoUrl
    if (prev) URL.revokeObjectURL(prev)
    set((s) => ({
      watermark: {
        ...s.watermark,
        image: { logoFile: null, logoUrl: null, logoNaturalW: 0, logoNaturalH: 0, widthPctOfImage: s.watermark.image.widthPctOfImage },
      },
    }))
  },

  setWatermarkLogoWidthPct: (widthPctOfImage) =>
    set((s) => ({
      watermark: {
        ...s.watermark,
        image: { ...s.watermark.image, widthPctOfImage },
      },
    })),

  setWatermarkAnchor: (anchor) =>
    set((s) => ({
      watermark: {
        ...s.watermark,
        placement: { ...s.watermark.placement, anchor, offsetX: 0, offsetY: 0 },
      },
    })),

  setWatermarkOpacity: (opacityPct) =>
    set((s) => ({
      watermark: { ...s.watermark, style: { opacityPct } },
    })),

  setWatermarkDragOffset: (offsetX, offsetY) =>
    set((s) => ({
      watermark: {
        ...s.watermark,
        placement: { ...s.watermark.placement, offsetX, offsetY },
      },
    })),

  resetWatermarkDragOffset: () =>
    set((s) => ({
      watermark: {
        ...s.watermark,
        placement: { ...s.watermark.placement, offsetX: 0, offsetY: 0 },
      },
    })),
}))
