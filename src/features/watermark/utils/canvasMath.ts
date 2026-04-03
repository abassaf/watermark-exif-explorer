import { ANCHOR_FACTORS, type WatermarkAnchor } from '../types/watermark'

export interface FitRect {
  imgX: number
  imgY: number
  drawW: number
  drawH: number
  scale: number
}

/** Compute contain-fit rectangle for an image inside a canvas (CSS px). */
export function containFit(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number,
): FitRect {
  const scale = Math.min(canvasW / imgW, canvasH / imgH)
  const drawW = imgW * scale
  const drawH = imgH * scale
  return {
    imgX: (canvasW - drawW) / 2,
    imgY: (canvasH - drawH) / 2,
    drawW,
    drawH,
    scale,
  }
}

export interface AnchorPosition {
  baseX: number
  baseY: number
  clampedX: number
  clampedY: number
}

/** Compute watermark top-left position given anchor + drag offset. */
export function resolvePosition(
  anchor: WatermarkAnchor,
  fit: FitRect,
  wmW: number,
  wmH: number,
  paddingPx: number,
  offsetX: number,
  offsetY: number,
): AnchorPosition {
  const { ax, ay } = ANCHOR_FACTORS[anchor]
  const baseX = fit.imgX + paddingPx + ax * (fit.drawW - 2 * paddingPx - wmW)
  const baseY = fit.imgY + paddingPx + ay * (fit.drawH - 2 * paddingPx - wmH)

  const minX = fit.imgX
  const maxX = fit.imgX + fit.drawW - wmW
  const minY = fit.imgY
  const maxY = fit.imgY + fit.drawH - wmH

  const clampedX = Math.min(Math.max(baseX + offsetX, minX), maxX)
  const clampedY = Math.min(Math.max(baseY + offsetY, minY), maxY)

  return { baseX, baseY, clampedX, clampedY }
}

/** Clamp a drag offset so the watermark stays within the image. */
export function clampDragOffset(
  anchor: WatermarkAnchor,
  fit: FitRect,
  wmW: number,
  wmH: number,
  paddingPx: number,
  rawOffsetX: number,
  rawOffsetY: number,
): { offsetX: number; offsetY: number } {
  const { ax, ay } = ANCHOR_FACTORS[anchor]
  const baseX = fit.imgX + paddingPx + ax * (fit.drawW - 2 * paddingPx - wmW)
  const baseY = fit.imgY + paddingPx + ay * (fit.drawH - 2 * paddingPx - wmH)

  const dxMin = fit.imgX - baseX
  const dxMax = fit.imgX + fit.drawW - wmW - baseX
  const dyMin = fit.imgY - baseY
  const dyMax = fit.imgY + fit.drawH - wmH - baseY

  return {
    offsetX: Math.min(Math.max(rawOffsetX, dxMin), dxMax),
    offsetY: Math.min(Math.max(rawOffsetY, dyMin), dyMax),
  }
}
