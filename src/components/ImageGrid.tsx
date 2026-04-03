import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export function ImageGrid() {
  const images = useAppStore((s) => s.images)
  const selectedIds = useAppStore((s) => s.selectedIds)
  const primaryId = useAppStore((s) => s.primaryId)
  const selectImage = useAppStore((s) => s.selectImage)
  const removeImage = useAppStore((s) => s.removeImage)
  const selectPrev = useAppStore((s) => s.selectPrev)
  const selectNext = useAppStore((s) => s.selectNext)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return
      if (images.length === 0) return
      if (e.key === 'ArrowLeft') { e.preventDefault(); selectPrev() }
      if (e.key === 'ArrowRight') { e.preventDefault(); selectNext() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length, selectPrev, selectNext])

  if (images.length === 0) return null

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3"
      role="list"
      aria-label="Loaded images"
    >
      {images.map((img) => {
        const isSelected = selectedIds.has(img.id)
        const isPrimary = img.id === primaryId
        return (
          <div
            key={img.id}
            role="listitem"
            className="relative group cursor-pointer"
            onClick={(e) => selectImage(img.id, e.metaKey || e.ctrlKey)}
            onKeyDown={(e) => { if (e.key === 'Enter') selectImage(img.id) }}
            tabIndex={0}
            aria-label={img.name}
            aria-pressed={isSelected}
          >
            <div
              className={`
                rounded-xl overflow-hidden border-2 transition-all
                ${isPrimary ? 'border-blue-500 ring-2 ring-blue-500/30' : isSelected ? 'border-blue-400' : 'border-zinc-700 hover:border-zinc-500'}
              `}
            >
              <img
                src={img.thumbnailDataUrl}
                alt={img.name}
                className="w-full h-20 object-cover bg-zinc-800"
                draggable={false}
              />
              <div className="px-2 py-1 bg-zinc-900">
                <p className="text-xs text-zinc-400 truncate">{img.name}</p>
              </div>
            </div>
            <button
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-zinc-900/80 text-zinc-400
                         hover:bg-red-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100
                         flex items-center justify-center text-xs"
              onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
              aria-label={`Remove ${img.name}`}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
