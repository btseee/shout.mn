import { useState } from 'react'
import { Network, ArrowRight } from 'lucide-react'
import type Graph from 'graphology'
import type { Entity } from '@/types/entity.ts'
import type { Relationship } from '@/types/relationship.ts'
import { findShortestPath } from '@/utils/pathfinding.ts'
import { useSelectionStore } from '@/store/selection.ts'
import { EntityTypeBadge, StatusBadge } from '@/components/common/Badge.tsx'
import { RELATIONSHIP_TYPE_LABELS } from '@/types/relationship.ts'
import { EmptyState } from '@/components/common/EmptyState.tsx'
import { t } from '@/i18n/index.ts'

interface PathFinderProps {
  graph: Graph
  entities: Entity[]
  relationships: Relationship[]
}

export function PathFinder({ graph, entities, relationships }: PathFinderProps) {
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [path, setPath] = useState<{ entityIds: string[]; relationshipIds: string[] } | null>(null)
  const [searched, setSearched] = useState(false)
  const { setPath: setStorePath } = useSelectionStore()

  const entityMap = new Map(entities.map((e) => [e.id, e]))

  function handleFind() {
    setSearched(true)
    if (!sourceId || !targetId) return
    const result = findShortestPath(graph, sourceId, targetId)
    setPath(result)
    if (result) {
      setStorePath(result.entityIds)
    }
  }

  function handleClear() {
    setPath(null)
    setSearched(false)
    setStorePath([])
  }

  const pathRelationships = path?.entityIds.slice(0, -1).map((nodeId, i) => {
    const nextId = path.entityIds[i + 1]
    const rel = relationships.find(
      (r) =>
        (r.sourceEntityId === nodeId && r.targetEntityId === nextId) ||
        (r.sourceEntityId === nextId && r.targetEntityId === nodeId),
    )
    return { nodeId, nextId, rel }
  }) ?? []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t.pathfinder.from}
          </label>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">{t.pathfinder.selectEntity}</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {t.pathfinder.to}
          </label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">{t.pathfinder.selectEntity}</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleFind}
          disabled={!sourceId || !targetId}
          className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white font-medium rounded-lg text-sm transition-colors"
        >
          {t.pathfinder.find}
        </button>
        {searched && (
          <button
            onClick={handleClear}
            className="py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-lg text-sm transition-colors"
          >
            {t.pathfinder.clear}
          </button>
        )}
      </div>

      {searched && !path && (
        <EmptyState
          icon={<Network size={36} />}
          title={t.pathfinder.noConnectionTitle}
          description={t.pathfinder.noConnectionDesc}
        />
      )}

      {path && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t.pathfinder.pathResult(path.entityIds.length, pathRelationships.length)}
          </p>

          <div className="space-y-2">
            {path.entityIds.map((nodeId, i) => {
              const entity = entityMap.get(nodeId)
              if (!entity) return null
              const step = pathRelationships[i]

              return (
                <div key={nodeId}>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">{entity.name}</p>
                      <EntityTypeBadge type={entity.type} />
                    </div>
                  </div>

                  {step?.rel && (
                    <div className="flex items-center gap-2 pl-4 py-1">
                      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                      <ArrowRight size={12} className="text-slate-400" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {RELATIONSHIP_TYPE_LABELS[step.rel.relationshipType] ?? step.rel.relationshipType}
                        {' — '}
                        <StatusBadge status={step.rel.status} />
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
