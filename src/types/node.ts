export type NodeType = 'person' | 'company' | 'government_body' | 'media_outlet'
export type PersonSubtype = 'politician' | 'civil_servant' | 'business_person' | 'public_figure'

export interface Node {
  id: string
  name: string
  type: NodeType
  subtype?: PersonSubtype
  role_title?: string
  active_dates?: { from: string; to?: string }
  description?: string
  aliases?: string[]
  importance?: number
}

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  person: '#3b82f6',
  company: '#8b5cf6',
  government_body: '#f59e0b',
  media_outlet: '#64748b',
}

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  person: 'Хүн',
  company: 'Компани',
  government_body: 'Засгийн газрын байгуулага',
  media_outlet: 'Мэдиа байгуулага',
}
