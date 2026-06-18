import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Link, useSearch as useRouterSearch } from '@tanstack/react-router'
import { useSearch } from '@/search/useSearch.ts'
import { useEntities, useRelationships, useSources } from '@/data/hooks.ts'
import { PageLayout } from '@/components/layout/PageLayout.tsx'
import { PageLoader } from '@/components/common/LoadingSpinner.tsx'
import { EntityTypeBadge } from '@/components/common/Badge.tsx'
import { usePageMeta } from '@/utils/seo.ts'
import { RELATIONSHIP_TYPE_LABELS } from '@/types/relationship.ts'
import type { SearchResult } from '@/search/miniSearchIndex.ts'

export function SearchPage() {
  const routeSearch = useRouterSearch({ from: '/search' }) as { q?: string }
  const initialQuery = routeSearch.q ?? ''
  const [filter, setFilter] = useState<'all' | 'entity' | 'relationship' | 'source'>('all')
  const { query, setQuery, results, isReady, totalCount } = useSearch()
  const { data: entities } = useEntities()
  const { data: relationships } = useRelationships()
  const { data: sources } = useSources()

  // Initialize query from URL
  useState(() => { if (initialQuery) setQuery(initialQuery) })

  usePageMeta({
    title: query ? `Хайлт: "${query}"` : 'Хайлт',
    description: 'Субьект, харилцаа, эх сурвалж хайх.',
  })

  const entityMap = new Map(entities?.map((e) => [e.id, e]) ?? [])
  const relMap = new Map(relationships?.map((r) => [r.id, r]) ?? [])
  const sourceMap = new Map(sources?.map((s) => [s.id, s]) ?? [])

  const filteredResults: SearchResult[] = [
    ...(filter === 'all' || filter === 'entity' ? results.entities : []),
    ...(filter === 'all' || filter === 'relationship' ? results.relationships : []),
    ...(filter === 'all' || filter === 'source' ? results.sources : []),
  ].sort((a, b) => b.score - a.score)

  if (!isReady) return <PageLoader />

  return (
    <PageLayout maxWidth="2xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Хайлт</h1>

      {/* Search input */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Субьект, харилцаа, эх сурвалж хайх..."
          autoFocus
          className="w-full pl-9 pr-9 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          aria-label="Хайх"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Цэврэх"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filters */}
      {query && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'entity', 'relationship', 'source'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              f === 'all' ? `Бүгд (${totalCount})` :
               f === 'entity' ? `Субьектүүд (${results.entities.length})` :
               f === 'relationship' ? `Харилцаанууд (${results.relationships.length})` :
               `Эх сурвалжууд (${results.sources.length})`
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {!query && (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <Search size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">Хайлт хийхийн түлчиж эхлэнэ уу</p>
        </div>
      )}

      {query && filteredResults.length === 0 && (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <p className="text-lg mb-2">"{query}"-д үр дүн олдсонгүй</p>
          <p className="text-sm">Өөр түлхүүр үг оролдох эсвэл графыг харах</p>
        </div>
      )}

      {filteredResults.length > 0 && (
        <div className="space-y-3">
          {filteredResults.map((result) => {
            if (result.kind === 'entity') {
              const entity = entityMap.get(result.id)
              return (
                <Link
                  key={result.id}
                  to="/entity/$id"
                  params={{ id: result.id }}
                  className="block p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-sm hover:border-rose-300 dark:hover:border-rose-700 transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 dark:text-white">{result.label}</span>
                    {entity && <EntityTypeBadge type={entity.type} />}
                    <span className="ml-auto text-xs text-slate-400 hidden sm:block">Субьект</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{result.description}</p>
                </Link>
              )
            }

            if (result.kind === 'relationship') {
              const rel = relMap.get(result.id)
              const src = rel && entityMap.get(rel.sourceEntityId)
              const tgt = rel && entityMap.get(rel.targetEntityId)
              return (
                <Link
                  key={result.id}
                  to="/relationship/$id"
                  params={{ id: result.id }}
                  className="block p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-sm hover:border-rose-300 dark:hover:border-rose-700 transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {src?.name ?? '?'} → {tgt?.name ?? '?'}
                    </span>
                    <span className="ml-auto text-xs text-slate-400 hidden sm:block">Харилцаа</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {RELATIONSHIP_TYPE_LABELS[result.label] ?? result.label}
                  </p>
                </Link>
              )
            }

            if (result.kind === 'source') {
              const src = sourceMap.get(result.id)
              return (
                <Link
                  key={result.id}
                  to="/source/$id"
                  params={{ id: result.id }}
                  className="block p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-sm hover:border-rose-300 dark:hover:border-rose-700 transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900 dark:text-white">{result.label}</span>
                    <span className="ml-auto text-xs text-slate-400 hidden sm:block">Эх сурвалж</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{src?.publisher ?? result.description}</p>
                </Link>
              )
            }

            return null
          })}
        </div>
      )}
    </PageLayout>
  )
}
