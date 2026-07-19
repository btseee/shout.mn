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
  onZoomChange?: (zoom: number) => void
}

interface TooltipData {
  x: number
  y: number
  type: 'node' | 'edge'
  label: string
  sublabel?: string
  confidence?: string
  relType?: string
  description?: string
}

export function SigmaGraph({ graph, className = '', onZoomChange }: SigmaGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const { selectedNodeId, selectedEdgeId, selectNode, selectEdge, clearSelection } = useSelectionStore()
  const filters = useFiltersStore()
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
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
      labelColor: { attribute: 'labelColor', color: '#dcddde' },
      labelRenderedSizeThreshold: 16,
      labelGridSize: 400,
      renderLabels: true,
      renderEdgeArrows: true,
      enableCameraWheel: true,
      enableCameraPan: true,
      enableCameraRotate: false,
      minCameraRatio: 0.05,
      maxCameraRatio: 10,
      edgeReducer: (edge, data) => {
        const sel = useSelectionStore.getState()
        const filt = useFiltersStore.getState()
        const source = graph.source(edge)
        const target = graph.target(edge)

        // Filter by confidence
        if (filt.selectedConfidence.length > 0 && !filt.selectedConfidence.includes(data.confidence as ConfidenceTier)) {
          return { ...data, hidden: true, size: 0 }
        }

        // Filter by relationship type
        if (filt.selectedRelTypes.length > 0) {
          const relLabel = (data.label as string).replace(/ /g, '_')
          if (!filt.selectedRelTypes.includes(relLabel as RelationshipType)) {
            return { ...data, hidden: true, size: 0 }
          }
        }

        // Selection state: highlight connected edges
        if (sel.selectedNodeId) {
          if (source !== sel.selectedNodeId && target !== sel.selectedNodeId) {
            return { ...data, color: 'rgba(168, 130, 255, 0.05)', size: 0.3, opacity: 0.1 }
          }
          if (edge === sel.selectedEdgeId) {
            return { ...data, color: '#a882ff', size: 3, opacity: 1 }
          }
          return { ...data, size: 1.5, opacity: 0.8 }
        }

        // Hover state: brighten connected edges
        if (hoveredNode) {
          if (source === hoveredNode || target === hoveredNode) {
            return { ...data, size: 1.5, opacity: 0.9 }
          }
          return { ...data, size: 0.5, opacity: 0.2 }
        }

        // Default: Obsidian-style semi-transparent edges
        const baseOpacity = data.confidence === 'documented' ? 0.25 : data.confidence === 'reported' ? 0.15 : 0.08
        return { ...data, size: 0.8, opacity: baseOpacity }
      },
      nodeReducer: (node, data) => {
        const sel = useSelectionStore.getState()
        const filt = useFiltersStore.getState()

        // Filter by node type
        if (filt.selectedNodeTypes.length > 0 && !filt.selectedNodeTypes.includes(data.nodeType as NodeType)) {
          return { ...data, hidden: true }
        }

        // Selection state
        if (sel.selectedNodeId) {
          const isSelected = node === sel.selectedNodeId
          const neighbors = graph.neighbors(sel.selectedNodeId)
          const isNeighbor = neighbors.includes(node)
          const isConnectedByEdge = graph.edges(sel.selectedNodeId).some(e => {
            return graph.source(e) === node || graph.target(e) === node
          })

          if (!isSelected && !isNeighbor && !isConnectedByEdge) {
            return { ...data, color: '#1a1528', size: Math.max(data.size * 0.3, 1.5), zIndex: 0, opacity: 0.15 }
          }
          if (isSelected) {
            return {
              ...data,
              highlighted: true,
              zIndex: 3,
              size: data.size * 1.4,
              borderColor: '#a882ff',
              borderWidth: 3,
            }
          }
          // Neighbor: slight glow
          return {
            ...data,
            zIndex: 1,
            opacity: 0.95,
            size: data.size * 1.1,
          }
        }

        // Hover state: glow the hovered node
        if (hoveredNode === node) {
          return {
            ...data,
            size: data.size * 1.2,
            borderColor: '#a882ff',
            borderWidth: 2,
          }
        }

        // Default: Obsidian purple-blue aesthetic
        return { ...data, opacity: 0.9 }
      },
    })

    // Click handlers
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

    // Hover handlers - show tooltip
    sigma.on('enterNode', ({ node }) => {
      setHoveredNode(node)
      const attrs = graph.getNodeAttributes(node)
      const screenPos = sigma.graphToViewport({ x: attrs.x ?? 0, y: attrs.y ?? 0 })

      // Get connection count
      const connCount = graph.degree(node)

      setTooltip({
        x: screenPos.x,
        y: screenPos.y - 25,
        type: 'node',
        label: attrs.label as string,
        sublabel: (attrs as any).description || (attrs as any).nodeType,
        description: `${connCount} connections`,
      })
    })

    sigma.on('leaveNode', () => {
      setHoveredNode(null)
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

    // Camera zoom change callback
    sigma.getCamera().on('updated', () => {
      const ratio = sigma.getCamera().ratio
      onZoomChange?.(ratio)
    })

    // Initial zoom to fit
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
        const ratio = Math.min(cw / gw, ch / gh) * 0.85
        camera.setState({ ratio: 1 / ratio })
      } catch {}
    }, 300)

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
  }, [selectedNodeId, selectedEdgeId, filters, hoveredNode, refresh])

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
          className="tooltip-enter absolute pointer-events-none z-40 glass border border-slate-600/50 rounded-xl px-4 py-3 text-xs shadow-2xl max-w-xs"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <div className="font-semibold text-white text-sm">{tooltip.label}</div>
          {tooltip.sublabel && <div className="text-slate-300 mt-1">{tooltip.sublabel}</div>}
          {tooltip.description && <div className="text-slate-400 mt-0.5">{tooltip.description}</div>}
          {tooltip.relType && <div className="text-slate-400 mt-0.5">{tooltip.relType}</div>}
          {tooltip.confidence && (
            <div className={`mt-1.5 font-medium ${
              tooltip.confidence === 'documented' ? 'text-emerald-400' :
              tooltip.confidence === 'reported' ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {CONFIDENCE_LABELS[tooltip.confidence as ConfidenceTier]}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
