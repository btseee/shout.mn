import { useEffect, useMemo, useState, useRef } from 'react'
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
import type { BuildingsDetail } from '@/types/node'
import { useI18n } from '@/store/i18n'
import Graph from 'graphology'

const ALL_REL_TYPES: RelationshipType[] = ['colleague', 'family', 'same_org', 'superior', 'subordinate', 'financial_link', 'political_ally', 'appointed_by', 'investigated']
const ALL_SUBTYPES: PersonSubtype[] = ['politician', 'civil_servant', 'business_person', 'judge', 'prosecutor', 'military', 'public_figure', 'other']

export default function App() {
  const [graph, setGraph] = useState<Graph | null>(null)
  const [allNodes, setNodes] = useState<Node[]>([])
  const [allEdges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAbout, setShowAbout] = useState(false)
  const builtRef = useRef(false)
  const sidePanelRef = useRef<HTMLElement>(null)
  const { selectedNodeId, clearSelection } = useSelectionStore()
  const {
    selectedConfidence,
    selectedRelTypes,
    selectedSubtypes,
    minConnections,
    searchQuery,
    toggleConfidence,
    toggleRelType,
    toggleSubtype,
    setConfidence,
    setRelTypes,
    setSubtypes,
    setMinConnections,
    setSearchQuery,
    reset,
  } = useFiltersStore()
  const {
    showFilters,
    showLegend,
    setShowFilters,
    setShowLegend,
  } = useGraphViewStore()
  const { t, lang, toggleLang } = useI18n()

  // Build graph ONCE on mount
  useEffect(() => {
    if (builtRef.current) return
    builtRef.current = true

    Promise.all([fetchNodes(), fetchEdges()])
      .then(([n, e]) => {
        setNodes(n)
        setEdges(e)
        const g = buildGraph(n, e)
        applyForceLayout(g)
        setGraph(g)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    sidePanelRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [selectedNodeId])

  const filterStats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const matchingNodeIds = new Set(allNodes.filter(node => {
      if (selectedSubtypes.length > 0 && (!node.subtype || !selectedSubtypes.includes(node.subtype))) return false
      if ((graph?.degree(node.id) ?? 0) < minConnections) return false
      if (!query) return true

      const searchable = [
        node.name,
        node.description,
        ...(node.aliases ?? []),
        node.profile?.organization,
        node.profile?.position,
        node.profile?.party,
        node.profile?.political_faction,
        ...(node.profile?.all_organizations ?? []),
        ...(node.profile?.all_positions ?? []),
      ].filter(Boolean).join(' ').toLowerCase()

      return searchable.includes(query)
    }).map(node => node.id))

    const matchingEdges = allEdges.filter(edge =>
      matchingNodeIds.has(edge.source_node) &&
      matchingNodeIds.has(edge.target_node) &&
      (selectedConfidence.length === 0 || selectedConfidence.includes(edge.confidence)) &&
      (selectedRelTypes.length === 0 || selectedRelTypes.includes(edge.relationship_type))
    )

    if (selectedConfidence.length > 0 || selectedRelTypes.length > 0) {
      const connectedIds = new Set<string>()
      matchingEdges.forEach(edge => {
        connectedIds.add(edge.source_node)
        connectedIds.add(edge.target_node)
      })
      return { nodes: connectedIds.size, edges: matchingEdges.length }
    }

    return { nodes: matchingNodeIds.size, edges: matchingEdges.length }
  }, [allEdges, allNodes, graph, minConnections, searchQuery, selectedConfidence, selectedRelTypes, selectedSubtypes])

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
    return labels[r] ?? r.replace(/_/g, ' ')
  }

  const activeFilterCount =
    selectedConfidence.length +
    selectedRelTypes.length +
    selectedSubtypes.length +
    (minConnections > 0 ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0)

  const applyPreset = (preset: 'key' | 'verified' | 'public' | 'influence') => {
    reset()
    if (preset === 'key') setMinConnections(5)
    if (preset === 'verified') {
      setConfidence(['documented'])
      setMinConnections(1)
    }
    if (preset === 'public') {
      setSubtypes(['politician', 'civil_servant', 'judge', 'prosecutor'])
      setMinConnections(1)
    }
    if (preset === 'influence') {
      setRelTypes(['political_ally', 'appointed_by', 'financial_link'])
      setMinConnections(1)
    }
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
          aria-expanded={showFilters}
        >
          {t('filters')}
          {activeFilterCount > 0 && (
            <span className="min-w-4 h-4 px-1 rounded-full bg-[#a882ff] text-[10px] leading-4 text-black font-bold text-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        <div className="w-px h-5 bg-[rgba(168,130,255,0.15)]" />
        <button
          onClick={() => setShowAbout(true)}
          className="text-xs text-[#888892] hover:text-white transition-colors"
        >
          {t('about')}
        </button>
        <button
          type="button"
          onClick={() => setShowLegend(!showLegend)}
          className={`text-xs transition-colors ${showLegend ? 'text-[#c4b5fd]' : 'text-[#888892] hover:text-white'}`}
          aria-pressed={showLegend}
        >
          {t('legend')}
        </button>
        <button
          type="button"
          onClick={toggleLang}
          className="text-xs text-[#888892] hover:text-white transition-colors"
          aria-label={lang === 'en' ? 'Switch to Mongolian' : 'Англи хэл рүү солих'}
        >
          {t('langToggle')}
        </button>
        <div className="flex-1" />
        <div className="stats-badge px-3 py-1 rounded-lg text-xs text-[#a882ff]">
          {graph ? graph.order : 0} {t('nodes')} · {graph ? graph.size : 0} {t('edges')}
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 relative">
        {showFilters && (
          <div className="filter-panel absolute top-4 left-4 w-[min(360px,calc(100%-2rem))] max-h-[calc(100%-2rem)] overflow-y-auto glass border border-[rgba(168,130,255,0.15)] rounded-2xl p-4 z-30 shadow-2xl filter-panel-enter">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">{t('filters')}</h3>
                <p className="text-[11px] text-[#777783] mt-0.5">
                  {lang === 'en' ? 'Focus the graph in a few clicks' : 'Графикийг хэдхэн товшилтоор нарийсгах'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                aria-label={lang === 'en' ? 'Close filters' : 'Шүүлтүүрийг хаах'}
                className="icon-button text-[#888892] hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="filter-result mb-4 flex items-center justify-between rounded-xl px-3 py-2.5 border border-[rgba(168,130,255,0.12)] bg-[rgba(168,130,255,0.05)]" aria-live="polite">
              <span className="text-xs text-[#a8a8b3]">{lang === 'en' ? 'Showing' : 'Харуулж байна'}</span>
              <span key={`${filterStats.nodes}-${filterStats.edges}`} className="result-count text-xs font-semibold text-[#c4b5fd]">
                {filterStats.nodes} {t('nodes')} · {filterStats.edges} {t('edges')}
              </span>
            </div>

            <section className="filter-section">
              <div className="filter-section-title">
                <span>{lang === 'en' ? 'Quick views' : 'Шуурхай сонголт'}</span>
                {activeFilterCount > 0 && (
                  <button type="button" onClick={reset} className="filter-clear">
                    {lang === 'en' ? 'Clear all' : 'Бүгдийг арилгах'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['key', '◎', lang === 'en' ? 'Key people' : 'Гол хүмүүс', lang === 'en' ? '5+ connections' : '5+ холбоостой'],
                  ['verified', '✓', lang === 'en' ? 'Verified' : 'Баталгаатай', lang === 'en' ? 'Documented links' : 'Нотлогдсон холбоо'],
                  ['public', '◇', lang === 'en' ? 'Public office' : 'Төрийн алба', lang === 'en' ? 'Officials & judges' : 'Албан хаагч, шүүгч'],
                  ['influence', '↗', lang === 'en' ? 'Influence' : 'Нөлөөлөл', lang === 'en' ? 'Power & money' : 'Эрх мэдэл, санхүү'],
                ] as const).map(([id, icon, label, detail]) => (
                  <button key={id} type="button" onClick={() => applyPreset(id)} className="preset-card">
                    <span className="preset-icon">{icon}</span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-white truncate">{label}</span>
                      <span className="block text-[10px] text-[#777783] truncate mt-0.5">{detail}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="filter-section">
              <div className="filter-section-title">
                <span>{lang === 'en' ? 'Connections per person' : 'Нэг хүний холбоос'}</span>
              </div>
              <div className="segmented-control" role="group" aria-label={lang === 'en' ? 'Minimum connections' : 'Хамгийн бага холбоос'}>
                {[0, 2, 5, 10].map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setMinConnections(count)}
                    className={minConnections === count ? 'active' : ''}
                    aria-pressed={minConnections === count}
                  >
                    {count === 0 ? (lang === 'en' ? 'Any' : 'Бүгд') : `${count}+`}
                  </button>
                ))}
              </div>
            </section>

            <section className="filter-section">
              <div className="filter-section-title">
                <span>{t('confidence')}</span>
                {selectedConfidence.length > 0 && <button type="button" onClick={() => setConfidence([])} className="filter-clear">{lang === 'en' ? 'Reset' : 'Арилгах'}</button>}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button type="button" onClick={() => setConfidence([])} className={`filter-chip ${selectedConfidence.length === 0 ? 'active' : ''}`}>{lang === 'en' ? 'Any' : 'Бүгд'}</button>
                  {(['documented', 'reported', 'alleged'] as ConfidenceTier[]).map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => toggleConfidence(c)}
                      className={`filter-chip ${selectedConfidence.includes(c) ? 'active' : ''}`}
                      aria-pressed={selectedConfidence.includes(c)}
                    >
                      {t(c)}
                    </button>
                  ))}
              </div>
            </section>

            <section className="filter-section">
              <div className="filter-section-title">
                <span>{t('relationshipTypes')}</span>
                {selectedRelTypes.length > 0 && <button type="button" onClick={() => setRelTypes([])} className="filter-clear">{lang === 'en' ? 'Reset' : 'Арилгах'}</button>}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button type="button" onClick={() => setRelTypes([])} className={`filter-chip ${selectedRelTypes.length === 0 ? 'active' : ''}`}>{lang === 'en' ? 'Any' : 'Бүгд'}</button>
                  {ALL_REL_TYPES.map(rt => (
                    <button
                      type="button"
                      key={rt}
                      onClick={() => toggleRelType(rt)}
                      className={`filter-chip flex items-center gap-1.5 ${selectedRelTypes.includes(rt) ? 'active' : ''}`}
                      aria-pressed={selectedRelTypes.includes(rt)}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[rt] }} />
                      {relLabel(rt)}
                    </button>
                  ))}
              </div>
            </section>

            <section className="filter-section">
              <div className="filter-section-title">
                <span>{t('jobTypes')}</span>
                {selectedSubtypes.length > 0 && <button type="button" onClick={() => setSubtypes([])} className="filter-clear">{lang === 'en' ? 'Reset' : 'Арилгах'}</button>}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button type="button" onClick={() => setSubtypes([])} className={`filter-chip ${selectedSubtypes.length === 0 ? 'active' : ''}`}>{lang === 'en' ? 'Any' : 'Бүгд'}</button>
                  {ALL_SUBTYPES.map(st => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => toggleSubtype(st)}
                      className={`filter-chip ${selectedSubtypes.includes(st) ? 'active' : ''}`}
                      aria-pressed={selectedSubtypes.includes(st)}
                    >
                      {subtypeLabel(st)}
                    </button>
                  ))}
              </div>
            </section>
          </div>
        )}

        {showLegend && (
          <div className="absolute top-4 right-4 glass border border-[rgba(168,130,255,0.1)] rounded-xl p-4 z-30 shadow-2xl max-w-[220px] soft-pop">
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
        <aside
          ref={sidePanelRef}
          aria-label={lang === 'en' ? 'Selected person details' : 'Сонгосон хүний мэдээлэл'}
          className="fixed top-0 right-0 h-full w-[min(400px,100vw)] glass border-l border-[rgba(168,130,255,0.1)] z-30 overflow-y-auto shadow-2xl panel-enter"
        >
          <div key={selectedNodeId} className="p-0 profile-content-enter">
            {/* Profile header */}
            <div className="relative p-5 pb-6" style={{ background: 'linear-gradient(180deg, rgba(168,130,255,0.15) 0%, transparent 100%)' }}>
              <button
                type="button"
                onClick={clearSelection}
                aria-label={lang === 'en' ? 'Close details' : 'Мэдээллийг хаах'}
                className="absolute top-3 right-3 text-[#888892] hover:text-white text-lg z-10 transition-colors"
              >
                &times;
              </button>
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
                  {([
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
                  ] as Array<[keyof BuildingsDetail, string]>).filter(([key]) => (selectedNode.profile!.buildings_detail?.[key] || 0) > 0).map(([key, label]) => (
                    <div key={key} className="bg-[rgba(168,130,255,0.05)] rounded-lg p-1.5 border border-[rgba(168,130,255,0.08)]">
                      <p className="text-[#888892] truncate">{label}</p>
                      <p className="text-white font-medium">{selectedNode.profile!.buildings_detail?.[key]}</p>
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
                    <button
                      type="button"
                      key={neighborId}
                      onClick={() => useSelectionStore.getState().selectNode(neighborId)}
                      className="connection-card w-full text-left bg-[rgba(168,130,255,0.03)] rounded-lg p-3 border border-[rgba(168,130,255,0.06)] cursor-pointer focus-visible:border-[rgba(168,130,255,0.4)]"
                      aria-label={`${other?.name ?? neighborId}: ${rLabel}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {other?.image_url && (
                            <img src={other.image_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-[rgba(168,130,255,0.2)]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          )}
                          <span className="text-sm text-white font-medium truncate">{other?.name ?? neighborId}</span>
                        </div>
                      </div>
                      <p className="text-xs mt-1.5 font-medium" style={{ color: rColor }}>{rLabel}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* About modal */}
      {showAbout && (
        <div className="modal-backdrop fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowAbout(false)}>
          <div className="modal-content glass border border-[rgba(168,130,255,0.15)] rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
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
