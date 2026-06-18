export type ChangelogEntryType =
  | 'entity_added'
  | 'entity_updated'
  | 'relationship_added'
  | 'relationship_updated'
  | 'source_added'
  | 'evidence_added'
  | 'evidence_updated'
  | 'investigation_added'

export interface ChangelogEntry {
  id: string
  type: ChangelogEntryType
  entityId?: string
  relationshipId?: string
  sourceId?: string
  evidenceId?: string
  investigationId?: string
  description: string
  date: string
}
