import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import type Sigma from 'sigma'
import type { Node } from '@/types/node'
import type { Edge } from '@/types/edge'
import type { SourceRecord } from '@/types/source'
import { fetchNodes, fetchEdges, fetchSources } from '@/data/loaders'
import { buildGraph, applyForceLayout } from '@/graph/graphBuilder'
import { SigmaGraph } from '@/graph/SigmaGraph'
import { useSelectionStore } from '@/store/selection'
import { useFiltersStore } from '@/store/filters'
import { RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_TYPE_LABELS_EN, RELATIONSHIP_TYPE_COLORS } from '@/types/edge'
import type { ConfidenceTier } from '@/types/edge'
import type { RelationshipType } from '@/types/edge'
import type { PersonSubtype } from '@/types/node'
import { PERSON_SUBTYPE_LABELS } from '@/types/node'
import { useI18n } from '@/store/i18n'

const ALL_REL_TYPES: RelationshipType[] = ['colleague', 'family', 'same_org', 'superior', 'subordinate', 'financial_link', 'political_ally', 'appointed_by', 'investigated']
const ALL_SUBTYPES: PersonSubtype[] = ['politician', 'civil_servant', 'judge', 'prosecutor', 'military', 'public_figure', 'other']

export default function App() {
  const [allNodes, setNodes] = useState<Node[]>([])
  const [allEdges, setEdges] = useState<Edge[]>([])
  const [sources, setSources] = useState<SourceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const [showAbout, setShowAbout] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const { selectedNodeId, clearSelection } = useSelectionStore()
  const { selectedConfidence, selectedRelTypes, selectedSubtypes, searchQuery, toggleConfidence, toggleRelType, toggleSubtype } = useFiltersStore()
  const { t, lang } = useI18n()

  useEffect(() => {
    Promise.all([fetchNodes(), fetchEdges(), fetchSources()])
      .then(([n, e, s]) => { setNodes(n); setEdges(e); setSources(s) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filteredNodes = useMemo(() => {
    let result = allNodes
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.description?.toLowerCase().includes(q) ||
        n.profile?.organization?.toLowerCase().includes(q) ||
        n.profile?.position?.toLowerCase().includes(q) ||
        n.aliases?.some(a => a.toLowerCase().includes(q))
      )
    }
    if (selectedSubtypes.length > 0) {
      result = result.filter(n => n.subtype && selectedSubtypes.includes(n.subtype))
    }
    return result
  }, [allNodes, searchQuery, selectedSubtypes])

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes])

  const filteredEdges = useMemo(() => {
    return allEdges.filter(e =>
      filteredNodeIds.has(e.source_node) && filteredNodeIds.has(e.target_node) &&
      (selectedConfidence.length === 0 || selectedConfidence.includes(e.confidence)) &&
      (selectedRelTypes.length === 0 || selectedRelTypes.includes(e.relationship_type))
    )
  }, [allEdges, filteredNodeIds, selectedConfidence, selectedRelTypes])

  // Hide orphan nodes when any filter is active
  const hasActiveFilters = selectedConfidence.length > 0 || selectedRelTypes.length > 0 || selectedSubtypes.length > 0 || searchQuery.length > 0

  const graphNodes = useMemo(() => {
    if (!hasActiveFilters) return filteredNodes
    const nodesWithEdges = new Set<string>()
    for (const e of filteredEdges) {
      nodesWithEdges.add(e.source_node)
      nodesWithEdges.add(e.target_node)
    }
    return filteredNodes.filter(n => nodesWithEdges.has(n.id))
  }, [filteredNodes, filteredEdges, hasActiveFilters])

  const graph = useMemo(() => {
    if (!graphNodes.length || !filteredEdges.length) return null
    const g = buildGraph(graphNodes, filteredEdges)
    applyForceLayout(g)
    return g
  }, [graphNodes, filteredEdges])

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

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500 bg-slate-950">{t('loading')}</div>
  if (error) return <div className="flex items-center justify-center h-screen text-red-500 bg-slate-950">{t('error')}: {error}</div>

  const selectedNode = selectedNodeId ? allNodes.find(n => n.id === selectedNodeId) : null

  const subtypeLabel = (s: PersonSubtype) => {
    const labels: Record<PersonSubtype, string> = {
      politician: t('politician'),
      civil_servant: t('civil_servant'),
      business_person: t('business_person'),
      public_figure: t('public_figure'),
      judge: t('judge'),
      prosecutor: t('prosecutor'),
      military: t('military'),
      other: t('other'),
    }
    return labels[s] ?? s
  }

  const relLabel = (r: RelationshipType) => {
    const labels = lang === 'en' ? RELATIONSHIP_TYPE_LABELS_EN : RELATIONSHIP_TYPE_LABELS
    return (labels as any)[r] ?? r.replace(/_/g, ' ')
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm z-20 flex-wrap">
        <span className="text-sm font-bold text-white tracking-tight">shout.mn</span>
        <div className="w-px h-5 bg-slate-700" />
        <input
          type="text"
          placeholder={t('search')}
          value={searchQuery}
          onChange={e => useFiltersStore.getState().setSearchQuery(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-sm text-white placeholder-slate-400 w-48 focus:outline-none focus:border-blue-500"
        />
        <div className="w-px h-5 bg-slate-700" />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1.5 ${
            showFilters || hasActiveFilters ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {t('filters')}
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
        </button>
        <div className="w-px h-5 bg-slate-700" />
        <button
          onClick={() => setShowAbout(true)}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          {t('about')}
        </button>
        <div className="flex-1" />
        <p className="text-xs text-slate-500">
          {graphNodes.length}/{allNodes.length} {t('nodes')} · {filteredEdges.length} {t('edges')}
        </p>
      </div>

      {/* Filter panel — all filters under one menu */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80 z-10 space-y-3">
          {/* Confidence */}
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1.5">{t('confidence')}</span>
            <div className="flex gap-2">
              {(['documented', 'reported', 'alleged'] as ConfidenceTier[]).map(c => (
                <button
                  key={c}
                  onClick={() => toggleConfidence(c)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    selectedConfidence.includes(c) || selectedConfidence.length === 0
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800 text-slate-600'
                  }`}
                >
                  {t(c)}
                </button>
              ))}
            </div>
          </div>

          {/* Relationship types */}
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1.5">{t('relationshipTypes')}</span>
            <div className="flex gap-2 flex-wrap">
              {ALL_REL_TYPES.map(rt => (
                <button
                  key={rt}
                  onClick={() => toggleRelType(rt)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    selectedRelTypes.length === 0 || selectedRelTypes.includes(rt)
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800 text-slate-600'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[rt] }} />
                  {relLabel(rt)}
                </button>
              ))}
            </div>
          </div>

          {/* Subtypes */}
          <div>
            <span className="text-xs font-semibold text-slate-400 block mb-1.5">{t('jobTypes')}</span>
            <div className="flex gap-2 flex-wrap">
              {ALL_SUBTYPES.map(st => (
                <button
                  key={st}
                  onClick={() => toggleSubtype(st)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    selectedSubtypes.length === 0 || selectedSubtypes.includes(st)
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800 text-slate-600'
                  }`}
                >
                  {subtypeLabel(st)}
                </button>
              ))}
            </div>
          </div>

          {/* Clear all */}
          {hasActiveFilters && (
            <div className="pt-1">
              <button
                onClick={() => useFiltersStore.getState().reset()}
                className="px-3 py-1 rounded text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 transition-colors"
              >
                ✕ {lang === 'en' ? 'Clear all filters' : 'Бүх шүүлтүүрийг арилгах'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legend overlay - always visible */}
      <div className="absolute top-12 right-4 bg-slate-900 border border-slate-700 rounded-lg p-3 z-30 shadow-xl max-w-[220px]">
        <h4 className="text-xs font-semibold text-slate-300 mb-2">{t('confidence')}</h4>
        <div className="space-y-1">
          {(['documented', 'reported', 'alleged'] as ConfidenceTier[]).map(c => (
            <div key={c} className="flex items-center gap-2">
              <div className="w-6 h-0.5 rounded" style={{ backgroundColor: c === 'documented' ? '#475569' : c === 'reported' ? '#64748b' : '#94a3b8' }} />
              <span className="text-xs text-slate-400">{t(c)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-slate-700">
          <h4 className="text-xs font-semibold text-slate-300 mb-2">{t('relationships')}</h4>
          <div className="space-y-1">
            {ALL_REL_TYPES.map(rt => (
              <div key={rt} className="flex items-center gap-2">
                <div className="w-6 h-0.5 rounded" style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[rt] }} />
                <span className="text-xs text-slate-400">{relLabel(rt)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-700">
          <h4 className="text-xs font-semibold text-slate-300 mb-2">{t('nodeTypes')}</h4>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
              <span className="text-xs text-slate-400">{t('person')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 relative">
        {graph ? (
          <>
            <SigmaGraph graph={graph} className="w-full h-full" />
            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
              <button onClick={handleZoomIn} className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center text-sm text-slate-300 border border-slate-700">+</button>
              <button onClick={handleZoomOut} className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center text-sm text-slate-300 border border-slate-700">-</button>
              <button onClick={handleReset} className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center text-xs text-slate-300 border border-slate-700">⟲</button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            {t('graphEmpty')}
          </div>
        )}
      </div>

      {/* Side panel */}
      {selectedNode && (
        <div className="fixed top-0 right-0 h-full w-96 bg-slate-900 border-l border-slate-700 z-30 overflow-y-auto shadow-2xl">
          <div className="p-0">
            {/* Profile header with image */}
            <div className="relative bg-gradient-to-b from-blue-900/40 to-slate-900 p-4 pb-6">
              <button onClick={clearSelection} className="absolute top-3 right-3 text-slate-400 hover:text-white text-lg z-10">&times;</button>
              <div className="flex items-center gap-4">
                {selectedNode.image_url && (
                  <img
                    src={selectedNode.image_url}
                    alt={selectedNode.name}
                    className="w-16 h-16 rounded-full border-2 border-blue-500/50 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">{selectedNode.name}</h2>
                  {selectedNode.profile?.position && (
                    <p className="text-sm text-blue-300 mt-0.5">{selectedNode.profile.position}</p>
                  )}
                  {selectedNode.profile?.organization && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{selectedNode.profile.organization}</p>
                  )}
                </div>
              </div>
              {/* Tags */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {selectedNode.subtype && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                    {subtypeLabel(selectedNode.subtype)}
                  </span>
                )}
                {selectedNode.profile?.years && selectedNode.profile.years.length > 0 && (
                  <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">
                    {selectedNode.profile.years.join(', ')}
                  </span>
                )}
                {selectedNode.profile?.rank != null && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-xs">
                    {lang === 'en' ? 'Rank' : 'Зэрэг'}: {selectedNode.profile.rank}
                  </span>
                )}
              </div>
            </div>

            {/* Work history */}
            {selectedNode.profile?.organization && (
              <div className="px-4 py-3 border-b border-slate-800">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {lang === 'en' ? 'Work History' : 'Ажлын туршлага'}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm text-white">{selectedNode.profile.position}</p>
                      <p className="text-xs text-slate-400">{selectedNode.profile.organization}</p>
                      {selectedNode.profile.years && selectedNode.profile.years.length > 0 && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {lang === 'en' ? 'Declared' : 'Мэдүүлсэн'}: {selectedNode.profile.years.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Assets */}
            {selectedNode.profile?.assets && Object.values(selectedNode.profile.assets).some(v => v != null && v !== 0 && v !== '') && (
              <div className="px-4 py-3 border-b border-slate-800">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {lang === 'en' ? 'Assets' : 'Хөрөнгө'}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedNode.profile.assets.total_wealth != null && selectedNode.profile.assets.total_wealth > 0 && (
                    <div className="bg-slate-800 rounded p-2">
                      <p className="text-slate-500">{lang === 'en' ? 'Total' : 'Нийт'}</p>
                      <p className="text-white font-medium">{selectedNode.profile.assets.total_wealth.toLocaleString()} ₮</p>
                    </div>
                  )}
                  {selectedNode.profile.assets.buildings != null && selectedNode.profile.assets.buildings > 0 && (
                    <div className="bg-slate-800 rounded p-2">
                      <p className="text-slate-500">{lang === 'en' ? 'Buildings' : 'Барилга'}</p>
                      <p className="text-white font-medium">{selectedNode.profile.assets.buildings}</p>
                    </div>
                  )}
                  {selectedNode.profile.assets.savings != null && selectedNode.profile.assets.savings > 0 && (
                    <div className="bg-slate-800 rounded p-2">
                      <p className="text-slate-500">{lang === 'en' ? 'Savings' : 'Хадгаламж'}</p>
                      <p className="text-white font-medium">{selectedNode.profile.assets.savings.toLocaleString()} ₮</p>
                    </div>
                  )}
                  {selectedNode.profile.assets.loans != null && selectedNode.profile.assets.loans > 0 && (
                    <div className="bg-slate-800 rounded p-2">
                      <p className="text-slate-500">{lang === 'en' ? 'Loans' : 'Зээл'}</p>
                      <p className="text-white font-medium">{selectedNode.profile.assets.loans.toLocaleString()} ₮</p>
                    </div>
                  )}
                  {selectedNode.profile.assets.vehicle_value != null && selectedNode.profile.assets.vehicle_value > 0 && (
                    <div className="bg-slate-800 rounded p-2 col-span-2">
                      <p className="text-slate-500">{lang === 'en' ? 'Vehicles' : 'Тээвэр хэрэгсэл'}</p>
                      <p className="text-white font-medium text-xs">{selectedNode.profile.assets.vehicles || '-'}</p>
                      <p className="text-slate-400 text-xs">{selectedNode.profile.assets.vehicle_value.toLocaleString()} ₮</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Connections */}
            <div className="px-4 py-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {t('connections')}
              </h3>
              <div className="space-y-2">
                {allEdges
                  .filter(e => e.source_node === selectedNode.id || e.target_node === selectedNode.id)
                  .map(edge => {
                    const otherId = edge.source_node === selectedNode.id ? edge.target_node : edge.source_node
                    const other = allNodes.find(n => n.id === otherId)
                    const rLabel = relLabel(edge.relationship_type)
                    const rColor = RELATIONSHIP_TYPE_COLORS[edge.relationship_type]
                    return (
                      <div key={edge.id} className="bg-slate-800 rounded-lg p-3 hover:bg-slate-750 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            {other?.image_url && (
                              <img src={other.image_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            )}
                            <span className="text-sm text-white font-medium truncate">{other?.name ?? otherId}</span>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                            edge.confidence === 'documented' ? 'bg-green-500/20 text-green-300' :
                            edge.confidence === 'reported' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>{t(edge.confidence)}</span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: rColor }}>{rLabel}</p>
                        {edge.relationship_detail && (
                          <p className="text-xs text-slate-400 mt-0.5">{edge.relationship_detail}</p>
                        )}
                        {edge.evidence.length > 0 && (
                          <div className="mt-2 border-t border-slate-700 pt-2">
                            {edge.evidence.map((ev, i) => (
                              <p key={i} className="text-xs text-slate-500">
                                {ev.url ? <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{ev.source_name}</a> : ev.source_name}
                                {': '}{ev.note}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                {allEdges.filter(e => e.source_node === selectedNode.id || e.target_node === selectedNode.id).length === 0 && (
                  <p className="text-xs text-slate-500">{lang === 'en' ? 'No connections found' : 'Холбоо олдсонгүй'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* About modal */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAbout(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{t('aboutTitle')}</h2>
              <button onClick={() => setShowAbout(false)} className="text-slate-400 hover:text-white text-lg">&times;</button>
            </div>
            <div className="space-y-4 text-sm text-slate-300">
              <p>
                <strong className="text-white">shout.mn</strong> {t('aboutDesc')}
              </p>
              <div>
                <h3 className="font-semibold text-white mb-1">{t('sources')}</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Авлигатай тэмцэх газар (IAAC) — мэдэгдэл, ашиг сонирхлын мэдүүлэг</li>
                  <li>xacxom.iaac.mn — Хөрөнгө, орлогын мэдүүлэг</li>
                  <li>Татварын ерөнхий газар (GASR) — компанийн бүртгэл</li>
                  <li>Шүүхийн шийдвэрийн нэгдсэн сан (shuukh.mn)</li>
                  <li>Тендерийн газар (tender.gov.mn) — төрийн худалдан авалт</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{t('confidenceTiers')}</h3>
                <ul className="space-y-1 text-slate-400">
                  <li><span className="text-green-400">{t('documented')}</span> — {t('documentedDesc')}</li>
                  <li><span className="text-yellow-400">{t('reported')}</span> — {t('reportedDesc')}</li>
                  <li><span className="text-red-400">{t('alleged')}</span> — {t('allegedDesc')}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{t('legalNote')}</h3>
                <p className="text-slate-400">
                  {t('legalDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
