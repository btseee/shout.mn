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
import { CONFIDENCE_LABELS } from '@/types/edge'
import type { ConfidenceTier } from '@/types/edge'

export default function App() {
  const [allNodes, setNodes] = useState<Node[]>([])
  const [allEdges, setEdges] = useState<Edge[]>([])
  const [sources, setSources] = useState<SourceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const [showLegend, setShowLegend] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const { selectedNodeId, clearSelection } = useSelectionStore()
  const { selectedNodeTypes, selectedConfidence, searchQuery, toggleNodeType, toggleConfidence } = useFiltersStore()

  useEffect(() => {
    Promise.all([fetchNodes(), fetchEdges(), fetchSources()])
      .then(([n, e, s]) => { setNodes(n); setEdges(e); setSources(s) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filteredNodes = useMemo(() => {
    let result = allNodes
    if (selectedNodeTypes.length > 0) {
      result = result.filter(n => selectedNodeTypes.includes(n.type))
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.aliases?.some(a => a.toLowerCase().includes(q))
      )
    }
    return result
  }, [allNodes, selectedNodeTypes, searchQuery])

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes])

  const filteredEdges = useMemo(() => {
    return allEdges.filter(e =>
      filteredNodeIds.has(e.from) && filteredNodeIds.has(e.to) &&
      (selectedConfidence.length === 0 || selectedConfidence.includes(e.confidence))
    )
  }, [allEdges, filteredNodeIds, selectedConfidence])

  const graph = useMemo(() => {
    if (!filteredNodes.length || !filteredEdges.length) return null
    const g = buildGraph(filteredNodes, filteredEdges)
    applyForceLayout(g)
    return g
  }, [filteredNodes, filteredEdges])

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

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-500 bg-slate-950">Ачаалж байна...</div>
  if (error) return <div className="flex items-center justify-center h-screen text-red-500 bg-slate-950">Алдаа: {error}</div>

  const selectedNode = selectedNodeId ? allNodes.find(n => n.id === selectedNodeId) : null

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm z-20">
        <span className="text-sm font-bold text-white tracking-tight">shout.mn</span>
        <div className="w-px h-5 bg-slate-700" />
        <input
          type="text"
          placeholder="Хайх..."
          value={searchQuery}
          onChange={e => useFiltersStore.getState().setSearchQuery(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-sm text-white placeholder-slate-400 w-48 focus:outline-none focus:border-blue-500"
        />
        <div className="w-px h-5 bg-slate-700" />
        {(['documented', 'reported', 'alleged'] as ConfidenceTier[]).map(c => (
          <button
            key={c}
            onClick={() => toggleConfidence(c)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              selectedConfidence.includes(c)
                ? 'bg-slate-700 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {CONFIDENCE_LABELS[c]}
          </button>
        ))}
        <div className="w-px h-5 bg-slate-700" />
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Тэмдэглэгээ
        </button>
        <button
          onClick={() => setShowAbout(true)}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Тухай
        </button>
        <div className="flex-1" />
        <p className="text-xs text-slate-500">
          {filteredNodes.length}/{allNodes.length} зангилаа · {filteredEdges.length} холбоос
        </p>
      </div>

      {/* Legend overlay */}
      {showLegend && (
        <div className="absolute top-12 right-4 bg-slate-900 border border-slate-700 rounded-lg p-3 z-30 shadow-xl">
          <h4 className="text-xs font-semibold text-slate-300 mb-2">Итгэлцлийн түвшин</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-[#475569]" style={{ borderTop: '2px solid #475569' }} />
              <span className="text-xs text-slate-400">Баталгаажсан (documented)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5" style={{ borderTop: '2px dashed #64748b' }} />
              <span className="text-xs text-slate-400">Мэдээлсэн (reported)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5" style={{ borderTop: '2px dotted #94a3b8' }} />
              <span className="text-xs text-slate-400">Үндэслэлгүй (alleged)</span>
            </div>
          </div>
        </div>
      )}

      {/* Graph */}
      <div className="flex-1 relative">
        {graph ? (
          <>
            <SigmaGraph graph={graph} className="w-full h-full" />
            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
              <button onClick={handleZoomIn} className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center text-sm text-slate-300">+</button>
              <button onClick={handleZoomOut} className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center text-sm text-slate-300">-</button>
              <button onClick={handleReset} className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center text-xs text-slate-300">⟲</button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            Граф байхгүй
          </div>
        )}
      </div>

      {/* Side panel */}
      {selectedNode && (
        <div className="fixed top-0 right-0 h-full w-96 bg-slate-900 border-l border-slate-700 z-30 overflow-y-auto shadow-2xl">
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedNode.name}</h2>
                <p className="text-xs text-slate-400 mt-1">{selectedNode.role_title}</p>
              </div>
              <button onClick={clearSelection} className="text-slate-400 hover:text-white text-lg">&times;</button>
            </div>
            <div className="flex gap-2 mb-3">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">{selectedNode.type}</span>
              {selectedNode.subtype && (
                <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">{selectedNode.subtype}</span>
              )}
            </div>
            {selectedNode.description && (
              <p className="text-sm text-slate-300 mb-4">{selectedNode.description}</p>
            )}
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Холбоосууд</h3>
            <div className="space-y-2">
              {allEdges
                .filter(e => e.from === selectedNode.id || e.to === selectedNode.id)
                .map(edge => {
                  const otherId = edge.from === selectedNode.id ? edge.to : edge.from
                  const other = allNodes.find(n => n.id === otherId)
                  return (
                    <div key={edge.id} className="bg-slate-800 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white font-medium">{other?.name ?? otherId}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          edge.confidence === 'documented' ? 'bg-green-500/20 text-green-300' :
                          edge.confidence === 'reported' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>{edge.confidence}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{edge.relationship_type.replace(/_/g, ' ')}</p>
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
            </div>
          </div>
        </div>
      )}

      {/* About modal */}
      {showAbout && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAbout(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Тухай</h2>
              <button onClick={() => setShowAbout(false)} className="text-slate-400 hover:text-white text-lg">&times;</button>
            </div>
            <div className="space-y-4 text-sm text-slate-300">
              <p>
                <strong className="text-white">shout.mn</strong> нь Монгол Улсын улс төрийн холбоо хамааралыг судлах зорилготой судалгааны хэрэгсэл юм.
              </p>
              <div>
                <h3 className="font-semibold text-white mb-1">Эх сурвалжууд</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Авлигатай тэмцэх газар (IAAC) — мэдэгдэл, ашиг сонирхлын мэдүүлэг</li>
                  <li>Татварын ерөнхий газар (GASR) — компанийн бүртгэл</li>
                  <li>Шүүхийн шийдвэрийн нэгдсэн сан (shuukh.mn)</li>
                  <li>Тендерийн газар (tender.gov.mn) — төрийн худалдан авалт</li>
                  <li>OCCRP Aleph, OpenSanctions, OpenCorporates</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Итгэлцлийн түвшин</h3>
                <ul className="space-y-1 text-slate-400">
                  <li><span className="text-green-400">Баталгаажсан</span> — бүртгэл, шүүхийн шийдвэр, албан ёсны эх сурвалжаар нотлогдсон</li>
                  <li><span className="text-yellow-400">Мэдээлсэн</span> — нэг буюу түүнээс олон найдвартай эх сурвалжид нийтлэгдсэн</li>
                  <li><span className="text-red-400">Үндэслэлгүй</span> — нэгэн эх сурвалжид үндэслэсэн, баталгаажүүлээгүй</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Хуулийн зөвлөгөөн</h3>
                <p className="text-slate-400">
                  Хувийн мэдээлэл хамгаалах хууль (2022), Эрүүгийн хуулийн 13.14 зүйл (хүндэтгэлийг гутаах) зэрэг хуулиудыг дагаж мөрдөнө.
                  Зөвхөн нийтийн албан тушаалтан, нийтийн хөрөнгийн хяналтыг чиглэсэн.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
