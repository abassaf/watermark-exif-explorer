import type { WatermarkConfig } from '../types/watermark'
import { FONT_OPTIONS } from '../types/watermark'
import { containFit, resolvePosition } from './canvasMath'
import { pickContrastColor } from './autoContrast'

export interface DrawWatermarkParams {
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  sourceImage: HTMLImageElement | ImageBitmap
  logoImage: ImageBitmap | null
  config: WatermarkConfig
  canvasCssW: number
  canvasCssH: number
  dpr: number
  /** When true, returns the resolved contrast colour (for updating store). */
  returnResolvedColor?: boolean
}

export function drawWatermark(params: DrawWatermarkParams): '#FFFFFF' | '#000000' | null {
  const { ctx, sourceImage, logoImage, config, canvasCssW, canvasCssH, dpr, returnResolvedColor } = params
  const { mode, text, image, placement, style } = config

  ctx.clearRect(0, 0, canvasCssW, canvasCssH)
  ctx.globalAlpha = 1

  const fit = containFit(
    sourceImage instanceof HTMLImageElement ? sourceImage.naturalWidth : sourceImage.width,
    sourceImage instanceof HTMLImageElement ? sourceImage.naturalHeight : sourceImage.height,
    canvasCssW,
    canvasCssH,
  )
  ctx.drawImage(sourceImage, fit.imgX, fit.imgY, fit.drawW, fit.drawH)

  const alpha = style.opacityPct / 100

  if (mode === 'text' && text.content.trim()) {
    const fontOption = FONT_OPTIONS.find((f) => f.id === text.fontId) ?? FONT_OPTIONS[0]
    const fontPxEff = Math.max(8, text.fontPx)
    ctx.font = `${fontPxEff}px ${fontOption.family}`
    ctx.textBaseline = 'top'

    const metrics = ctx.measureText(text.content)
    const wmW = Math.min(metrics.width, fit.drawW * 0.9)
    const wmH = fontPxEff * 1.2

    const pos = resolvePosition(placement.anchor, fit, wmW, wmH, placement.paddingPx, placement.offsetX, placement.offsetY)

    let color: '#FFFFFF' | '#000000'
    if (text.autoContrast) {
      color = pickContrastColor(ctx, pos.clampedX, pos.clampedY, wmW, wmH, dpr)
      if (returnResolvedColor) return color
    } else {
      color = text.manualColor
    }

    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    ctx.fillText(text.content, pos.clampedX, pos.clampedY, wmW)
    ctx.globalAlpha = 1
  } else if (mode === 'image' && logoImage) {
    const targetW = (fit.drawW * image.widthPctOfImage) / 100
    const ratio = image.logoNaturalH / (image.logoNaturalW || 1)

    const wmW = Math.min(targetW, fit.drawW * 0.9)
    const wmH = wmW * ratio

    const pos = resolvePosition(placement.anchor, fit, wmW, wmH, placement.paddingPx, placement.offsetX, placement.offsetY)

    ctx.globalAlpha = alpha
    ctx.drawImage(logoImage, pos.clampedX, pos.clampedY, wmW, wmH)
    ctx.globalAlpha = 1
  }

  return null
}
