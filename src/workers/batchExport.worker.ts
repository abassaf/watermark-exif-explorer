import type { ExportJobRequest, ExportJobResult } from '../features/export/workerProtocol'
import { ANCHOR_FACTORS, FONT_OPTIONS } from '../features/watermark/types/watermark'
import { containFit, resolvePosition } from '../features/watermark/utils/canvasMath'
import { pickContrastColor } from '../features/watermark/utils/autoContrast'

/**
 * Strip JPEG metadata by removing all APP segments except APP0 (JFIF) and
 * the image data itself. This ensures EXIF, IPTC, XMP and ICC profiles are gone.
 */
async function stripJpegMetadata(blob: Blob): Promise<Blob> {
  const buf = await blob.arrayBuffer()
  const view = new DataView(buf)

  // Must start with FF D8
  if (view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) return blob

  const chunks: Uint8Array<ArrayBuffer>[] = [new Uint8Array([0xff, 0xd8])]
  let offset = 2

  while (offset < view.byteLength - 1) {
    if (view.getUint8(offset) !== 0xff) break
    const marker = view.getUint8(offset + 1)

    // SOI/EOI have no length
    if (marker === 0xd8 || marker === 0xd9) {
      chunks.push(new Uint8Array([0xff, marker]))
      offset += 2
      continue
    }

    // SOS — remainder is entropy-coded data, copy through
    if (marker === 0xda) {
      chunks.push(new Uint8Array(buf, offset))
      break
    }

    const segLen = view.getUint16(offset + 2)
    const segEnd = offset + 2 + segLen

    // Keep everything except APP1 (0xe1), APP13 (0xed), APP2 (0xe2) for clean output
    const isMetaApp = marker >= 0xe0 && marker <= 0xef && marker !== 0xe0
    if (!isMetaApp) {
      chunks.push(new Uint8Array(buf.slice(offset, offset + 2 + segLen)))
    }

    offset = segEnd
  }

  return new Blob(chunks, { type: 'image/jpeg' })
}

self.onmessage = async (e: MessageEvent<ExportJobRequest>) => {
  const req = e.data
  if (req.type !== 'EXPORT_JOB') return

  const { jobId, source, sourceName, sourceMime, quality, stripExif, watermark } = req
  const { mode, text, image, placement, style } = watermark

  try {
    const canvas = new OffscreenCanvas(source.width, source.height)
    const ctx = canvas.getContext('2d')!

    ctx.clearRect(0, 0, source.width, source.height)
    ctx.drawImage(source, 0, 0)

    const fit = containFit(source.width, source.height, source.width, source.height)
    const alpha = style.opacityPct / 100

    if (mode === 'text' && text.content.trim()) {
      const fontOption = FONT_OPTIONS.find((f) => f.id === text.fontId) ?? FONT_OPTIONS[0]
      const fontPxEff = Math.max(8, text.fontPx)
      ctx.font = `${fontPxEff}px ${fontOption.family}`
      ctx.textBaseline = 'top'

      const metrics = ctx.measureText(text.content)
      const wmW = Math.min(metrics.width, fit.drawW * 0.9)
      const wmH = fontPxEff * 1.2

      const pos = resolvePosition(
        placement.anchor, fit, wmW, wmH, placement.paddingPx,
        placement.offsetX, placement.offsetY,
      )

      let color: '#FFFFFF' | '#000000'
      if (text.autoContrast) {
        color = pickContrastColor(ctx, pos.clampedX, pos.clampedY, wmW, wmH, 1)
      } else {
        color = text.manualColor
      }

      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      ctx.fillText(text.content, pos.clampedX, pos.clampedY, wmW)
      ctx.globalAlpha = 1
    } else if (mode === 'image' && image.wmBitmap) {
      const logoW = image.logoNaturalW || image.wmBitmap.width
      const logoH = image.logoNaturalH || image.wmBitmap.height
      const targetW = (fit.drawW * image.widthPctOfImage) / 100
      const ratio = logoH / (logoW || 1)
      const wmW = Math.min(targetW, fit.drawW * 0.9)
      const wmH = wmW * ratio

      const anchorFactors = ANCHOR_FACTORS[placement.anchor]
      const baseX = fit.imgX + placement.paddingPx + anchorFactors.ax * (fit.drawW - 2 * placement.paddingPx - wmW)
      const baseY = fit.imgY + placement.paddingPx + anchorFactors.ay * (fit.drawH - 2 * placement.paddingPx - wmH)
      const x = Math.min(Math.max(baseX + placement.offsetX, fit.imgX), fit.imgX + fit.drawW - wmW)
      const y = Math.min(Math.max(baseY + placement.offsetY, fit.imgY), fit.imgY + fit.drawH - wmH)

      ctx.globalAlpha = alpha
      ctx.drawImage(image.wmBitmap, x, y, wmW, wmH)
      ctx.globalAlpha = 1
      image.wmBitmap.close()
    }

    const usePng = sourceMime === 'image/png'
    let blob = await canvas.convertToBlob(
      usePng ? { type: 'image/png' } : { type: 'image/jpeg', quality: quality / 100 },
    )

    if (stripExif && !usePng) {
      blob = await stripJpegMetadata(blob)
    }

    source.close()

    const ext = usePng ? 'png' : 'jpg'
    const baseName = sourceName.replace(/\.[^.]+$/, '')
    const outputName = `${baseName}_wm.${ext}`

    const result: ExportJobResult = { type: 'EXPORT_OK', jobId, blob, outputName }
    self.postMessage(result)
  } catch (err) {
    source.close()
    const result: ExportJobResult = {
      type: 'EXPORT_ERR',
      jobId,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
    self.postMessage(result)
  }
}
