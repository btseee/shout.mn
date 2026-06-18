import { useRef, useCallback, useMemo, useState } from 'react'
import type Sigma from 'sigma'
import { useEntities, useRelationships } from '@/data/hooks.ts'
import { buildGraph, applyForceLayout } from '@/graph/graphBuilder.ts'
import { SigmaGraph } from '@/graph/SigmaGraph.tsx'
import { GraphControls } from '@/components/graph/GraphControls.tsx'
import { GraphLegend } from '@/components/graph/GraphLegend.tsx'
import { SidePanel } from '@/components/layout/SidePanel.tsx'
import { NodePanel, EdgePanel } from '@/components/graph/GraphPanels.tsx'
import { PathFinder } from '@/components/pathfinder/PathFinder.tsx'
import { PageLoader } from '@/components/common/LoadingSpinner.tsx'
import { useSelectionStore } from '@/store/selection.ts'
import { useGraphViewStore } from '@/store/graphView.ts'
import { useTimelineStore } from '@/store/timeline.ts'
import { useFiltersStore } from '@/store/filters.ts'
import { usePageMeta } from '@/utils/seo.ts'
import { t } from '@/i18n/index.ts'
import { Network, GitFork, Users, Star } from 'lucide-react'

const TIERS = [
  { label: 'Гол', min: 60, icon: Star },
  { label: 'Бүгд', min: 0, icon: Users },
] as const

export function GraphPage() {
  usePageMeta({
    title: 'shout.mn',
    description: 'Баримтат харилцаанууд болон холбоосуудыг судлах харилцааны граф.',
  })

  const { data: entities, isLoading: entLoading } = useEntities()
  const { data: relationships, isLoading: relLoading } = useRelationships()
  const { selectedNodeId, selectedEdgeId, clearSelection } = useSelectionStore()
  const { showLegend, showFilters, setShowLegend, setShowFilters } = useGraphViewStore()
  const { activeDate } = useTimelineStore()
  const { minImportance, setMinImportance } = useFiltersStore()
  const sigmaRef = useRef<Sigma | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'pathfinder'>('info')

  // Pre-filter entities by importance before building graph
  const filteredEntities = useMemo(() => {
    if (!entities) return []
    return entities.filter((e) => e.importance >= minImportance)
  }, [entities, minImportance])

  const filteredEntityIds = useMemo(() => new Set(filteredEntities.map((e) => e.id)), [filteredEntities])

  const filteredRelationships = useMemo(() => {
    if (!relationships) return []
    return relationships.filter(
      (r) => filteredEntityIds.has(r.sourceEntityId) && filteredEntityIds.has(r.targetEntityId),
    )
  }, [relationships, filteredEntityIds])

  const graph = useMemo(() => {
    if (!filteredEntities.length || !filteredRelationships) return null
    const g = buildGraph(filteredEntities, filteredRelationships, activeDate || undefined)
    applyForceLayout(g)
    return g
  }, [filteredEntities, filteredRelationships, activeDate])

  const handleZoomIn = useCallback(() => {
    sigmaRef.current?.getCamera().animatedZoom({ duration: 300 })
  }, [])

  const handleZoomOut = useCallback(() => {
    sigmaRef.current?.getCamera().animatedUnzoom({ duration: 300 })
  }, [])

  const handleReset = useCallback(() => {
    sigmaRef.current?.getCamera().animatedReset({ duration: 300 })
    clearSelection()
  }, [clearSelection])

  if (entLoading || relLoading || !graph) return <PageLoader />

  const selectedEntity = selectedNodeId ? filteredEntities?.find((e) => e.id === selectedNodeId) : undefined
  const selectedRelationship = selectedEdgeId ? relationships?.find((r) => r.id === selectedEdgeId) : undefined

  const panelOpen = !!(selectedEntity || selectedRelationship || showFilters)
  const panelTitle = selectedEntity?.name ?? (selectedRelationship ? 'Харилцаа' : 'Шүүлтүүр')

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Tabs + tier selector bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')}>
          <Network size={14} /> {t.graph.tabGraph}
        </TabButton>
        <TabButton active={activeTab === 'pathfinder'} onClick={() => setActiveTab('pathfinder')}>
          <GitFork size={14} /> {t.graph.tabPath}
        </TabButton>

        {activeTab === 'info' && (
          <>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
            {TIERS.map((tier) => {
              const Icon = tier.icon
              const active = minImportance === tier.min
              return (
                <button
                  key={tier.min}
                  onClick={() => setMinImportance(tier.min)}
                  title={tier.min === 0 ? 'Бүх УИХ-ын гишүүдийг харуулах' : 'Гол улс төрчдийг харуулах'}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={13} />
                  {tier.label}
                </button>
              )
            })}
          </>
        )}

        <div className="flex-1" />
        <p className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
          {filteredEntities.length} / {entities?.length ?? 0} байгууллага · {filteredRelationships.length} холбоос
        </p>
      </div>

      {activeTab === 'pathfinder' ? (
        <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t.pathfinder.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {t.pathfinder.description}
          </p>
          <PathFinder graph={graph} entities={filteredEntities ?? []} relationships={filteredRelationships ?? []} />
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          <SigmaGraph graph={graph} className="w-full h-full" />

          <GraphControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleReset}
            onToggleFilters={() => setShowFilters(!showFilters)}
            onToggleLegend={() => setShowLegend(!showLegend)}
            showFilters={showFilters}
            showLegend={showLegend}
          />

          {showLegend && <GraphLegend />}

          {/* Hint */}
          {!selectedEntity && !selectedRelationship && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-full px-4 py-2 text-xs text-slate-400 shadow-lg z-10 pointer-events-none hidden sm:block">
              Зангилааг товшиж холбоосуудыг судлах · Scroll to zoom
            </div>
          )}
        </div>
      )}

      {/* Side panel for selection */}
      <SidePanel
        open={panelOpen}
        onClose={clearSelection}
        title={panelTitle}
      >
        {selectedEntity && (
          <NodePanel
            entity={selectedEntity}
            relationships={relationships ?? []}
            entities={entities ?? []}
            onClose={clearSelection}
          />
        )}
        {selectedRelationship && !selectedEntity && (
          <EdgePanel
            relationship={selectedRelationship}
            sourceEntity={entities?.find((e) => e.id === selectedRelationship.sourceEntityId)}
            targetEntity={entities?.find((e) => e.id === selectedRelationship.targetEntityId)}
            onClose={clearSelection}
          />
        )}
      </SidePanel>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}
