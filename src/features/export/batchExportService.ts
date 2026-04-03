import type { ExportJobRequest, ExportJobResult } from './workerProtocol'
import type { WatermarkConfig } from '../watermark/types/watermark'
import type { ImageItem } from '../../store/useAppStore'

export interface ExportCallbacks {
  onProgress: (processed: number, total: number, phase: 'processing' | 'zipping') => void
  onDone: (zipBlob: Blob) => void
  onError: (msg: string) => void
}

const MAX_WORKERS = Math.min(4, Math.max(1, (navigator.hardwareConcurrency ?? 2) - 1))

export async function runBatchExport(
  images: ImageItem[],
  watermark: WatermarkConfig,
  quality: number,
  stripExif: boolean,
  callbacks: ExportCallbacks,
): Promise<void> {
  if (images.length === 0) {
    callbacks.onError('No images to export.')
    return
  }

  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()

  let logoBitmap: ImageBitmap | null = null
  if (watermark.mode === 'image' && watermark.image.logoUrl) {
    try {
      const resp = await fetch(watermark.image.logoUrl)
      const blob = await resp.blob()
      logoBitmap = await createImageBitmap(blob)
    } catch {
      // continue without logo
    }
  }

  const total = images.length
  let processed = 0
  const queue = [...images]

  const runJob = async (item: ImageItem): Promise<void> => {
    let sourceBitmap: ImageBitmap
    try {
      sourceBitmap = await createImageBitmap(item.file)
    } catch {
      processed++
      callbacks.onProgress(processed, total, 'processing')
      return
    }

    // Clone logo bitmap per job if needed
    let wmBitmap: ImageBitmap | null = null
    if (logoBitmap) {
      wmBitmap = await createImageBitmap(logoBitmap)
    }

    const workerModule = await import('../../workers/batchExport.worker?worker')
    const WorkerClass = workerModule.default as new () => Worker
    const worker = new WorkerClass()

    await new Promise<void>((resolve) => {
      worker.onmessage = (e: MessageEvent<ExportJobResult>) => {
        const result = e.data
        if (result.type === 'EXPORT_OK') {
          zip.file(result.outputName, result.blob)
        }
        processed++
        callbacks.onProgress(processed, total, 'processing')
        worker.terminate()
        resolve()
      }
      worker.onerror = () => {
        processed++
        callbacks.onProgress(processed, total, 'processing')
        worker.terminate()
        resolve()
      }

      const req: ExportJobRequest = {
        type: 'EXPORT_JOB',
        jobId: item.id,
        source: sourceBitmap,
        sourceName: item.name,
        sourceMime: item.mime,
        quality,
        stripExif,
        watermark: {
          mode: watermark.mode,
          text: watermark.text,
          image: {
            logoNaturalW: watermark.image.logoNaturalW,
            logoNaturalH: watermark.image.logoNaturalH,
            widthPctOfImage: watermark.image.widthPctOfImage,
            wmBitmap,
          },
          placement: watermark.placement,
          style: watermark.style,
        },
      }

      const transferList: Transferable[] = [sourceBitmap]
      if (wmBitmap) transferList.push(wmBitmap)
      worker.postMessage(req, transferList)
    })
  }

  // Process in batches of MAX_WORKERS
  for (let i = 0; i < queue.length; i += MAX_WORKERS) {
    const batch = queue.slice(i, i + MAX_WORKERS)
    await Promise.all(batch.map(runJob))
  }

  if (logoBitmap) logoBitmap.close()

  callbacks.onProgress(total, total, 'zipping')

  try {
    const zipBlob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 }, streamFiles: true },
      (meta) => {
        const zPct = Math.round(meta.percent)
        callbacks.onProgress(Math.round((zPct / 100) * total), total, 'zipping')
      },
    )
    callbacks.onDone(zipBlob)
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : 'ZIP generation failed.')
  }
}
