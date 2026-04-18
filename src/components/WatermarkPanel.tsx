import { useRef, useEffect, useState, type PointerEvent, type ChangeEvent } from 'react'
import { useDebounce } from 'use-debounce'
import { useAppStore } from '../store/useAppStore'
import { FONT_OPTIONS, type WatermarkAnchor } from '../features/watermark/types/watermark'
import { containFit, clampDragOffset } from '../features/watermark/utils/canvasMath'
import { drawWatermark } from '../features/watermark/utils/drawWatermark'

const ANCHORS: WatermarkAnchor[] = ['tl','tc','tr','ml','c','mr','bl','bc','br']

export function WatermarkPanel() {
  const primary = useAppStore((s) => s.images.find((i) => i.id === s.primaryId))
  const watermark = useAppStore((s) => s.watermark)
  const setMode = useAppStore((s) => s.setWatermarkMode)
  const setText = useAppStore((s) => s.setWatermarkText)
  const setFontId = useAppStore((s) => s.setWatermarkFontId)
  const setFontPx = useAppStore((s) => s.setWatermarkFontPx)
  const setAutoContrast = useAppStore((s) => s.setWatermarkAutoContrast)
  const setManualColor = useAppStore((s) => s.setWatermarkManualColor)
  const setResolvedColor = useAppStore((s) => s.setWatermarkResolvedColor)
  const setLogo = useAppStore((s) => s.setWatermarkLogo)
  const clearLogo = useAppStore((s) => s.clearWatermarkLogo)
  const setLogoWidthPct = useAppStore((s) => s.setWatermarkLogoWidthPct)
  const setAnchor = useAppStore((s) => s.setWatermarkAnchor)
  const setOpacity = useAppStore((s) => s.setWatermarkOpacity)
  const setDragOffset = useAppStore((s) => s.setWatermarkDragOffset)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sourceImgRef = useRef<HTMLImageElement | null>(null)
  const logoBitmapRef = useRef<ImageBitmap | null>(null)

  const [textDraft, setTextDraft] = useState(watermark.text.content)
  const [debouncedText] = useDebounce(textDraft, 180)

  // Sync debounced text to store
  useEffect(() => { setText(debouncedText) }, [debouncedText, setText])

  // Load source image
  useEffect(() => {
    if (!primary) { sourceImgRef.current = null; redraw(); return }
    const img = new Image()
    img.onload = () => { sourceImgRef.current = img; redraw() }
    img.src = primary.objectUrl
  }, [primary?.id])

  // Load logo bitmap
  useEffect(() => {
    if (!watermark.image.logoUrl || !watermark.image.logoFile) {
      logoBitmapRef.current?.close()
      logoBitmapRef.current = null
      redraw()
      return
    }
    let cancelled = false
    createImageBitmap(watermark.image.logoFile).then((bmp) => {
      if (cancelled) { bmp.close(); return }
      logoBitmapRef.current?.close()
      logoBitmapRef.current = bmp
      redraw()
    }).catch(() => { /* logo failed to decode — redraw without it */ redraw() })
    return () => { cancelled = true }
  }, [watermark.image.logoUrl])

  // Redraw on config changes
  useEffect(() => { redraw() }, [
    primary?.id, watermark.mode, debouncedText, watermark.text.fontId, watermark.text.fontPx,
    watermark.text.autoContrast, watermark.text.manualColor, watermark.image.widthPctOfImage,
    watermark.style.opacityPct, watermark.placement.anchor,
    watermark.placement.offsetX, watermark.placement.offsetY,
  ])

  const redraw = () => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cssW = container.clientWidth
    const cssH = container.clientHeight
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    if (!sourceImgRef.current) {
      ctx.fillStyle = '#18181b'
      ctx.fillRect(0, 0, cssW, cssH)
      return
    }

    const resolved = drawWatermark({
      ctx,
      sourceImage: sourceImgRef.current,
      logoImage: logoBitmapRef.current,
      config: watermark,
      canvasCssW: cssW,
      canvasCssH: cssH,
      dpr,
      returnResolvedColor: watermark.text.autoContrast,
    })
    if (resolved) setResolvedColor(resolved)
  }

  // Drag state
  const dragRef = useRef<{ startPx: number; startPy: number; startOffX: number; startOffY: number } | null>(null)

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!sourceImgRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = {
      startPx: e.clientX - rect.left,
      startPy: e.clientY - rect.top,
      startOffX: watermark.placement.offsetX,
      startOffY: watermark.placement.offsetY,
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current || !sourceImgRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const { startPx, startPy, startOffX, startOffY } = dragRef.current

    const canvas = canvasRef.current!
    const cssW = canvas.clientWidth
    const cssH = canvas.clientHeight
    const src = sourceImgRef.current
    const fit = containFit(src.naturalWidth, src.naturalHeight, cssW, cssH)

    // Estimate watermark size for clamping (approximate)
    const approxWmW = 100
    const approxWmH = 30
    const clamped = clampDragOffset(
      watermark.placement.anchor, fit, approxWmW, approxWmH,
      watermark.placement.paddingPx,
      startOffX + (px - startPx),
      startOffY + (py - startPy),
    )
    setDragOffset(clamped.offsetX, clamped.offsetY)
  }

  const onPointerUp = () => { dragRef.current = null }

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const bmp = await createImageBitmap(file)
    setLogo(file, url, bmp.width, bmp.height)
    bmp.close()
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Preview canvas */}
      <div
        ref={containerRef}
        className="rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950"
        style={{ height: '420px' }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          aria-label="Watermark preview — drag to reposition"
        />
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {(['text', 'image'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${watermark.mode === m ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
            aria-pressed={watermark.mode === m}
          >
            {m === 'text' ? 'Text' : 'Image'}
          </button>
        ))}
      </div>

      {watermark.mode === 'text' && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">Watermark text</span>
            <input
              type="text"
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200
                         placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="© Your Name"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">Font</span>
            <select
              value={watermark.text.fontId}
              onChange={(e) => setFontId(e.target.value)}
              className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200
                         focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">Font size — {watermark.text.fontPx}px</span>
            <input
              type="range" min={8} max={256} value={watermark.text.fontPx}
              onChange={(e) => setFontPx(Number(e.target.value))}
              className="accent-blue-500"
              aria-label="Font size"
            />
          </label>

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Auto-contrast colour</span>
            <button
              role="switch"
              aria-checked={watermark.text.autoContrast}
              onClick={() => setAutoContrast(!watermark.text.autoContrast)}
              className={`relative w-9 h-5 rounded-full transition-colors ${watermark.text.autoContrast ? 'bg-blue-600' : 'bg-zinc-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${watermark.text.autoContrast ? 'translate-x-4' : ''}`} />
            </button>
          </div>

          {!watermark.text.autoContrast && (
            <div className="flex gap-2">
              {(['#FFFFFF', '#000000'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setManualColor(c)}
                  aria-pressed={watermark.text.manualColor === c}
                  aria-label={c === '#FFFFFF' ? 'White text' : 'Black text'}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors
                    ${watermark.text.manualColor === c ? 'ring-2 ring-blue-500' : 'border-zinc-700'}
                    ${c === '#FFFFFF' ? 'bg-white text-zinc-900' : 'bg-zinc-950 text-white border-zinc-700'}`}
                >
                  {c === '#FFFFFF' ? 'White' : 'Black'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {watermark.mode === 'image' && (
        <div className="flex flex-col gap-3">
          {watermark.image.logoUrl ? (
            <div className="flex items-center gap-3">
              <img src={watermark.image.logoUrl} alt="Logo" className="h-10 object-contain rounded bg-zinc-800 p-1" />
              <button onClick={clearLogo} className="text-xs text-red-400 hover:text-red-300">Remove</button>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 p-4 cursor-pointer hover:border-zinc-500 text-sm text-zinc-400">
              <span>Upload PNG logo</span>
              <input type="file" accept="image/png" className="sr-only" onChange={handleLogoUpload} aria-label="Upload logo PNG" />
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500">Logo width — {watermark.image.widthPctOfImage}% of image</span>
            <input
              type="range" min={1} max={100} value={watermark.image.widthPctOfImage}
              onChange={(e) => setLogoWidthPct(Number(e.target.value))}
              className="accent-blue-500"
              aria-label="Logo width percentage"
            />
          </label>
        </div>
      )}

      {/* Position grid */}
      <div>
        <span className="text-xs text-zinc-500 block mb-2">Position</span>
        <div className="grid grid-cols-3 gap-1 w-24">
          {ANCHORS.map((a) => (
            <button
              key={a}
              onClick={() => setAnchor(a)}
              aria-pressed={watermark.placement.anchor === a}
              aria-label={`Position ${a}`}
              className={`w-7 h-7 rounded transition-colors
                ${watermark.placement.anchor === a ? 'bg-blue-600' : 'bg-zinc-800 hover:bg-zinc-700'}`}
            />
          ))}
        </div>
      </div>

      {/* Opacity */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">Opacity — {watermark.style.opacityPct}%</span>
        <input
          type="range" min={0} max={100} value={watermark.style.opacityPct}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="accent-blue-500"
          aria-label="Watermark opacity"
        />
      </label>
    </div>
  )
}
