import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { loadImageFiles } from '../features/intake/imageLoader'
import { useAppStore } from '../store/useAppStore'

export function DropZone() {
  const addImages = useAppStore((s) => s.addImages)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files)
    const items = await loadImageFiles(arr)
    addImages(items)
  }

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }
  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleFiles(e.target.files)
      e.target.value = ''
    }
  }

  return (
    <div
      role="region"
      aria-label="Image drop zone"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`
        flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed
        p-8 text-center transition-colors cursor-pointer select-none
        ${dragging
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'}
      `}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="sr-only"
        onChange={onInputChange}
        aria-label="Choose image files"
      />
      <svg className="w-10 h-10 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 16l4-4m0 0l4 4m-4-4v9M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M16 16l-4-4m0 0l-4 4m4-4V7" />
      </svg>
      <div>
        <p className="text-zinc-300 font-medium">Drop images here</p>
        <p className="text-zinc-500 text-sm mt-1">JPEG, PNG, WebP, HEIC — or <span className="text-blue-400 underline">browse files</span></p>
      </div>
    </div>
  )
}
