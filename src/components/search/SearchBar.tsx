import { useRef, useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useSearch } from '@/search/useSearch.ts'
import { EntityTypeBadge } from '@/components/common/Badge.tsx'
import { useEntities } from '@/data/hooks.ts'

interface SearchBarProps {
  placeholder?: string
  autoFocus?: boolean
  onResultSelect?: () => void
}

export function SearchBar({ placeholder = 'Субьект, харилцаа, эх сурвалж хайх...', autoFocus = false, onResultSelect }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { query, setQuery, results, totalCount } = useSearch()
  const { data: entities } = useEntities()
  const entityMap = new Map(entities?.map((e) => [e.id, e]) ?? [])

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setQuery(v)
    setOpen(v.length > 0)
  }

  function handleEntitySelect(id: string) {
    setOpen(false)
    setQuery('')
    onResultSelect?.()
    void navigate({ to: '/entity/$id', params: { id } })
  }

  function handleSearchAll() {
    setOpen(false)
    void navigate({ to: '/search', search: { q: query } })
    onResultSelect?.()
  }

  const hasResults = totalCount > 0

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleChange}
          onFocus={() => query && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label="Хайх"
          aria-expanded={open}
          aria-autocomplete="list"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Хайлт цэврэх"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {open && query.length >= 2 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          {!hasResults && (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              "{query}"-ийн хайлтын үр дүн олдсонгүй
            </div>
          )}

          {results.entities.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
                Субьектүүд
              </div>
              {results.entities.slice(0, 5).map((r) => {
                const entity = entityMap.get(r.id)
                return (
                  <button
                    key={r.id}
                    onClick={() => handleEntitySelect(r.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{r.label}</span>
                    </div>
                    {entity && <EntityTypeBadge type={entity.type} />}
                  </button>
                )
              })}
            </div>
          )}

          {hasResults && (
            <button
              onMouseDown={handleSearchAll}
              className="w-full text-center text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 py-2.5 border-t border-slate-100 dark:border-slate-800 font-medium"
            >
              "{query}"-ийн {totalCount} үр дүнийг харах
            </button>
          )}
        </div>
      )}
    </div>
  )
}
