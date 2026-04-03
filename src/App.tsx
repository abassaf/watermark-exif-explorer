import { useState } from 'react'
import { DropZone } from './components/DropZone'
import { ImageGrid } from './components/ImageGrid'
import { ExifPanel } from './components/ExifPanel'
import { WatermarkPanel } from './components/WatermarkPanel'
import { ExportPanel } from './components/ExportPanel'
import { useAppStore } from './store/useAppStore'

type RightTab = 'exif' | 'watermark'

export function App() {
  const [rightTab, setRightTab] = useState<RightTab>('watermark')
  const imageCount = useAppStore((s) => s.images.length)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight text-zinc-100">
          Watermark & EXIF Explorer
        </h1>
        {imageCount > 0 && (
          <span className="text-xs text-zinc-500">{imageCount} image{imageCount !== 1 ? 's' : ''} loaded</span>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column — image intake + grid */}
        <aside className="w-72 shrink-0 border-r border-zinc-800 flex flex-col p-4 gap-4 overflow-y-auto">
          <DropZone />
          <ImageGrid />
        </aside>

        {/* Right column — inspector / configurator */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800 px-4 pt-3 gap-1">
            {(['watermark', 'exif'] as RightTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                aria-selected={rightTab === tab}
                role="tab"
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px
                  ${rightTab === tab
                    ? 'bg-zinc-900 text-zinc-100 border border-zinc-700 border-b-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                {tab === 'watermark' ? 'Watermark' : 'EXIF'}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {rightTab === 'watermark' ? (
              <>
                <div className="rounded-2xl bg-zinc-900 border border-zinc-700 p-4">
                  <WatermarkPanel />
                </div>
                <ExportPanel />
              </>
            ) : (
              <div className="rounded-2xl bg-zinc-900 border border-zinc-700 p-4">
                <h2 className="text-sm font-semibold text-zinc-300 mb-3">Metadata</h2>
                <ExifPanel />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
