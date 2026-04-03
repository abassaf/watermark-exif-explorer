export interface MetadataRow {
  key: string
  label: string
  value: string
  searchable: string
}

export interface ExifSections {
  camera: MetadataRow[]
  exposure: MetadataRow[]
  location: MetadataRow[]
  fileInfo: MetadataRow[]
}

export type ParseStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface MetadataEntry {
  status: ParseStatus
  sections: ExifSections | null
  hasAnyMetadata: boolean
  error?: string
}
