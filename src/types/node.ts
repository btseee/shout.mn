export type NodeType = 'person'
export type PersonSubtype = 'politician' | 'civil_servant' | 'business_person' | 'public_figure' | 'judge' | 'prosecutor' | 'military' | 'other'

export interface PersonProfile {
  organization?: string
  position?: string
  years?: number[]
  assigned_date?: string
  rank?: number
  assets?: PersonAssets
  // Enriched fields
  declaration_years?: number[]
  latest_declaration?: number
  civil_service_rank?: string
  receivable_total?: number
  total_treasure_value?: number
  buildings_detail?: BuildingsDetail
  animals?: string
  animal_total_value?: number
  lands?: string
  land_total_value?: number
  business_deals?: string
  stock_owner?: string
  stock_count?: string
  stock_total_value?: string
  all_organizations?: string[]
  all_positions?: string[]
  // Award data
  award_2026?: string
  award_role?: string
  political_faction?: string
  // Parliament CV data
  work_history?: string[]
  awards?: string[]
  party?: string
}

export interface BuildingsDetail {
  apartment?: number
  house?: number
  cottage?: number
  fence?: number
  service?: number
  industrial?: number
  office?: number
  farm?: number
  home?: number
  parking?: number
  auto_parking?: number
  other?: number
  total_value?: number
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
