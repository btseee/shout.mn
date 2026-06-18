import { useState, useMemo, useCallback } from 'react'
import { buildSearchIndex, searchAll } from './miniSearchIndex.ts'
import type { SearchResult } from './miniSearchIndex.ts'
import { useEntities, useRelationships, useSources } from '@/data/hooks.ts'

interface UseSearchReturn {
  query: string
  setQuery: (q: string) => void
  results: { entities: SearchResult[]; relationships: SearchResult[]; sources: SearchResult[] }
  isReady: boolean
  totalCount: number
}

export function useSearch(debounceMs = 200): UseSearchReturn {
  const [query, setQueryRaw] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const { data: entities } = useEntities()
  const { data: relationships } = useRelationships()
  const { data: sources } = useSources()

  const indexes = useMemo(() => {
    if (!entities || !relationships || !sources) return null
    return buildSearchIndex(entities, relationships, sources)
  }, [entities, relationships, sources])

  const setQuery = useCallback(
    (q: string) => {
      setQueryRaw(q)
      if (debounceTimer) clearTimeout(debounceTimer)
      const timer = setTimeout(() => setDebouncedQuery(q), debounceMs)
      setDebounceTimer(timer)
    },
    [debounceTimer, debounceMs],
  )

  const results = useMemo(() => {
    if (!indexes || !debouncedQuery.trim()) {
      return { entities: [], relationships: [], sources: [] }
    }
    return searchAll(indexes, debouncedQuery, 10)
  }, [indexes, debouncedQuery])

  const totalCount = results.entities.length + results.relationships.length + results.sources.length

  return {
    query,
    setQuery,
    results,
    isReady: !!indexes,
    totalCount,
  }
}
