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
    <div className="h-screen flex flex-col shout-canvas text-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-[rgba(168,130,255,0.1)] glass z-20 flex-wrap">
        <span className="text-sm font-bold text-white tracking-tight">shout.mn</span>
        <div className="w-px h-5 bg-[rgba(168,130,255,0.15)]" />
        <input
          type="text"
          placeholder={t('search')}
          value={searchQuery}
          onChange={e => useFiltersStore.getState().setSearchQuery(e.target.value)}
          className="search-input bg-[rgba(168,130,255,0.05)] border border-[rgba(168,130,255,0.15)] rounded-lg px-3 py-1 text-sm text-white placeholder-[#888892] w-52 focus:outline-none transition-all"
        />
        <div className="w-px h-5 bg-[rgba(168,130,255,0.15)]" />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`filter-chip text-xs px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 border ${
            showFilters || hasActiveFilters
              ? 'active border-[rgba(168,130,255,0.3)]'
              : 'border-transparent text-[#888892] hover:text-white hover:border-[rgba(168,130,255,0.15)]'
          }`}
        >
          {t('filters')}
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#a882ff]" />}
        </button>
        <div className="w-px h-5 bg-[rgba(168,130,255,0.15)]" />
        <button
          onClick={() => setShowAbout(true)}
          className="text-xs text-[#888892] hover:text-white transition-colors"
        >
          {t('about')}
        </button>
        <div className="flex-1" />
        <div className="stats-badge px-3 py-1 rounded-lg text-xs text-[#a882ff]">
          {graphNodes.length}/{allNodes.length} {t('nodes')} · {filteredEdges.length} {t('edges')}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="px-5 py-3 border-b border-[rgba(168,130,255,0.1)] glass z-10 space-y-3 panel-enter">
          <div>
            <span className="text-xs font-semibold text-[#888892] block mb-2">{t('confidence')}</span>
            <div className="flex gap-2">
              {(['documented', 'reported', 'alleged'] as ConfidenceTier[]).map(c => (
                <button
                  key={c}
                  onClick={() => toggleConfidence(c)}
                  className={`filter-chip px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                    selectedConfidence.includes(c) || selectedConfidence.length === 0
                      ? 'active border-[rgba(168,130,255,0.3)]'
                      : 'border-transparent bg-[rgba(168,130,255,0.05)] text-[#888892]'
                  }`}
                >
                  {t(c)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-[#888892] block mb-2">{t('relationshipTypes')}</span>
            <div className="flex gap-2 flex-wrap">
              {ALL_REL_TYPES.map(rt => (
                <button
                  key={rt}
                  onClick={() => toggleRelType(rt)}
                  className={`filter-chip px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                    selectedRelTypes.length === 0 || selectedRelTypes.includes(rt)
                      ? 'active border-[rgba(168,130,255,0.3)]'
                      : 'border-transparent bg-[rgba(168,130,255,0.05)] text-[#888892]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[rt] }} />
                  {relLabel(rt)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-[#888892] block mb-2">{t('jobTypes')}</span>
            <div className="flex gap-2 flex-wrap">
              {ALL_SUBTYPES.map(st => (
                <button
                  key={st}
                  onClick={() => toggleSubtype(st)}
                  className={`filter-chip px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                    selectedSubtypes.length === 0 || selectedSubtypes.includes(st)
                      ? 'active border-[rgba(168,130,255,0.3)]'
                      : 'border-transparent bg-[rgba(168,130,255,0.05)] text-[#888892]'
                  }`}
                >
                  {subtypeLabel(st)}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <div className="pt-1">
              <button
                onClick={() => useFiltersStore.getState().reset()}
                className="px-3 py-1 rounded-lg text-xs font-medium text-[#a882ff] hover:text-white bg-[rgba(168,130,255,0.1)] transition-all border border-[rgba(168,130,255,0.2)] hover:border-[rgba(168,130,255,0.4)]"
              >
                ✕ {lang === 'en' ? 'Clear all filters' : 'Бүх шүүлтүүрийг арилгах'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legend overlay */}
      <div className="absolute top-14 right-4 glass border border-[rgba(168,130,255,0.1)] rounded-xl p-4 z-30 shadow-2xl max-w-[200px]">
        <h4 className="text-xs font-semibold text-[#dcddde] mb-2">{t('relationships')}</h4>
        <div className="space-y-1.5">
          {ALL_REL_TYPES.map(rt => (
            <div key={rt} className="flex items-center gap-2">
              <div className="w-5 h-0.5 rounded" style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[rt] }} />
              <span className="text-xs text-[#888892]">{relLabel(rt)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-[rgba(168,130,255,0.1)]">
          <h4 className="text-xs font-semibold text-[#dcddde] mb-2">{t('confidence')}</h4>
          <div className="space-y-1.5">
            {(['documented', 'reported', 'alleged'] as ConfidenceTier[]).map(c => (
              <div key={c} className="flex items-center gap-2">
                <div className="w-5 h-0.5 rounded" style={{ backgroundColor: c === 'documented' ? '#10b981' : c === 'reported' ? '#f59e0b' : '#ef4444' }} />
                <span className="text-xs text-[#888892]">{t(c)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 relative">
        {graph ? (
          <>
            <SigmaGraph graph={graph} className="w-full h-full" />
            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-10">
              <button onClick={handleZoomIn} className="w-9 h-9 glass border border-[rgba(168,130,255,0.15)] hover:border-[rgba(168,130,255,0.3)] rounded-lg flex items-center justify-center text-sm text-[#a882ff] transition-all btn-glow">+</button>
              <button onClick={handleZoomOut} className="w-9 h-9 glass border border-[rgba(168,130,255,0.15)] hover:border-[rgba(168,130,255,0.3)] rounded-lg flex items-center justify-center text-sm text-[#a882ff] transition-all btn-glow">-</button>
              <button onClick={handleReset} className="w-9 h-9 glass border border-[rgba(168,130,255,0.15)] hover:border-[rgba(168,130,255,0.3)] rounded-lg flex items-center justify-center text-xs text-[#a882ff] transition-all btn-glow">⟲</button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[#888892]">
            {t('graphEmpty')}
          </div>
        )}
      </div>

      {/* Side panel */}
      {selectedNode && (
        <div className="fixed top-0 right-0 h-full w-[400px] glass border-l border-[rgba(168,130,255,0.1)] z-30 overflow-y-auto shadow-2xl panel-enter">
          <div className="p-0">
            {/* Profile header */}
            <div className="relative p-5 pb-6" style={{ background: 'linear-gradient(180deg, rgba(168,130,255,0.15) 0%, transparent 100%)' }}>
              <button onClick={clearSelection} className="absolute top-3 right-3 text-[#888892] hover:text-white text-lg z-10 transition-colors">&times;</button>
              <div className="flex items-center gap-4">
                {selectedNode.image_url && (
                  <img
                    src={selectedNode.image_url}
                    alt={selectedNode.name}
                    className="w-16 h-16 rounded-full border-2 border-[rgba(168,130,255,0.3)] object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white truncate">{selectedNode.name}</h2>
                  {selectedNode.profile?.position && (
                    <p className="text-sm text-[#a882ff] mt-0.5">{selectedNode.profile.position}</p>
                  )}
                  {selectedNode.profile?.organization && (
                    <p className="text-xs text-[#888892] mt-0.5 truncate">{selectedNode.profile.organization}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {selectedNode.subtype && (
                  <span className="px-2 py-0.5 bg-[rgba(168,130,255,0.15)] text-[#a882ff] rounded-md text-xs border border-[rgba(168,130,255,0.2)]">
                    {subtypeLabel(selectedNode.subtype)}
                  </span>
                )}
                {selectedNode.profile?.declaration_years && selectedNode.profile.declaration_years.length > 0 && (
                  <span className="px-2 py-0.5 bg-[rgba(168,130,255,0.05)] text-[#888892] rounded-md text-xs border border-[rgba(168,130,255,0.1)]">
                    {t('declYear')}: {selectedNode.profile.declaration_years.join(', ')}
                  </span>
                )}
                {selectedNode.profile?.rank != null && (
                  <span className="px-2 py-0.5 bg-[rgba(245,158,11,0.15)] text-amber-300 rounded-md text-xs border border-[rgba(245,158,11,0.2)]">
                    {lang === 'en' ? 'Rank' : 'Зэрэг'}: {selectedNode.profile.rank}
                  </span>
                )}
                {selectedNode.profile?.award_2026 && (
                  <span className="px-2 py-0.5 bg-[rgba(250,204,21,0.15)] text-yellow-300 rounded-md text-xs border border-[rgba(250,204,21,0.2)]">
                    {selectedNode.profile.award_2026}
                  </span>
                )}
                {selectedNode.profile?.political_faction && (
                  <span className="px-2 py-0.5 bg-[rgba(239,68,68,0.15)] text-rose-300 rounded-md text-xs border border-[rgba(239,68,68,0.2)]">
                    {selectedNode.profile.political_faction}
                  </span>
                )}
              </div>
            </div>

            {/* Work history */}
            {selectedNode.profile?.organization && (
              <div className="px-5 py-3 border-b border-[rgba(168,130,255,0.08)]">
                <h3 className="text-xs font-semibold text-[#888892] uppercase tracking-wider mb-3">
                  {lang === 'en' ? 'Work History' : 'Ажлын туршлага'}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#a882ff] mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm text-white">{selectedNode.profile.position}</p>
                      <p className="text-xs text-[#888892]">{selectedNode.profile.organization}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Assets */}
            {selectedNode.profile?.assets && Object.values(selectedNode.profile.assets).some(v => v != null && v !== 0 && v !== '') && (
              <div className="px-5 py-3 border-b border-[rgba(168,130,255,0.08)]">
                <h3 className="text-xs font-semibold text-[#888892] uppercase tracking-wider mb-3">
                  {lang === 'en' ? 'Assets' : 'Хөрөнгө'}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedNode.profile.assets.total_wealth != null && selectedNode.profile.assets.total_wealth > 0 && (
                    <div className="bg-[rgba(168,130,255,0.05)] rounded-lg p-2.5 border border-[rgba(168,130,255,0.08)]">
                      <p className="text-[#888892]">{lang === 'en' ? 'Total' : 'Нийт'}</p>
                      <p className="text-white font-medium">{selectedNode.profile.assets.total_wealth.toLocaleString()} ₮</p>
                    </div>
                  )}
                  {selectedNode.profile.assets.buildings != null && selectedNode.profile.assets.buildings > 0 && (
                    <div className="bg-[rgba(168,130,255,0.05)] rounded-lg p-2.5 border border-[rgba(168,130,255,0.08)]">
                      <p className="text-[#888892]">{lang === 'en' ? 'Buildings' : 'Барилга'}</p>
                      <p className="text-white font-medium">{selectedNode.profile.assets.buildings}</p>
                    </div>
                  )}
                  {selectedNode.profile.assets.savings != null && selectedNode.profile.assets.savings > 0 && (
                    <div className="bg-[rgba(168,130,255,0.05)] rounded-lg p-2.5 border border-[rgba(168,130,255,0.08)]">
                      <p className="text-[#888892]">{lang === 'en' ? 'Savings' : 'Хадгаламж'}</p>
                      <p className="text-white font-medium">{selectedNode.profile.assets.savings.toLocaleString()} ₮</p>
                    </div>
                  )}
                  {selectedNode.profile.assets.loans != null && selectedNode.profile.assets.loans > 0 && (
                    <div className="bg-[rgba(168,130,255,0.05)] rounded-lg p-2.5 border border-[rgba(168,130,255,0.08)]">
                      <p className="text-[#888892]">{lang === 'en' ? 'Loans' : 'Зээл'}</p>
                      <p className="text-white font-medium">{selectedNode.profile.assets.loans.toLocaleString()} ₮</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Buildings Detail */}
            {selectedNode.profile?.buildings_detail && Object.values(selectedNode.profile.buildings_detail).some(v => typeof v === 'number' && v > 0 && v !== selectedNode.profile!.buildings_detail!.total_value) && (
              <div className="px-5 py-3 border-b border-[rgba(168,130,255,0.08)]">
                <h3 className="text-xs font-semibold text-[#888892] uppercase tracking-wider mb-3">
                  {lang === 'en' ? 'Buildings Detail' : 'Барилгын дэлгэрэнгүй'}
                </h3>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    ['apartment', lang === 'en' ? 'Apartment' : 'Орон сууц'],
                    ['house', lang === 'en' ? 'House' : 'Хашаа байшин'],
                    ['cottage', lang === 'en' ? 'Cottage' : 'Зуслангийн байшин'],
                    ['service', lang === 'en' ? 'Service' : 'Үйлчилгээний'],
                    ['industrial', lang === 'en' ? 'Industrial' : 'Үйлдвэрийн'],
                    ['office', lang === 'en' ? 'Office' : 'Оффис'],
                    ['farm', lang === 'en' ? 'Farm' : 'Фермийн'],
                    ['home', lang === 'en' ? 'Home' : 'Гэр'],
                    ['parking', lang === 'en' ? 'Parking' : 'Зогсоол'],
                    ['other', lang === 'en' ? 'Other' : 'Бусад'],
                  ].filter(([key]) => ((selectedNode.profile!.buildings_detail as any)?.[key] || 0) > 0).map(([key, label]) => (
                    <div key={key} className="bg-[rgba(168,130,255,0.05)] rounded-lg p-1.5 border border-[rgba(168,130,255,0.08)]">
                      <p className="text-[#888892] truncate">{label}</p>
                      <p className="text-white font-medium">{(selectedNode.profile!.buildings_detail as any)?.[key]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Animals */}
            {selectedNode.profile?.animals && (
              <div className="px-5 py-3 border-b border-[rgba(168,130,255,0.08)]">
                <h3 className="text-xs font-semibold text-[#888892] uppercase tracking-wider mb-2">
                  {lang === 'en' ? 'Livestock' : 'Мал'}
                </h3>
                <p className="text-sm text-white">{selectedNode.profile.animals}</p>
              </div>
            )}

            {/* Lands */}
            {selectedNode.profile?.lands && (
              <div className="px-5 py-3 border-b border-[rgba(168,130,255,0.08)]">
                <h3 className="text-xs font-semibold text-[#888892] uppercase tracking-wider mb-2">
                  {lang === 'en' ? 'Land' : 'Газар'}
                </h3>
                <p className="text-sm text-white">{selectedNode.profile.lands}</p>
              </div>
            )}

            {/* Business Deals */}
            {selectedNode.profile?.business_deals && (
              <div className="px-5 py-3 border-b border-[rgba(168,130,255,0.08)]">
                <h3 className="text-xs font-semibold text-[#888892] uppercase tracking-wider mb-2">
                  {lang === 'en' ? 'Business Deals' : 'Хэлцэл'}
                </h3>
                <p className="text-sm text-white">{selectedNode.profile.business_deals}</p>
              </div>
            )}

            {/* Stock Ownership */}
            {selectedNode.profile?.stock_owner && (
              <div className="px-5 py-3 border-b border-[rgba(168,130,255,0.08)]">
                <h3 className="text-xs font-semibold text-[#888892] uppercase tracking-wider mb-2">
                  {lang === 'en' ? 'Stock Ownership' : 'Хувьцаа эзэмшил'}
                </h3>
                <p className="text-sm text-white">{selectedNode.profile.stock_owner}</p>
              </div>
            )}

            {/* Connections */}
            <div className="px-5 py-3">
              <h3 className="text-xs font-semibold text-[#888892] uppercase tracking-wider mb-3">
                {t('connections')}
              </h3>
              <div className="space-y-2">
                {allEdges
                  .filter(e => e.source_node === selectedNode.id || e.target_node === selectedNode.id)
                  .slice(0, 20)
                  .map(edge => {
                    const otherId = edge.source_node === selectedNode.id ? edge.target_node : edge.source_node
                    const other = allNodes.find(n => n.id === otherId)
                    const rLabel = relLabel(edge.relationship_type)
                    const rColor = RELATIONSHIP_TYPE_COLORS[edge.relationship_type]
                    return (
                      <div key={edge.id} className="connection-card bg-[rgba(168,130,255,0.03)] rounded-lg p-3 border border-[rgba(168,130,255,0.06)]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            {other?.image_url && (
                              <img src={other.image_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-[rgba(168,130,255,0.2)]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            )}
                            <span className="text-sm text-white font-medium truncate">{other?.name ?? otherId}</span>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded-md shrink-0 ml-2 border ${
                            edge.confidence === 'documented' ? 'bg-[rgba(16,185,129,0.1)] text-emerald-300 border-[rgba(16,185,129,0.2)]' :
                            edge.confidence === 'reported' ? 'bg-[rgba(245,158,11,0.1)] text-amber-300 border-[rgba(245,158,11,0.2)]' :
                            'bg-[rgba(239,68,68,0.1)] text-rose-300 border-[rgba(239,68,68,0.2)]'
                          }`}>{t(edge.confidence)}</span>
                        </div>
                        <p className="text-xs mt-1.5 font-medium" style={{ color: rColor }}>{rLabel}</p>
                        {edge.relationship_detail && (
                          <p className="text-xs text-[#888892] mt-0.5">{edge.relationship_detail}</p>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* About modal */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowAbout(false)}>
          <div className="glass border border-[rgba(168,130,255,0.15)] rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 panel-enter" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{t('aboutTitle')}</h2>
              <button onClick={() => setShowAbout(false)} className="text-[#888892] hover:text-white text-lg transition-colors">&times;</button>
            </div>
            <div className="space-y-4 text-sm text-[#dcddde]">
              <p>
                <strong className="text-white">shout.mn</strong> {t('aboutDesc')}
              </p>
              <div>
                <h3 className="font-semibold text-white mb-1">{t('sources')}</h3>
                <ul className="list-disc list-inside space-y-1 text-[#888892]">
                  <li>Авлигатай тэмцэх газар (IAAC) — мэдэгдэл, ашиг сонирхлын мэдүүлэг</li>
                  <li>xacxom.iaac.mn — Хөрөнгө, орлогын мэдүүлэг</li>
                  <li>Татварын ерөнхий газар (GASR) — компанийн бүртгэл</li>
                  <li>Шүүхийн шийдвэрийн нэгдсэн сан (shuukh.mn)</li>
                  <li>Тендерийн газар (tender.gov.mn) — төрийн худалдан авалт</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{t('confidenceTiers')}</h3>
                <ul className="space-y-1 text-[#888892]">
                  <li><span className="text-emerald-400">{t('documented')}</span> — {t('documentedDesc')}</li>
                  <li><span className="text-amber-400">{t('reported')}</span> — {t('reportedDesc')}</li>
                  <li><span className="text-rose-400">{t('alleged')}</span> — {t('allegedDesc')}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{t('legalNote')}</h3>
                <p className="text-[#888892]">
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
