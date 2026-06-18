import type { EntityType } from '@/types/entity.ts'
import type { RelationshipStatus } from '@/types/relationship.ts'
import { ENTITY_TYPE_LABELS, ENTITY_TYPE_COLORS } from '@/types/entity.ts'
import { RELATIONSHIP_STATUS_LABELS, RELATIONSHIP_STATUS_COLORS } from '@/types/relationship.ts'

interface BadgeProps {
  children: React.ReactNode
  color?: string
  className?: string
}

export function Badge({ children, color, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={color ? { backgroundColor: color + '22', color: color } : undefined}
    >
      {children}
    </span>
  )
}

export function EntityTypeBadge({ type }: { type: EntityType }) {
  const label = ENTITY_TYPE_LABELS[type] ?? type
  const color = ENTITY_TYPE_COLORS[type] ?? '#64748b'
  return <Badge color={color}>{label}</Badge>
}

export function StatusBadge({ status }: { status: RelationshipStatus }) {
  const label = RELATIONSHIP_STATUS_LABELS[status] ?? status
  const color = RELATIONSHIP_STATUS_COLORS[status] ?? '#94a3b8'

  const dotStyle: Record<RelationshipStatus, string> = {
    confirmed: 'border-b-2',
    probable: 'border-b-2 opacity-80',
    inferred: 'border-b-dashed',
    disputed: 'border-b-dotted',
  }

  return (
    <Badge color={color}>
      <span className={`w-3 h-0 border-0 ${dotStyle[status]} mr-1.5`} />
      {label}
    </Badge>
  )
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level =
    confidence >= 90 ? 'High' :
    confidence >= 70 ? 'Med-High' :
    confidence >= 50 ? 'Medium' :
    confidence >= 30 ? 'Low-Med' : 'Low'

  const color =
    confidence >= 90 ? '#10b981' :
    confidence >= 70 ? '#3b82f6' :
    confidence >= 50 ? '#f59e0b' : '#94a3b8'

  return (
    <Badge color={color}>
      {confidence}% {level}
    </Badge>
  )
}
