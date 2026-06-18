export interface Investigation {
  id: string
  title: string
  summary: string
  content: string
  keyFindings: string[]
  entityIds: string[]
  relationshipIds: string[]
  sourceIds: string[]
  relatedInvestigationIds: string[]
  tags: string[]
  createdAt: string
  updatedAt: string
}
