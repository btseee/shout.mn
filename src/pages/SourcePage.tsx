import { useParams, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useSource, useEvidence, useEntities, useRelationships } from '@/data/hooks.ts'
import { PageLayout } from '@/components/layout/PageLayout.tsx'
import { PageLoader } from '@/components/common/LoadingSpinner.tsx'
import { ErrorState } from '@/components/common/EmptyState.tsx'
import { ShareButton } from '@/components/common/ShareButton.tsx'
import { ExternalLink } from '@/components/common/ExternalLink.tsx'
import { formatDate } from '@/utils/format.ts'
import { usePageMeta } from '@/utils/seo.ts'

export function SourcePage() {
  const { id } = useParams({ from: '/source/$id' })
  const { data: source, isLoading } = useSource(id)
  const { data: evidence } = useEvidence()
  const { data: entities } = useEntities()
  const { data: relationships } = useRelationships()

  usePageMeta({
    title: source?.title ?? 'Source',
    description: `${source?.publisher ?? ''} — ${source?.reliabilityNotes ?? ''}`,
  })

  if (isLoading) return <PageLoader />
  if (!source) return (
    <PageLayout maxWidth="2xl">
      <ErrorState message="Эх сурвалж олдсонгүй." />
    </PageLayout>
  )

  const sourceEvidence = (evidence ?? []).filter((ev) => ev.sourceId === id)
  const entityMap = new Map(entities?.map((e) => [e.id, e]) ?? [])
  const relMap = new Map(relationships?.map((r) => [r.id, r]) ?? [])

  const referencedEntityIds = [...new Set(sourceEvidence.flatMap((ev) => ev.entityIds))]
  const referencedRelIds = [...new Set(sourceEvidence.flatMap((ev) => ev.relationshipIds))]

  return (
    <PageLayout maxWidth="2xl">
      <Link
        to="/graph"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div>
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
              Эх сурвалж
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{source.title}</h1>
            <p className="text-slate-500 dark:text-slate-400">{source.publisher}</p>
          </div>

          {source.url && (
            <ExternalLink href={source.url}>
              Анхны эх сурвалжыг унших
            </ExternalLink>
          )}

          {source.reliabilityNotes && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Найдвартай байдалын тэмдэглэл
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{source.reliabilityNotes}</p>
            </div>
          )}

          {/* Evidence snippets */}
          {sourceEvidence.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Энэ эх сурвалжыг ашигласан нотолгоо ({sourceEvidence.length})
              </h2>
              <div className="space-y-3">
                {sourceEvidence.map((ev) => (
                  <div key={ev.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">{ev.claimSupported}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{ev.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Referenced entities */}
          {referencedEntityIds.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Дурьдагдсан субьектүүд
              </h2>
              <div className="flex flex-wrap gap-2">
                {referencedEntityIds.map((eid) => {
                  const entity = entityMap.get(eid)
                  if (!entity) return null
                  return (
                    <Link
                      key={eid}
                      to="/entity/$id"
                      params={{ id: eid }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 hover:border-rose-300 dark:hover:border-rose-700 transition-colors"
                    >
                      {entity.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Referenced relationships */}
          {referencedRelIds.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Дурьдагдсан харилцаанууд
              </h2>
              <div className="space-y-2">
                {referencedRelIds.map((rid) => {
                  const rel = relMap.get(rid)
                  if (!rel) return null
                  const src = entityMap.get(rel.sourceEntityId)
                  const tgt = entityMap.get(rel.targetEntityId)
                  return (
                    <Link
                      key={rid}
                      to="/relationship/$id"
                      params={{ id: rid }}
                      className="block text-sm text-rose-600 dark:text-rose-400 hover:underline"
                    >
                      {src?.name ?? rel.sourceEntityId} → {tgt?.name ?? rel.targetEntityId}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Эх сурвалжийн дэлгэрэнгүй</h3>
            <dl className="space-y-3 text-sm">
              <MetaItem label="Нийтлэгч" value={source.publisher} />
              {source.publishedAt && <MetaItem label="Нийтлэгдсэн" value={formatDate(source.publishedAt)} />}
              {source.retrievedAt && <MetaItem label="Олдсон" value={formatDate(source.retrievedAt)} />}
              <MetaItem label="Нотолгоо" value={`${sourceEvidence.length} зүйл`} />
            </dl>
          </div>
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
      <dd className="font-medium text-slate-900 dark:text-white text-right text-xs">{value}</dd>
    </div>
  )
}
