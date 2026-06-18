import { useParams, Link } from '@tanstack/react-router'
import { ArrowLeft, Download } from 'lucide-react'
import { useEntity, useRelationships, useSources, useEvidence } from '@/data/hooks.ts'
import { useEntities } from '@/data/hooks.ts'
import { PageLayout } from '@/components/layout/PageLayout.tsx'
import { PageLoader } from '@/components/common/LoadingSpinner.tsx'
import { EmptyState, ErrorState } from '@/components/common/EmptyState.tsx'
import { EntityTypeBadge, StatusBadge, ConfidenceBadge } from '@/components/common/Badge.tsx'
import { ExternalLink as ExtLink } from 'lucide-react'
import { ShareButton } from '@/components/common/ShareButton.tsx'
import { formatDate, formatDateRange } from '@/utils/format.ts'
import { exportEntityJson } from '@/utils/export.ts'
import { usePageMeta } from '@/utils/seo.ts'
import { RELATIONSHIP_TYPE_LABELS } from '@/types/relationship.ts'
import { ENTITY_TYPE_LABELS } from '@/types/entity.ts'

export function EntityPage() {
  const { id } = useParams({ from: '/entity/$id' })
  const { data: entity, isLoading } = useEntity(id)
  const { data: relationships } = useRelationships()
  const { data: entities } = useEntities()
  const { data: sources } = useSources()
  const { data: evidence } = useEvidence()

  usePageMeta({
    title: entity?.name ?? 'Entity',
    description: entity?.description,
  })

  if (isLoading) return <PageLoader />
  if (!entity) return (
    <PageLayout maxWidth="2xl">
      <ErrorState message="Entity not found." />
    </PageLayout>
  )

  const entityMap = new Map(entities?.map((e) => [e.id, e]) ?? [])
  const sourceMap = new Map(sources?.map((s) => [s.id, s]) ?? [])

  const entityRelationships = (relationships ?? []).filter(
    (r) => r.sourceEntityId === id || r.targetEntityId === id,
  )

  const entitySources = (entity.sourceIds ?? [])
    .map((sid) => sourceMap.get(sid))
    .filter(Boolean)

  const entityEvidence = (evidence ?? []).filter((e) => e.entityIds.includes(id))

  return (
    <PageLayout maxWidth="7xl">
      {/* Breadcrumb */}
      <Link
        to="/graph"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> Graph
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-start gap-3 mb-3">
              <EntityTypeBadge type={entity.type} />
              <ConfidenceBadge confidence={entity.confidence} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{entity.name}</h1>
              <div className="flex items-center gap-2 shrink-0">
                <ShareButton />
                <button
                  onClick={() => exportEntityJson(entity)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Export entity data as JSON"
                >
                  <Download size={14} />
                  Export
                </button>
              </div>
            </div>
            {entity.aliases.length > 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Also known as: {entity.aliases.join(', ')}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Overview</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{entity.description}</p>
          </div>

          {/* Relationships */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
              Relationships ({entityRelationships.length})
            </h2>
            {entityRelationships.length === 0 ? (
              <EmptyState title="No relationships" description="No documented relationships for this entity." />
            ) : (
              <div className="space-y-3">
                {entityRelationships.map((rel) => {
                  const otherId = rel.sourceEntityId === id ? rel.targetEntityId : rel.sourceEntityId
                  const other = entityMap.get(otherId)
                  const direction = rel.sourceEntityId === id ? '→' : '←'
                  return (
                    <div
                      key={rel.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm text-slate-400">{direction}</span>
                        <Link
                          to="/entity/$id"
                          params={{ id: otherId }}
                          className="font-semibold text-slate-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        >
                          {other?.name ?? otherId}
                        </Link>
                        {other && <EntityTypeBadge type={other.type} />}
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                          {RELATIONSHIP_TYPE_LABELS[rel.relationshipType] ?? rel.relationshipType}
                        </span>
                        <StatusBadge status={rel.status} />
                        <ConfidenceBadge confidence={rel.confidence} />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">{rel.description}</p>
                      {(rel.startDate || rel.endDate) && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {formatDateRange(rel.startDate, rel.endDate)}
                        </p>
                      )}
                      <Link
                        to="/relationship/$id"
                        params={{ id: rel.id }}
                        className="text-xs text-rose-600 dark:text-rose-400 hover:underline mt-1 inline-flex items-center gap-1"
                      >
                        <ExtLink size={10} /> View full relationship
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Evidence */}
          {entityEvidence.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                Evidence ({entityEvidence.length})
              </h2>
              <div className="space-y-3">
                {entityEvidence.map((ev) => {
                  const src = sourceMap.get(ev.sourceId)
                  return (
                    <div key={ev.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">{ev.claimSupported}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{ev.description}</p>
                      {src && (
                        <Link
                          to="/source/$id"
                          params={{ id: src.id }}
                          className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
                        >
                          Source: {src.title}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Meta */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Entity Details</h3>
            <dl className="space-y-3 text-sm">
              <MetaItem label="Type" value={ENTITY_TYPE_LABELS[entity.type] ?? entity.type} />
              <MetaItem label="Importance" value={`${entity.importance}/100`} />
              <MetaItem label="Confidence" value={`${entity.confidence}%`} />
              <MetaItem label="Added" value={formatDate(entity.createdAt)} />
              <MetaItem label="Updated" value={formatDate(entity.updatedAt)} />
            </dl>

            {entity.tags.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="flex flex-wrap gap-1">
                  {entity.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sources */}
          {entitySources.length > 0 && (
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Sources ({entitySources.length})
              </h3>
              <div className="space-y-2">
                {entitySources.map((src) => {
                  if (!src) return null
                  return (
                    <div key={src.id}>
                      <Link
                        to="/source/$id"
                        params={{ id: src.id }}
                        className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors block mb-0.5"
                      >
                        {src.title}
                      </Link>
                      <p className="text-xs text-slate-400">{src.publisher}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Link
              to="/graph"
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-xl hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors text-sm"
            >
              View in Graph
            </Link>
            <div className="flex gap-2">
              <ShareButton />
              <button
                onClick={() => exportEntityJson(entity)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors"
              >
                <Download size={14} />
                Export JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-900 dark:text-white text-right">{value}</dd>
    </div>
  )
}

// suppress unused import warnings
