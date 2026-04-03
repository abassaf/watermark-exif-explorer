import type { WatermarkConfig } from '../watermark/types/watermark'

/** Subset of WatermarkConfig safe to postMessage (no File objects). */
export interface WorkerWatermarkConfig {
  mode: WatermarkConfig['mode']
  text: WatermarkConfig['text']
  image: Omit<WatermarkConfig['image'], 'logoFile' | 'logoUrl'> & {
    wmBitmap: ImageBitmap | null
  }
  placement: WatermarkConfig['placement']
  style: WatermarkConfig['style']
}

export interface ExportJobRequest {
  type: 'EXPORT_JOB'
  jobId: string
  source: ImageBitmap
  sourceName: string
  sourceMime: string
  quality: number
  stripExif: boolean
  watermark: WorkerWatermarkConfig
}

export type ExportJobResult =
  | { type: 'EXPORT_OK'; jobId: string; blob: Blob; outputName: string }
  | { type: 'EXPORT_ERR'; jobId: string; error: string }
