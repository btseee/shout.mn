import { useEffect, useState, useRef } from 'react'
import type { Node } from '@/types/node'
import type { Edge } from '@/types/edge'
import { fetchNodes, fetchEdges } from '@/data/loaders'
import { buildGraph, applyForceLayout } from '@/graph/graphBuilder'
import { SigmaGraph } from '@/graph/SigmaGraph'
import { useSelectionStore } from '@/store/selection'
import { useFiltersStore } from '@/store/filters'
import { useGraphViewStore } from '@/store/graphView'
import { RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_TYPE_LABELS_EN, RELATIONSHIP_TYPE_COLORS } from '@/types/edge'
import type { ConfidenceTier } from '@/types/edge'
import type { RelationshipType } from '@/types/edge'
import type { PersonSubtype } from '@/types/node'
import { useI18n } from '@/store/i18n'
import Graph from 'graphology'

const ALL_REL_TYPES: RelationshipType[] = ['colleague', 'family', 'same_org', 'superior', 'subordinate', 'financial_link', 'political_ally', 'appointed_by', 'investigated']
const ALL_SUBTYPES: PersonSubtype[] = ['politician', 'civil_servant', 'business_person', 'judge', 'prosecutor', 'military', 'public_figure', 'other']

export default function App() {
  const [graph, setGraph] = useState<Graph | null>(null)
  const [allNodes, setNodes] = useState<Node[]>([])
  const [, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAbout, setShowAbout] = useState(false)
  const builtRef = useRef(false)
  const { selectedNodeId, clearSelection } = useSelectionStore()
  const {
    selectedConfidence,
    selectedRelTypes,
    selectedSubtypes,
    searchQuery,
    toggleConfidence,
    toggleRelType,
    toggleSubtype,
    setSearchQuery,
    reset,
  } = useFiltersStore()
  const {
    showFilters,
    showLegend,
    showArrows,
    textFadeThreshold,
    nodeSizeScale,
    edgeSizeScale,
    centerForce,
    repelForce,
    linkForce,
    setShowFilters,
    setShowArrows,
    setTextFadeThreshold,
    setNodeSizeScale,
    setEdgeSizeScale,
    setCenterForce,
    setRepelForce,
    setLinkForce,
  } = useGraphViewStore()
  const { t, lang } = useI18n()

  // Build graph ONCE on mount
  useEffect(() => {
    if (builtRef.current) return
    builtRef.current = true

    Promise.all([fetchNodes(), fetchEdges()])
      .then(([n, e]) => {
        setNodes(n)
        setEdges(e)
        const g = buildGraph(n, e)
        const view = useGraphViewStore.getState()
        applyForceLayout(g, {
          centerForce: view.centerForce,
          repelForce: view.repelForce,
          linkForce: view.linkForce,
        })
        setGraph(g)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

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

  const animateLayout = () => {
    if (!graph) return
    const g = graph.copy()
    applyForceLayout(g, { centerForce, repelForce, linkForce })
    setGraph(g)
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
          onChange={e => setSearchQuery(e.target.value)}
          className="search-input bg-[rgba(168,130,255,0.05)] border border-[rgba(168,130,255,0.15)] rounded-lg px-3 py-1 text-sm text-white placeholder-[#888892] w-52 focus:outline-none transition-all"
        />
        <div className="w-px h-5 bg-[rgba(168,130,255,0.15)]" />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`filter-chip text-xs px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 border ${
            showFilters
              ? 'active border-[rgba(168,130,255,0.3)]'
              : 'border-transparent text-[#888892] hover:text-white hover:border-[rgba(168,130,255,0.15)]'
          }`}
        >
          {t('filters')}
          {(selectedConfidence.length > 0 || selectedRelTypes.length > 0 || selectedSubtypes.length > 0) && <span className="w-1.5 h-1.5 rounded-full bg-[#a882ff]" />}
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
          {graph ? graph.order : 0} {t('nodes')} · {graph ? graph.size : 0} {t('edges')}
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 relative">
        {showFilters && (
          <div className="absolute top-4 left-4 w-[320px] max-h-[calc(100%-2rem)] overflow-y-auto glass border border-[rgba(168,130,255,0.15)] rounded-xl p-4 z-30 shadow-2xl panel-enter">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">{t('filters')}</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-[#888892] hover:text-white text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 pb-2 border-b border-[rgba(168,130,255,0.1)]">
              <div>
                <span className="text-xs font-semibold text-[#888892] block mb-2">{t('confidence')}</span>
                <div className="flex gap-2 flex-wrap">
                  {(['documented', 'reported', 'alleged'] as ConfidenceTier[]).map(c => (
                    <button
                      key={c}
                      onClick={() => toggleConfidence(c)}
                      className={`filter-chip px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                        selectedConfidence.length === 0 || selectedConfidence.includes(c)
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
                <div className="flex gap-1.5 flex-wrap">
                  {ALL_REL_TYPES.map(rt => (
                    <button
                      key={rt}
                      onClick={() => toggleRelType(rt)}
                      className={`filter-chip px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
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
                <div className="flex gap-1.5 flex-wrap">
                  {ALL_SUBTYPES.map(st => (
                    <button
                      key={st}
                      onClick={() => toggleSubtype(st)}
                      className={`filter-chip px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
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

              {(selectedConfidence.length > 0 || selectedRelTypes.length > 0 || selectedSubtypes.length > 0 || searchQuery.trim().length > 0) && (
                <button
                  onClick={reset}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-[#a882ff] hover:text-white bg-[rgba(168,130,255,0.1)] transition-all border border-[rgba(168,130,255,0.2)] hover:border-[rgba(168,130,255,0.4)]"
                >
                  ✕ {lang === 'en' ? 'Clear all filters' : 'Бүх шүүлтүүрийг арилгах'}
                </button>
              )}
            </div>

            <div className="pt-3 space-y-3 border-b border-[rgba(168,130,255,0.1)] pb-3">
              <h4 className="text-xs font-semibold text-[#888892] uppercase tracking-wider">Display</h4>

              <label className="flex items-center justify-between text-xs text-[#dcddde] gap-3">
                <span>Arrows</span>
                <input
                  type="checkbox"
                  checked={showArrows}
                  onChange={(e) => setShowArrows(e.target.checked)}
                  className="accent-[#a882ff]"
                />
              </label>

              <label className="block text-xs text-[#dcddde]">
                <span className="block mb-1">Text fade threshold: {textFadeThreshold.toFixed(0)}</span>
                <input type="range" min={0} max={1200} step={10} value={textFadeThreshold} onChange={(e) => setTextFadeThreshold(Number(e.target.value))} className="w-full" />
              </label>

              <label className="block text-xs text-[#dcddde]">
                <span className="block mb-1">Node size: {nodeSizeScale.toFixed(2)}</span>
                <input type="range" min={0.1} max={2} step={0.05} value={nodeSizeScale} onChange={(e) => setNodeSizeScale(Number(e.target.value))} className="w-full" />
              </label>

              <label className="block text-xs text-[#dcddde]">
                <span className="block mb-1">Link thickness: {edgeSizeScale.toFixed(1)}</span>
                <input type="range" min={0.2} max={3} step={0.1} value={edgeSizeScale} onChange={(e) => setEdgeSizeScale(Number(e.target.value))} className="w-full" />
              </label>
            </div>

            <div className="pt-3 space-y-3">
              <h4 className="text-xs font-semibold text-[#888892] uppercase tracking-wider">Forces</h4>

              <label className="block text-xs text-[#dcddde]">
                <span className="block mb-1">Center force: {centerForce.toFixed(2)}</span>
                <input type="range" min={0} max={1} step={0.05} value={centerForce} onChange={(e) => setCenterForce(Number(e.target.value))} className="w-full" />
              </label>

              <label className="block text-xs text-[#dcddde]">
                <span className="block mb-1">Repel force: {repelForce.toFixed(1)}</span>
                <input type="range" min={0.5} max={8} step={0.1} value={repelForce} onChange={(e) => setRepelForce(Number(e.target.value))} className="w-full" />
              </label>

              <label className="block text-xs text-[#dcddde]">
                <span className="block mb-1">Link force: {linkForce.toFixed(2)}</span>
                <input type="range" min={0} max={2} step={0.05} value={linkForce} onChange={(e) => setLinkForce(Number(e.target.value))} className="w-full" />
              </label>

              <button
                onClick={animateLayout}
                className="w-full px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[rgba(168,130,255,0.2)] hover:bg-[rgba(168,130,255,0.35)] border border-[rgba(168,130,255,0.3)] transition-all"
              >
                Animate
              </button>
            </div>
          </div>
        )}

        {showLegend && (
          <div className="absolute top-4 right-4 glass border border-[rgba(168,130,255,0.1)] rounded-xl p-4 z-30 shadow-2xl max-w-[220px]">
            <h4 className="text-xs font-semibold text-[#dcddde] mb-2">{t('relationships')}</h4>
            <div className="space-y-1.5">
              {ALL_REL_TYPES.map(rt => (
                <div key={rt} className="flex items-center gap-2">
                  <div className="w-5 h-0.5 rounded" style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[rt] }} />
                  <span className="text-xs text-[#888892]">{relLabel(rt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {graph ? (
          <SigmaGraph graph={graph} className="w-full h-full" />
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
            {selectedNode.profile?.work_history && selectedNode.profile.work_history.length > 0 && (
              <div className="px-5 py-3 border-b border-[rgba(168,130,255,0.08)]">
                <h3 className="text-xs font-semibold text-[#888892] uppercase tracking-wider mb-3">
                  {lang === 'en' ? 'Work History' : 'Ажлын туршлага'}
                </h3>
                <div className="space-y-2">
                  {selectedNode.profile.work_history.map((w, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#a882ff] mt-1.5 shrink-0" />
                      <p className="text-sm text-white">{w}</p>
                    </div>
                  ))}
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
                {graph && selectedNodeId && Array.from(graph.neighbors(selectedNodeId)).slice(0, 20).map(neighborId => {
                  const other = allNodes.find(n => n.id === neighborId)
                  const edges = graph.edges(selectedNodeId, neighborId)
                  const edgeData = edges.length > 0 ? graph.getEdgeAttributes(edges[0]) : null
                  const relKey = (edgeData?.label as string)?.replace(/ /g, '_') as RelationshipType
                  const rLabel = relLabel(relKey)
                  const rColor = RELATIONSHIP_TYPE_COLORS[relKey] || '#64748b'
                  return (
                    <div key={neighborId} className="connection-card bg-[rgba(168,130,255,0.03)] rounded-lg p-3 border border-[rgba(168,130,255,0.06)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {other?.image_url && (
                            <img src={other.image_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-[rgba(168,130,255,0.2)]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          )}
                          <span className="text-sm text-white font-medium truncate">{other?.name ?? neighborId}</span>
                        </div>
                      </div>
                      <p className="text-xs mt-1.5 font-medium" style={{ color: rColor }}>{rLabel}</p>
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
