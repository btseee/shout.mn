import { useParams, Link } from '@tanstack/react-router'
import { ArrowLeft, FileText } from 'lucide-react'
import { useInvestigation, useEntities, useSources, useRelationships, useEvidence } from '@/data/hooks.ts'
import { PageLayout } from '@/components/layout/PageLayout.tsx'
import { PageLoader } from '@/components/common/LoadingSpinner.tsx'
import { ErrorState } from '@/components/common/EmptyState.tsx'
import { EntityTypeBadge, StatusBadge } from '@/components/common/Badge.tsx'
import { ShareButton } from '@/components/common/ShareButton.tsx'
import { usePageMeta } from '@/utils/seo.ts'
import { RELATIONSHIP_TYPE_LABELS } from '@/types/relationship.ts'

export function InvestigationPage() {
  const { id } = useParams({ from: '/investigation/$id' })
  const { data: investigation, isLoading } = useInvestigation(id)
  const { data: entities } = useEntities()
  const { data: sources } = useSources()
  const { data: relationships } = useRelationships()
  const { data: evidence } = useEvidence()

  usePageMeta({
    title: investigation?.title ?? 'Investigation',
    description: investigation?.summary,
  })

  if (isLoading) return <PageLoader />
  if (!investigation) return (
    <PageLayout maxWidth="2xl">
      <ErrorState message="Мөрдлөг олдсонгүй." />
    </PageLayout>
  )

  const entityMap = new Map(entities?.map((e) => [e.id, e]) ?? [])
  const sourceMap = new Map(sources?.map((s) => [s.id, s]) ?? [])
  const relMap = new Map(relationships?.map((r) => [r.id, r]) ?? [])

  const invEntities = investigation.entityIds.map((eid) => entityMap.get(eid)).filter(Boolean)
  const invRelationships = investigation.relationshipIds.map((rid) => relMap.get(rid)).filter(Boolean)
  const invSources = investigation.sourceIds.map((sid) => sourceMap.get(sid)).filter(Boolean)
  const invEvidence = (evidence ?? []).filter(
    (ev) => ev.entityIds.some((eid) => investigation.entityIds.includes(eid))
  )

  // Parse simple markdown-ish content (bold, headers, lists)
  function renderContent(content: string) {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-slate-900 dark:text-white mt-6 mb-3">{line.slice(3)}</h2>
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-slate-900 dark:text-white">{line.slice(2, -2)}</p>
      if (line.startsWith('- ')) return <li key={i} className="text-slate-600 dark:text-slate-300 ml-4 list-disc">{line.slice(2)}</li>
      if (!line.trim()) return <br key={i} />
      return <p key={i} className="text-slate-600 dark:text-slate-300 leading-relaxed">{line}</p>
    })
  }

  return (
    <div>
      {/* Hero */}
      <div className="bg-slate-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={14} /> Нүүр хуудас
          </Link>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-rose-400" />
            <span className="text-sm text-rose-400 font-medium uppercase tracking-wider">Мөрдлөг</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">{investigation.title}</h1>
          <p className="text-lg text-slate-300 mb-6">{investigation.summary}</p>
          <div className="flex flex-wrap gap-2">
            {investigation.tags.map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 bg-white/10 text-white rounded-full border border-white/20">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <PageLayout maxWidth="7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-8">
            {/* Key Findings */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Гол олдворууд</h2>
              <ul className="space-y-2">
                {investigation.keyFindings.map((finding, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-rose-600 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{finding}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Narrative */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Мөрдлөг</h2>
              <div className="prose-like space-y-2">
                {renderContent(investigation.content)}
              </div>
            </div>

            {/* Relationships in this investigation */}
            {invRelationships.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                  Гол харилцаанууд ({invRelationships.length})
                </h2>
                <div className="space-y-3">
                  {invRelationships.map((rel) => {
                    if (!rel) return null
                    const src = entityMap.get(rel.sourceEntityId)
                    const tgt = entityMap.get(rel.targetEntityId)
                    return (
                      <Link
                        key={rel.id}
                        to="/relationship/$id"
                        params={{ id: rel.id }}
                        className="block p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            {src?.name ?? rel.sourceEntityId}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            {tgt?.name ?? rel.targetEntityId}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {RELATIONSHIP_TYPE_LABELS[rel.relationshipType] ?? rel.relationshipType}
                          </span>
                          <StatusBadge status={rel.status} />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Entities */}
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Гол субьектүүд ({invEntities.length})
              </h3>
              <div className="space-y-2">
                {invEntities.map((entity) => {
                  if (!entity) return null
                  return (
                    <Link
                      key={entity.id}
                      to="/entity/$id"
                      params={{ id: entity.id }}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{entity.name}</span>
                      <EntityTypeBadge type={entity.type} />
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Sources */}
            {invSources.length > 0 && (
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  Sources ({invSources.length})
                </h3>
                <div className="space-y-2">
                  {invSources.map((src) => {
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

            {/* Evidence count */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{invEvidence.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Нотолгооны зүйлүүд</p>
            </div>
          </div>
        </div>
      </PageLayout>
    </div>
  )
}
