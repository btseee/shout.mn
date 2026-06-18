import { useParams, Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useRelationship, useEntities, useSources, useEvidence } from '@/data/hooks.ts'
import { PageLayout } from '@/components/layout/PageLayout.tsx'
import { PageLoader } from '@/components/common/LoadingSpinner.tsx'
import { ErrorState } from '@/components/common/EmptyState.tsx'
import { EntityTypeBadge, StatusBadge, ConfidenceBadge } from '@/components/common/Badge.tsx'
import { ShareButton } from '@/components/common/ShareButton.tsx'
import { formatDateRange, formatDate } from '@/utils/format.ts'
import { usePageMeta } from '@/utils/seo.ts'
import { RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_STATUS_LABELS } from '@/types/relationship.ts'

export function RelationshipPage() {
  const { id } = useParams({ from: '/relationship/$id' })
  const { data: relationship, isLoading } = useRelationship(id)
  const { data: entities } = useEntities()
  const { data: sources } = useSources()
  const { data: evidence } = useEvidence()

  const sourceEntity = entities?.find((e) => e.id === relationship?.sourceEntityId)
  const targetEntity = entities?.find((e) => e.id === relationship?.targetEntityId)

  usePageMeta({
    title: relationship
      ? `${sourceEntity?.name ?? '?'} — ${targetEntity?.name ?? '?'}`
      : 'Relationship',
    description: relationship?.description,
  })

  if (isLoading) return <PageLoader />
  if (!relationship) return (
    <PageLayout maxWidth="2xl">
      <ErrorState message="Харилцаа олдсонгүй." />
    </PageLayout>
  )

  const sourceMap = new Map(sources?.map((s) => [s.id, s]) ?? [])
  const relEvidence = (evidence ?? []).filter((ev) => ev.relationshipIds.includes(id))
  const relSources = relationship.sourceIds.map((sid) => sourceMap.get(sid)).filter(Boolean)

  return (
    <PageLayout maxWidth="2xl">
      <Link
        to="/graph"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> Граф
      </Link>

      {/* Header: entity → entity */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link
          to="/entity/$id"
          params={{ id: relationship.sourceEntityId }}
          className="text-lg font-bold text-slate-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          {sourceEntity?.name ?? relationship.sourceEntityId}
        </Link>
        {sourceEntity && <EntityTypeBadge type={sourceEntity.type} />}

        <ArrowRight size={18} className="text-slate-400" />

        <Link
          to="/entity/$id"
          params={{ id: relationship.targetEntityId }}
          className="text-lg font-bold text-slate-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          {targetEntity?.name ?? relationship.targetEntityId}
        </Link>
        {targetEntity && <EntityTypeBadge type={targetEntity.type} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Type + status */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium">
              {RELATIONSHIP_TYPE_LABELS[relationship.relationshipType] ?? relationship.relationshipType}
            </span>
            <StatusBadge status={relationship.status} />
            <ConfidenceBadge confidence={relationship.confidence} />
          </div>

          {/* Description */}
          <div>
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Description
            </h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{relationship.description}</p>
          </div>

          {/* Date range */}
          {(relationship.startDate || relationship.endDate) && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Хугацаа
              </h2>
              <p className="text-slate-700 dark:text-slate-300">
                {formatDateRange(relationship.startDate, relationship.endDate)}
              </p>
            </div>
          )}

          {/* Evidence */}
          {relEvidence.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Нотолгоо ({relEvidence.length})
              </h2>
              <div className="space-y-3">
                {relEvidence.map((ev) => {
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
                          Эх сурвалж: {src.title}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Meta */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Дэлгэрэнгүй</h3>
            <dl className="space-y-3 text-sm">
              <MetaItem label="Статус" value={RELATIONSHIP_STATUS_LABELS[relationship.status]} />
              <MetaItem label="Итгэмжлэл" value={`${relationship.confidence}%`} />
              <MetaItem label="Хүч" value={`${relationship.strength}/100`} />
              <MetaItem label="Нэмэгдсэн" value={formatDate(relationship.createdAt)} />
            </dl>
          </div>

          {/* Sources */}
          {relSources.length > 0 && (
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Sources
              </h3>
              <div className="space-y-2">
                {relSources.map((src) => {
                  if (!src) return null
                  return (
                    <div key={src.id}>
                      <Link
                        to="/source/$id"
                        params={{ id: src.id }}
                        className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline block"
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

          <ShareButton />
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
