import { useEffect, useRef, useCallback, useState } from 'react'
import Sigma from 'sigma'
import type Graph from 'graphology'
import { useSelectionStore } from '@/store/selection'
import { useFiltersStore } from '@/store/filters'
import type { NodeType } from '@/types/node'
import type { ConfidenceTier, RelationshipType } from '@/types/edge'
import { RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_TYPE_LABELS_EN, CONFIDENCE_LABELS } from '@/types/edge'
import { useI18n } from '@/store/i18n'

interface SigmaGraphProps {
  graph: Graph
  className?: string
}

interface TooltipData {
  x: number
  y: number
  type: 'node' | 'edge'
  label: string
  sublabel?: string
  confidence?: string
  relType?: string
}

export function SigmaGraph({ graph, className = '' }: SigmaGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const { selectedNodeId, selectedEdgeId, selectNode, selectEdge, clearSelection } = useSelectionStore()
  const filters = useFiltersStore()
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const { lang } = useI18n()

  useEffect(() => {
    if (!containerRef.current) return
    if (graph.order === 0) return
    if (containerRef.current.clientWidth === 0 || containerRef.current.clientHeight === 0) return

    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultNodeType: 'circle',
      labelFont: 'Inter, system-ui, sans-serif',
      labelSize: 11,
      labelWeight: '500',
      labelColor: { attribute: 'labelColor', color: '#94a3b8' },
      labelRenderedSizeThreshold: 14,
      labelGridSize: 300,
      renderLabels: true,
      renderEdgeArrows: true,
      enableCameraWheel: true,
      enableCameraPan: true,
      enableCameraRotate: false,
      edgeReducer: (edge, data) => {
        const sel = useSelectionStore.getState()
        const filt = useFiltersStore.getState()
        const source = graph.source(edge)
        const target = graph.target(edge)

        if (filt.selectedConfidence.length > 0 && !filt.selectedConfidence.includes(data.confidence as ConfidenceTier)) {
          return { ...data, hidden: true, size: 0 }
        }

        if (filt.selectedRelTypes.length > 0) {
          const relLabel = (data.label as string).replace(/ /g, '_')
          if (!filt.selectedRelTypes.includes(relLabel as RelationshipType)) {
            return { ...data, hidden: true, size: 0 }
          }
        }

        if (sel.selectedNodeId) {
          if (source !== sel.selectedNodeId && target !== sel.selectedNodeId) {
            return { ...data, color: '#1e293b', size: 0.3, opacity: 0.15 }
          }
          if (edge === sel.selectedEdgeId) {
            return { ...data, color: '#f59e0b', size: 3, opacity: 1 }
          }
          return { ...data, size: 1.5, opacity: 0.8 }
        }

        const baseSize = data.confidence === 'documented' ? 1.2 : data.confidence === 'reported' ? 0.8 : 0.5
        return { ...data, size: baseSize, opacity: data.confidence === 'documented' ? 0.7 : 0.4 }
      },
      nodeReducer: (node, data) => {
        const sel = useSelectionStore.getState()
        const filt = useFiltersStore.getState()

        if (filt.selectedNodeTypes.length > 0 && !filt.selectedNodeTypes.includes(data.nodeType as NodeType)) {
          return { ...data, hidden: true }
        }

        if (sel.selectedNodeId) {
          const isSelected = node === sel.selectedNodeId
          const neighbors = graph.neighbors(sel.selectedNodeId)
          const isNeighbor = neighbors.includes(node)
          const isConnectedByEdge = graph.edges(sel.selectedNodeId).some(e => {
            return graph.source(e) === node || graph.target(e) === node
          })

          if (!isSelected && !isNeighbor && !isConnectedByEdge) {
            return { ...data, color: '#1e293b', size: Math.max(data.size * 0.4, 2), zIndex: 0, opacity: 0.2 }
          }
          if (isSelected) {
            return { ...data, highlighted: true, zIndex: 3, size: data.size * 1.3 }
          }
          return { ...data, zIndex: 1, opacity: 0.9 }
        }

        return { ...data, opacity: 0.85 }
      },
    })

    sigma.on('clickNode', ({ node }) => {
      selectNode(node)
      setTooltip(null)
    })

    sigma.on('clickEdge', ({ edge }) => {
      selectEdge(edge)
      setTooltip(null)
    })

    sigma.on('clickStage', () => {
      clearSelection()
      setTooltip(null)
    })

    sigma.on('enterNode', ({ node }) => {
      const attrs = graph.getNodeAttributes(node)
      const screenPos = sigma.graphToViewport({ x: attrs.x ?? 0, y: attrs.y ?? 0 })
      setTooltip({
        x: screenPos.x,
        y: screenPos.y - 20,
        type: 'node',
        label: attrs.label as string,
        sublabel: (attrs as any).nodeType,
      })
    })

    sigma.on('leaveNode', () => {
      setTooltip(null)
    })

    sigma.on('enterEdge', ({ edge }) => {
      const sourceAttrs = graph.getNodeAttributes(graph.source(edge))
      const targetAttrs = graph.getNodeAttributes(graph.target(edge))
      const edgeAttrs = graph.getEdgeAttributes(edge)
      const midX = ((sourceAttrs.x ?? 0) + (targetAttrs.x ?? 0)) / 2
      const midY = ((sourceAttrs.y ?? 0) + (targetAttrs.y ?? 0)) / 2
      const screenPos = sigma.graphToViewport({ x: midX, y: midY })
      const relKey = edgeAttrs.label?.toString().replace(/ /g, '_') as any
      const labels = lang === 'en' ? RELATIONSHIP_TYPE_LABELS_EN : RELATIONSHIP_TYPE_LABELS

      setTooltip({
        x: screenPos.x,
        y: screenPos.y - 20,
        type: 'edge',
        label: labels[relKey] ?? edgeAttrs.label as string,
        confidence: edgeAttrs.confidence as string,
      })
    })

    sigma.on('leaveEdge', () => {
      setTooltip(null)
    })

    setTimeout(() => {
      try {
        const camera = sigma.getCamera()
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
        for (const nodeId of graph.nodes()) {
          const x = graph.getNodeAttribute(nodeId, 'x') ?? 0
          const y = graph.getNodeAttribute(nodeId, 'y') ?? 0
          minX = Math.min(minX, x); maxX = Math.max(maxX, x)
          minY = Math.min(minY, y); maxY = Math.max(maxY, y)
        }
        const cw = containerRef.current?.clientWidth || 800
        const ch = containerRef.current?.clientHeight || 600
        const gw = maxX - minX || 1
        const gh = maxY - minY || 1
        const ratio = Math.min(cw / gw, ch / gh) * 0.8
        camera.setState({ ratio: 1 / ratio })
      } catch {}
    }, 200)

    sigmaRef.current = sigma

    return () => {
      sigma.kill()
      sigmaRef.current = null
    }
  }, [graph, lang])

  const refresh = useCallback(() => {
    sigmaRef.current?.refresh({ skipIndexation: true })
  }, [])

  useEffect(() => {
    refresh()
  }, [selectedNodeId, selectedEdgeId, filters, refresh])

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="sigma-container w-full h-full"
        role="img"
        aria-label="Power mapping graph"
      />
      {tooltip && (
        <div
          className="absolute pointer-events-none z-40 bg-slate-800/95 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl max-w-xs"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <div className="font-medium text-white">{tooltip.label}</div>
          {tooltip.sublabel && <div className="text-slate-400 mt-0.5">{tooltip.sublabel}</div>}
          {tooltip.relType && <div className="text-slate-400 mt-0.5">{tooltip.relType}</div>}
          {tooltip.confidence && (
            <div className={`mt-1 ${
              tooltip.confidence === 'documented' ? 'text-green-400' :
              tooltip.confidence === 'reported' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {CONFIDENCE_LABELS[tooltip.confidence as ConfidenceTier]}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
