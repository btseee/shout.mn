import { Clock, Plus, RefreshCw, FileText } from 'lucide-react'
import { useChangelog } from '@/data/hooks.ts'
import { PageLayout } from '@/components/layout/PageLayout.tsx'
import { PageLoader } from '@/components/common/LoadingSpinner.tsx'
import { formatDateShort } from '@/utils/format.ts'
import { usePageMeta } from '@/utils/seo.ts'
import { t } from '@/i18n/index.ts'
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

export function ChangesPage() {
  usePageMeta({ title: t.changes.title, description: 'shout.mn өгөгдлийн сүүлийн өөрчлөлтүүд.' })

  const { data: changelog, isLoading } = useChangelog()

  if (isLoading) return <PageLoader />

  const sorted = [...(changelog ?? [])].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <PageLayout maxWidth="2xl">
      <div className="flex items-center gap-2 mb-8">
        <Clock size={20} className="text-rose-600" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.changes.title}</h1>
      </div>

      <div className="space-y-3">
        {sorted.map((entry) => {
          const Icon = TYPE_ICONS[entry.type] ?? Plus
          const label = t.changes.types[entry.type] ?? entry.type

          return (
            <div
              key={entry.id}
              className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {label}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{formatDateShort(entry.date)}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{entry.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </PageLayout>
  )
}
