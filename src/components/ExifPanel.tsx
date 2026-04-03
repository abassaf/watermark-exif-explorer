import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { extractExif, hasRows } from '../features/exif/extractExif'
import type { MetadataEntry, ExifSections } from '../features/exif/types'

const SECTION_LABELS: Record<keyof ExifSections, string> = {
  camera: 'Camera',
  exposure: 'Exposure',
  location: 'Location',
  fileInfo: 'File Info',
}

export function ExifPanel() {
  const primaryId = useAppStore((s) => s.primaryId)
  const images = useAppStore((s) => s.images)
  const primary = images.find((i) => i.id === primaryId)

  const cacheRef = useRef<Map<string, MetadataEntry>>(new Map())
  const [entry, setEntry] = useState<MetadataEntry>({ status: 'idle', sections: null, hasAnyMetadata: false })
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!primary) {
      setEntry({ status: 'idle', sections: null, hasAnyMetadata: false })
      return
    }
    const cached = cacheRef.current.get(primary.id)
    if (cached?.status === 'ready' || cached?.status === 'error') {
      setEntry(cached)
      return
    }
    setEntry({ status: 'loading', sections: null, hasAnyMetadata: false })
    let cancelled = false
    ;(async () => {
      try {
        const sections = await extractExif(primary.file)
        if (cancelled) return
        const result: MetadataEntry = { status: 'ready', sections, hasAnyMetadata: hasRows(sections) }
        cacheRef.current.set(primary.id, result)
        setEntry(result)
      } catch {
        if (cancelled) return
        const result: MetadataEntry = { status: 'error', sections: null, hasAnyMetadata: false, error: 'Metadata parse failed' }
        cacheRef.current.set(primary.id, result)
        setEntry(result)
      }
    })()
    return () => { cancelled = true }
  }, [primary?.id])

  if (!primary) {
    return (
      <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">
        Select an image to inspect metadata
      </div>
    )
  }

  if (entry.status === 'loading') {
    return (
      <div className="flex items-center justify-center h-24 text-zinc-500 text-sm animate-pulse">
        Reading metadata…
      </div>
    )
  }

  if (entry.status === 'error') {
    return (
      <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">
        Couldn&apos;t read metadata from this file
      </div>
    )
  }

  if (!entry.hasAnyMetadata || !entry.sections) {
    return (
      <div className="flex flex-col gap-1 items-center justify-center h-24 text-zinc-500 text-sm">
        <span>No metadata found</span>
        <span className="text-xs text-zinc-600">{primary.name}</span>
      </div>
    )
  }

  const q = query.trim().toLowerCase()

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        placeholder="Filter metadata…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-sm
                   text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        aria-label="Filter metadata fields"
      />
      {(Object.keys(entry.sections) as (keyof ExifSections)[]).map((sectionKey) => {
        const rows = entry.sections![sectionKey]
        const filtered = q ? rows.filter((r) => r.searchable.includes(q)) : rows
        if (filtered.length === 0) return null
        return (
          <div key={sectionKey} className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-3 py-1.5 bg-zinc-800/60 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {SECTION_LABELS[sectionKey]}
            </div>
            <table className="w-full text-sm" role="grid" aria-label={SECTION_LABELS[sectionKey]}>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.key} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                    <td className="px-3 py-1.5 text-zinc-500 whitespace-nowrap w-1/3">{row.label}</td>
                    <td className="px-3 py-1.5 text-zinc-200 break-all">
                      {row.key === 'GPS' ? <GpsValue value={row.value} /> : row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

function GpsValue({ value }: { value: string }) {
  const [lat, lng] = value.split(',').map((s) => s.trim())
  const googleUrl = `https://www.google.com/maps?q=${lat},${lng}`
  const appleUrl = `https://maps.apple.com/?ll=${lat},${lng}`

  const copy = () => navigator.clipboard.writeText(value)

  return (
    <span className="flex flex-col gap-1">
      <span className="font-mono text-xs">{value}</span>
      <span className="flex gap-2 text-xs">
        <button
          onClick={copy}
          className="text-blue-400 hover:text-blue-300 focus:outline-none focus-visible:ring-1 ring-blue-500"
          aria-label="Copy coordinates to clipboard"
        >
          Copy
        </button>
        <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
          Google Maps
        </a>
        <a href={appleUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
          Apple Maps
        </a>
      </span>
    </span>
  )
}
