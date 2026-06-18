import { Link } from '@tanstack/react-router'
import { Clock, Plus, RefreshCw, FileText } from 'lucide-react'
import { useChangelog, useEntities, useRelationships, useSources } from '@/data/hooks.ts'
import { PageLayout } from '@/components/layout/PageLayout.tsx'
import { PageLoader } from '@/components/common/LoadingSpinner.tsx'
import { formatDateShort } from '@/utils/format.ts'
import { usePageMeta } from '@/utils/seo.ts'
import type { ChangelogEntryType } from '@/types/changelog.ts'

const TYPE_ICONS: Record<ChangelogEntryType, typeof Plus> = {
  entity_added: Plus,
  entity_updated: RefreshCw,
  relationship_added: Plus,
  relationship_updated: RefreshCw,
  source_added: Plus,
  evidence_added: Plus,
  evidence_updated: RefreshCw,
  investigation_added: FileText,
}

const TYPE_LABELS: Record<ChangelogEntryType, string> = {
  entity_added: 'Entity Added',
  entity_updated: 'Entity Updated',
  relationship_added: 'Relationship Added',
  relationship_updated: 'Relationship Updated',
  source_added: 'Source Added',
  evidence_added: 'Evidence Added',
  evidence_updated: 'Evidence Updated',
  investigation_added: 'Investigation Published',
}

export function ChangesPage() {
  usePageMeta({ title: 'Recent Updates', description: 'Recent changes to the shout.mn dataset.' })

  const { data: changelog, isLoading } = useChangelog()
  const { data: entities } = useEntities()
  const { data: relationships } = useRelationships()
  const { data: sources } = useSources()

  if (isLoading) return <PageLoader />

  const entityMap = new Map(entities?.map((e) => [e.id, e]) ?? [])
  const relMap = new Map(relationships?.map((r) => [r.id, r]) ?? [])
  const sourceMap = new Map(sources?.map((s) => [s.id, s]) ?? [])

  const sorted = [...(changelog ?? [])].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <PageLayout maxWidth="2xl">
      <div className="flex items-center gap-2 mb-8">
        <Clock size={20} className="text-rose-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recent Updates</h1>
      </div>

      <div className="space-y-4">
        {sorted.map((entry) => {
          const Icon = TYPE_ICONS[entry.type] ?? Plus

          let link: React.ReactNode = null
          if (entry.entityId) {
            const entity = entityMap.get(entry.entityId)
            link = entity ? (
              <Link to="/entity/$id" params={{ id: entry.entityId }} className="text-xs text-rose-600 dark:text-rose-400 hover:underline">
                View: {entity.name}
              </Link>
            ) : null
          } else if (entry.relationshipId) {
            const rel = relMap.get(entry.relationshipId)
            if (rel) {
              const src = entityMap.get(rel.sourceEntityId)
              const tgt = entityMap.get(rel.targetEntityId)
              link = (
                <Link to="/relationship/$id" params={{ id: entry.relationshipId }} className="text-xs text-rose-600 dark:text-rose-400 hover:underline">
                  View: {src?.name ?? '?'} → {tgt?.name ?? '?'}
                </Link>
              )
            }
          } else if (entry.sourceId) {
            const source = sourceMap.get(entry.sourceId)
            link = source ? (
              <Link to="/source/$id" params={{ id: entry.sourceId }} className="text-xs text-rose-600 dark:text-rose-400 hover:underline">
                View: {source.title}
              </Link>
            ) : null
          } else if (entry.investigationId) {
            link = (
              <Link to="/investigation/$id" params={{ id: entry.investigationId }} className="text-xs text-rose-600 dark:text-rose-400 hover:underline">
                View investigation
              </Link>
            )
          }

          return (
            <div key={entry.id} className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {TYPE_LABELS[entry.type]}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{formatDateShort(entry.date)}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{entry.description}</p>
                {link && <div className="mt-1">{link}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </PageLayout>
  )
}
