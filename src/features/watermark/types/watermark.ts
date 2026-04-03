export type WatermarkMode = 'text' | 'image'

export type WatermarkAnchor =
  | 'tl' | 'tc' | 'tr'
  | 'ml' | 'c'  | 'mr'
  | 'bl' | 'bc' | 'br'

export interface TextWatermarkConfig {
  content: string
  fontId: string
  fontPx: number
  autoContrast: boolean
  manualColor: '#FFFFFF' | '#000000'
  resolvedColor: '#FFFFFF' | '#000000'
}

export interface ImageWatermarkConfig {
  logoFile: File | null
  logoUrl: string | null
  logoNaturalW: number
  logoNaturalH: number
  widthPctOfImage: number
}

export interface WatermarkPlacement {
  anchor: WatermarkAnchor
  offsetX: number
  offsetY: number
  paddingPx: number
}

export interface WatermarkStyle {
  opacityPct: number
}

export interface WatermarkConfig {
  mode: WatermarkMode
  text: TextWatermarkConfig
  image: ImageWatermarkConfig
  placement: WatermarkPlacement
  style: WatermarkStyle
}

export interface AnchorFactors {
  ax: number
  ay: number
}

export const ANCHOR_FACTORS: Record<WatermarkAnchor, AnchorFactors> = {
  tl: { ax: 0,   ay: 0   },
  tc: { ax: 0.5, ay: 0   },
  tr: { ax: 1,   ay: 0   },
  ml: { ax: 0,   ay: 0.5 },
  c:  { ax: 0.5, ay: 0.5 },
  mr: { ax: 1,   ay: 0.5 },
  bl: { ax: 0,   ay: 1   },
  bc: { ax: 0.5, ay: 1   },
  br: { ax: 1,   ay: 1   },
}

export const FONT_OPTIONS: { id: string; label: string; family: string }[] = [
  { id: 'inter',          label: 'Inter',          family: '"Inter", sans-serif'              },
  { id: 'roboto',         label: 'Roboto',         family: '"Roboto", sans-serif'             },
  { id: 'montserrat',     label: 'Montserrat',     family: '"Montserrat", sans-serif'         },
  { id: 'lora',           label: 'Lora',           family: '"Lora", serif'                    },
  { id: 'sourceSans3',    label: 'Source Sans 3',  family: '"Source Sans 3", sans-serif'      },
  { id: 'jetbrainsMono',  label: 'JetBrains Mono', family: '"JetBrains Mono", monospace'      },
]
