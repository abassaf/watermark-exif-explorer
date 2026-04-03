import { useAppStore } from '../store/useAppStore'
import { runBatchExport } from '../features/export/batchExportService'

export function ExportPanel() {
  const images = useAppStore((s) => s.images)
  const selectedIds = useAppStore((s) => s.selectedIds)
  const watermark = useAppStore((s) => s.watermark)
  const exportMode = useAppStore((s) => s.exportMode)
  const exportQuality = useAppStore((s) => s.exportQuality)
  const stripExif = useAppStore((s) => s.stripExif)
  const exportPhase = useAppStore((s) => s.exportPhase)
  const exportTotal = useAppStore((s) => s.exportTotal)
  const exportProcessed = useAppStore((s) => s.exportProcessed)
  const exportPercent = useAppStore((s) => s.exportPercent)
  const exportError = useAppStore((s) => s.exportError)
  const setExportMode = useAppStore((s) => s.setExportMode)
  const setExportQuality = useAppStore((s) => s.setExportQuality)
  const setStripExif = useAppStore((s) => s.setStripExif)
  const setExportState = useAppStore((s) => s.setExportState)

  const isExporting = exportPhase === 'processing' || exportPhase === 'zipping'

  const targetImages =
    exportMode === 'selected'
      ? images.filter((i) => selectedIds.has(i.id))
      : images

  const startExport = async () => {
    if (isExporting || targetImages.length === 0) return

    setExportState({
      exportPhase: 'processing',
      exportTotal: targetImages.length,
      exportProcessed: 0,
      exportPercent: 0,
      exportError: null,
    })

    await runBatchExport(targetImages, watermark, exportQuality, stripExif, {
      onProgress: (processed, total, phase) => {
        const percent = phase === 'zipping'
          ? 90 + Math.round((processed / total) * 10)
          : Math.round((processed / total) * 90)
        setExportState({ exportPhase: phase, exportTotal: total, exportProcessed: processed, exportPercent: percent })
      },
      onDone: (zipBlob) => {
        setExportState({ exportPhase: 'done', exportPercent: 100 })
        const url = URL.createObjectURL(zipBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'watermarked.zip'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      },
      onError: (msg) => {
        setExportState({ exportPhase: 'error', exportError: msg })
      },
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-zinc-900 border border-zinc-700 p-4">
      <h3 className="text-sm font-semibold text-zinc-300">Export</h3>

      {/* Mode */}
      <div className="flex gap-2">
        {(['all', 'selected'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setExportMode(m)}
            aria-pressed={exportMode === m}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${exportMode === m ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
          >
            {m === 'all' ? `All images (${images.length})` : `Selected (${selectedIds.size})`}
          </button>
        ))}
      </div>

      {/* JPEG quality */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-zinc-500">JPEG quality — {exportQuality}%</span>
        <input
          type="range" min={50} max={100} value={exportQuality}
          onChange={(e) => setExportQuality(Number(e.target.value))}
          className="accent-blue-500"
          aria-label="JPEG export quality"
        />
      </label>

      {/* Strip EXIF */}
      <div className="flex items-center justify-between">
        <label htmlFor="strip-exif" className="text-xs text-zinc-400 cursor-pointer">
          Strip all metadata (EXIF, IPTC, XMP)
        </label>
        <button
          id="strip-exif"
          role="switch"
          aria-checked={stripExif}
          onClick={() => setStripExif(!stripExif)}
          className={`relative w-9 h-5 rounded-full transition-colors ${stripExif ? 'bg-blue-600' : 'bg-zinc-700'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${stripExif ? 'translate-x-4' : ''}`} />
        </button>
      </div>

      {/* Progress */}
      {isExporting && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>
              {exportPhase === 'zipping' ? 'Creating ZIP…' : `Processing ${exportProcessed} of ${exportTotal} images…`}
            </span>
            <span>{exportPercent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-200"
              style={{ width: `${exportPercent}%` }}
              role="progressbar"
              aria-valuenow={exportPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {exportPhase === 'error' && (
        <p className="text-xs text-red-400">{exportError}</p>
      )}

      {/* Export button */}
      <button
        onClick={startExport}
        disabled={isExporting || targetImages.length === 0}
        className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors
          ${isExporting || targetImages.length === 0
            ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700'
          }`}
        aria-label="Export watermarked images as ZIP"
      >
        {isExporting ? 'Exporting…' : `Export ${targetImages.length === 0 ? '(no images)' : `${targetImages.length} image${targetImages.length !== 1 ? 's' : ''} as ZIP`}`}
      </button>
    </div>
  )
}
