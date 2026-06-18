export type RelationshipStatus = 'confirmed' | 'probable' | 'inferred' | 'disputed'

export type RelationshipType =
  | 'ownership'
  | 'board_membership'
  | 'employment'
  | 'procurement_contract'
  | 'donation'
  | 'appointment'
  | 'family'
  | 'organizational_link'
  | 'investment'
  | 'partnership'
  | 'media_coverage'
  | 'oversight'
  | (string & NonNullable<unknown>)

export interface Relationship {
  id: string
  sourceEntityId: string
  targetEntityId: string
  relationshipType: RelationshipType
  description: string
  strength: number          // 0–100
  confidence: number        // 0–100
  status: RelationshipStatus
  evidenceIds: string[]
  sourceIds: string[]
  startDate: string
  endDate: string
  createdAt: string
  updatedAt: string
}

export const RELATIONSHIP_STATUS_LABELS: Record<RelationshipStatus, string> = {
  confirmed: 'Баталгаажсан',
  probable: 'Магадлалтай',
  inferred: 'Дүгнэсэн',
  disputed: 'Маргаантай',
}

export const RELATIONSHIP_STATUS_COLORS: Record<RelationshipStatus, string> = {
  confirmed: '#10b981',
  probable: '#3b82f6',
  inferred: '#f59e0b',
  disputed: '#94a3b8',
}

export const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
  ownership: 'Өмчлөл',
  board_membership: 'Захирлын зөвлөлийн гишүүнчлэл',
  employment: 'Хөдөлмөр эрхлэлт',
  procurement_contract: 'Худалдан авалтын гэрээ',
  donation: 'Хандив',
  appointment: 'Томилгоо',
  family: 'Гэр бүлийн холбоо',
  organizational_link: 'Байгууллагын холбоо',
  investment: 'Хөрөнгө оруулалт',
  partnership: 'Партнершип',
  media_coverage: 'Мэдиа сурвалжлага',
  oversight: 'Хяналт',
}
