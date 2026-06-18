import { Network } from 'lucide-react'
import type { Entity } from '@/types/entity.ts'
import type { Relationship } from '@/types/relationship.ts'
import { EntityTypeBadge, StatusBadge, ConfidenceBadge } from '@/components/common/Badge.tsx'
import { RELATIONSHIP_TYPE_LABELS } from '@/types/relationship.ts'
import { formatDateRange } from '@/utils/format.ts'
import { t } from '@/i18n/index.ts'

interface NodePanelProps {
  entity: Entity
  relationships: Relationship[]
  entities: Entity[]
  onClose: () => void
}

export function NodePanel({ entity, relationships, entities }: NodePanelProps) {
  const entityMap = new Map(entities.map((e) => [e.id, e]))
  const connected = relationships.filter(
    (r) => r.sourceEntityId === entity.id || r.targetEntityId === entity.id,
  )

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <EntityTypeBadge type={entity.type} />
          <ConfidenceBadge confidence={entity.confidence} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{entity.name}</h3>
        {entity.aliases.length > 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {t.panel.alsoKnownAs} {entity.aliases.join(', ')}
          </p>
        )}
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-4">
          {entity.description}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          {t.panel.connections(connected.length)}
        </p>
        <div className="space-y-2">
          {connected.slice(0, 6).map((rel) => {
            const otherId = rel.sourceEntityId === entity.id ? rel.targetEntityId : rel.sourceEntityId
            const other = entityMap.get(otherId)
            if (!other) return null
            return (
              <div key={rel.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{other.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {RELATIONSHIP_TYPE_LABELS[rel.relationshipType] ?? rel.relationshipType}
                </p>
                <StatusBadge status={rel.status} />
              </div>
            )
          })}
          {connected.length > 6 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
              {t.panel.more(connected.length - 6)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface EdgePanelProps {
  relationship: Relationship
  sourceEntity: Entity | undefined
  targetEntity: Entity | undefined
  onClose: () => void
}

export function EdgePanel({ relationship, sourceEntity, targetEntity }: EdgePanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <StatusBadge status={relationship.status} />
          <ConfidenceBadge confidence={relationship.confidence} />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-900 dark:text-white">
            {sourceEntity?.name ?? relationship.sourceEntityId}
          </span>
          <Network size={14} className="text-slate-400 shrink-0" />
          <span className="font-medium text-slate-900 dark:text-white">
            {targetEntity?.name ?? relationship.targetEntityId}
          </span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
          {RELATIONSHIP_TYPE_LABELS[relationship.relationshipType] ?? relationship.relationshipType}
        </p>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-4">
        {relationship.description}
      </p>

      {(relationship.startDate || relationship.endDate) && (
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            {t.panel.period}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {formatDateRange(relationship.startDate, relationship.endDate)}
          </p>
        </div>
      )}
    </div>
  )
}
