import { useRef, useCallback, useMemo, useState } from 'react'
import type Sigma from 'sigma'
import { useEntities, useRelationships } from '@/data/hooks.ts'
import { buildGraph, applyCircularLayout } from '@/graph/graphBuilder.ts'
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
import { usePageMeta } from '@/utils/seo.ts'
import { Network, GitFork } from 'lucide-react'

export function GraphPage() {
  usePageMeta({
    title: 'Граф судлагч',
    description: 'Харилцаануудын хоорондах холбоосуудыг судлах харилцааны граф.',
  })

  const { data: entities, isLoading: entLoading } = useEntities()
  const { data: relationships, isLoading: relLoading } = useRelationships()
  const { selectedNodeId, selectedEdgeId, clearSelection } = useSelectionStore()
  const { showLegend, showFilters, setShowLegend, setShowFilters } = useGraphViewStore()
  const { activeDate } = useTimelineStore()
  const sigmaRef = useRef<Sigma | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'pathfinder'>('info')

  const graph = useMemo(() => {
    if (!entities || !relationships) return null
    const g = buildGraph(entities, relationships, activeDate || undefined)
    applyCircularLayout(g)
    return g
  }, [entities, relationships, activeDate])

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

  const selectedEntity = selectedNodeId ? entities?.find((e) => e.id === selectedNodeId) : undefined
  const selectedRelationship = selectedEdgeId ? relationships?.find((r) => r.id === selectedEdgeId) : undefined

  const panelOpen = !!(selectedEntity || selectedRelationship || showFilters)
  const panelTitle = selectedEntity?.name ?? (selectedRelationship ? 'Relationship' : 'Filters')

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Tabs bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')}>
          <Network size={14} /> Граф
        </TabButton>
        <TabButton active={activeTab === 'pathfinder'} onClick={() => setActiveTab('pathfinder')}>
          <GitFork size={14} /> Зам олагч
        </TabButton>
        <div className="flex-1" />
        <p className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
          {entities?.length} субьект · {relationships?.length} харилцаа
        </p>
      </div>

      {activeTab === 'pathfinder' ? (
        <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Холбоосын зам олагч</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Аливаа хоёр субьектийн хоорондох хамгийн богино баримтат замыг олоорой. Хар алхам нь харилцааны төрлөв ба нотолгоогоор харуулдаг.
          </p>
          <PathFinder graph={graph} entities={entities ?? []} relationships={relationships ?? []} />
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

          {/* Tip */}
          {!selectedEntity && !selectedRelationship && (
            <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-500 dark:text-slate-400 shadow-md z-10 hidden sm:block">
              Зангилааг товшиж холбоосуудыг судлах
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
