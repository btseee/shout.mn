export type ConfidenceTier = 'documented' | 'reported' | 'alleged'

export type RelationshipType =
  | 'colleague'
  | 'family'
  | 'superior'
  | 'subordinate'
  | 'same_org'
  | 'financial_link'
  | 'political_ally'
  | 'appointed_by'
  | 'investigated'

export type EvidenceDocType =
  | 'declaration'
  | 'registry_record'
  | 'news_article'
  | 'government_report'
  | 'court_decision'
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
  source_node: string
  target_node: string
  relationship_type: RelationshipType
  confidence: ConfidenceTier
  evidence: Evidence[]
  relationship_detail?: string
  date_range?: { from?: string; to?: string }
}

export const CONFIDENCE_COLORS: Record<ConfidenceTier, string> = {
  documented: '#475569',
  reported: '#64748b',
  alleged: '#94a3b8',
}

export const RELATIONSHIP_TYPE_COLORS: Record<RelationshipType, string> = {
  colleague: '#5f7592',
  family: '#8d6c8b',
  same_org: '#5b8a7a',
  superior: '#8f7a58',
  subordinate: '#8b6e54',
  financial_link: '#766c98',
  political_ally: '#8f5f66',
  appointed_by: '#5f8f8a',
  investigated: '#7f668f',
}

export const CONFIDENCE_LABELS: Record<ConfidenceTier, string> = {
  documented: 'Баталгаажсан',
  reported: 'Мэдээлсэн',
  alleged: 'Үндэслэлгүй',
}

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  colleague: 'Хамт ажиллагч',
  family: 'Гэр бүлийн холбоо',
  superior: 'Дээрээс нь',
  subordinate: 'Доороо нь',
  same_org: 'Нэг байгууллагад',
  financial_link: 'Санхүүгийн холбоо',
  political_ally: 'Улс төрийн холбоотон',
  appointed_by: 'Томилсон',
  investigated: 'Шалгасан',
}

export const RELATIONSHIP_TYPE_LABELS_EN: Record<RelationshipType, string> = {
  colleague: 'Colleague',
  family: 'Family',
  superior: 'Superior',
  subordinate: 'Subordinate',
  same_org: 'Same Organization',
  financial_link: 'Financial Link',
  political_ally: 'Political Ally',
  appointed_by: 'Appointed By',
  investigated: 'Investigated',
}
