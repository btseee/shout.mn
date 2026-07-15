export type ConfidenceTier = 'documented' | 'reported' | 'alleged'

export type RelationshipType =
  | 'family'
  | 'business_ownership'
  | 'employment'
  | 'appointment'
  | 'board_membership'
  | 'financial_transaction'
  | 'contract_awarded'
  | 'co_mention'
  | 'political_affiliation'

export type EvidenceDocType =
  | 'declaration'
  | 'court_ruling'
  | 'registry_record'
  | 'procurement_notice'
  | 'news_article'
  | 'other'

export interface Evidence {
  source_name: string
  url: string
  date_accessed: string
  document_type: EvidenceDocType
  note: string
}

export interface Edge {
  id: string
  from: string
  to: string
  relationship_type: RelationshipType
  confidence: ConfidenceTier
  evidence: Evidence[]
  date_range?: { from?: string; to?: string }
}

export const CONFIDENCE_COLORS: Record<ConfidenceTier, string> = {
  documented: '#475569',
  reported: '#64748b',
  alleged: '#94a3b8',
}

export const CONFIDENCE_DASH: Record<ConfidenceTier, number[] | undefined> = {
  documented: undefined,
  reported: [5, 3],
  alleged: [2, 2],
}

export const CONFIDENCE_LABELS: Record<ConfidenceTier, string> = {
  documented: 'Баталгаажсан',
  reported: 'Мэдээлсэн',
  alleged: 'Үндэслэлгүй',
}

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  family: 'Гэр бүлийн холбоо',
  business_ownership: 'Бизнесийн өмчлөл',
  employment: 'Хөдөлмөр эрхлэлт',
  appointment: 'Томилгоо',
  board_membership: 'Захирлын зөвлөлийн гишүүнчлэл',
  financial_transaction: 'Санхүүгийн гүйлгээ',
  contract_awarded: 'Гэрээний ялагч',
  co_mention: 'Хамт нэр дурдсан',
  political_affiliation: 'Улс төрийн холбоо',
}

export const RELATIONSHIP_TYPE_LABELS_EN: Record<RelationshipType, string> = {
  family: 'Family',
  business_ownership: 'Business Ownership',
  employment: 'Employment',
  appointment: 'Appointment',
  board_membership: 'Board Membership',
  financial_transaction: 'Financial Transaction',
  contract_awarded: 'Contract Awarded',
  co_mention: 'Co-mention',
  political_affiliation: 'Political Affiliation',
}
