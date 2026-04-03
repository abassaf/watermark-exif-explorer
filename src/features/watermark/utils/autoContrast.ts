/** Sample the average luminance under a region and return '#FFFFFF' or '#000000'. */
export function pickContrastColor(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  dpr: number,
): '#FFFFFF' | '#000000' {
  const sx = Math.max(0, Math.floor(x * dpr))
  const sy = Math.max(0, Math.floor(y * dpr))
  const sw = Math.max(1, Math.floor(w * dpr))
  const sh = Math.max(1, Math.floor(h * dpr))

  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(sx, sy, sw, sh).data
  } catch {
    return '#FFFFFF'
  }

  // zinc-900 background: #18181B = (24, 24, 27)
  const bgR = 24, bgG = 24, bgB = 27
  let sumL = 0
  let count = 0
  const stride = 4 * 2 // sample every 2 pixels

  for (let i = 0; i < data.length; i += stride) {
    const a = data[i + 3] / 255
    const r = a * data[i]     + (1 - a) * bgR
    const g = a * data[i + 1] + (1 - a) * bgG
    const b = a * data[i + 2] + (1 - a) * bgB
    sumL += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    count++
  }

  if (count === 0) return '#FFFFFF'
  const avg = sumL / count
  const cWhite = 1.05 / (avg + 0.05)
  const cBlack = (avg + 0.05) / 0.05
  return cWhite >= cBlack ? '#FFFFFF' : '#000000'
}
