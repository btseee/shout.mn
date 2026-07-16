export type NodeType = 'person'
export type PersonSubtype = 'politician' | 'civil_servant' | 'business_person' | 'public_figure' | 'judge' | 'prosecutor' | 'military' | 'other'

export interface PersonProfile {
  organization?: string
  position?: string
  years?: number[]
  assigned_date?: string
  rank?: number
  assets?: PersonAssets
}

export interface PersonAssets {
  total_wealth?: number
  family_total?: number
  buildings?: number
  vehicles?: string
  vehicle_value?: number
  equipment_value?: number
  savings?: number
  loans?: number
  loan_bank?: string
  stocks?: string
}

export interface Node {
  id: string
  name: string
  type: NodeType
  subtype?: PersonSubtype
  description?: string
  aliases?: string[]
  importance?: number
  image_url?: string
  profile?: PersonProfile
}

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  person: '#3b82f6',
}

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  person: 'Хүн',
}

export const PERSON_SUBTYPE_LABELS: Record<PersonSubtype, string> = {
  politician: 'Улс төрч',
  civil_servant: 'Төрийн албан хаагч',
  business_person: 'Бизнесмэн',
  public_figure: 'Олон нийтийн зүтгэлтэн',
  judge: 'Шүүгч',
  prosecutor: 'Прокурор',
  military: 'Цэргийн албан хаагч',
  other: 'Бусад',
}
