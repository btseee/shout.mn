export type EntityType =
  | 'person'
  | 'company'
  | 'organization'
  | 'government_agency'
  | 'project'
  | 'asset'
  | 'contract'
  | 'donation'
  | 'media'
  | 'source'

export interface Entity {
  id: string
  name: string
  type: EntityType
  description: string
  aliases: string[]
  tags: string[]
  importance: number      // 0–100
  confidence: number      // 0–100
  sourceIds: string[]
  createdAt: string
  updatedAt: string
}

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  person: 'Хүн',
  company: 'Компани',
  organization: 'Байгуулага',
  government_agency: 'Засгийн газрын байгуулага',
  project: 'Төсөл',
  asset: 'Хөрөнгө',
  contract: 'Гэрээ',
  donation: 'Хандив',
  media: 'Мэдиа байгуулага',
  source: 'Эх сурвалж',
}

export const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  person: '#3b82f6',
  company: '#8b5cf6',
  organization: '#06b6d4',
  government_agency: '#f59e0b',
  project: '#10b981',
  asset: '#6366f1',
  contract: '#f97316',
  donation: '#ec4899',
  media: '#64748b',
  source: '#84cc16',
}
