import type { EvidenceDocType } from './edge'

export interface SourceRecord {
  id: string
  title: string
  url: string
  document_type: EvidenceDocType
  publisher?: string
  date_accessed: string
  reliability_notes?: string
  tags?: string[]
}
