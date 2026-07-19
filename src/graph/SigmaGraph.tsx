import { useEffect, useMemo, useRef, useState } from 'react'
import Sigma from 'sigma'
import type Graph from 'graphology'
import { useSelectionStore } from '@/store/selection'
import { useFiltersStore } from '@/store/filters'
import { useGraphViewStore } from '@/store/graphView'
import type { NodeType, PersonSubtype } from '@/types/node'
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
  description?: string
}

function scaleColorAlpha(color: string, factor: number): string {
  const f = Math.max(0, Math.min(1, factor))

  const rgbaMatch = color.match(/^rgba?\(([^)]+)\)$/i)
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(',').map(v => v.trim())
    if (parts.length >= 3) {
      const r = Number(parts[0])
      const g = Number(parts[1])
      const b = Number(parts[2])
      const a = parts.length >= 4 ? Number(parts[3]) : 1
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) && Number.isFinite(a)) {
        return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a * f))})`
      }
    }
  }

  const hex = color.replace('#', '')
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const r = Number.parseInt(hex.slice(0, 2), 16)
    const g = Number.parseInt(hex.slice(2, 4), 16)
    const b = Number.parseInt(hex.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${f})`
  }

  return color
}

export function SigmaGraph({ graph, className = '' }: SigmaGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const zoomFittedRef = useRef(false)
  const hoveredNodeRef = useRef<string | null>(null)
  const { selectNode, selectEdge, clearSelection } = useSelectionStore()
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const { lang } = useI18n()

  const parallelEdgeMeta = useMemo(() => {
    const grouped = new Map<string, string[]>()

    graph.forEachEdge((edgeId, _attrs, source, target) => {
      const sourceId = String(source)
      const targetId = String(target)
      const pairKey = sourceId < targetId ? `${sourceId}|${targetId}` : `${targetId}|${sourceId}`
      const ids = grouped.get(pairKey)
      if (ids) ids.push(String(edgeId))
      else grouped.set(pairKey, [String(edgeId)])
    })

    const meta = new Map<string, { rank: number; count: number }>()
    for (const ids of grouped.values()) {
      ids.sort()
      const count = ids.length
      ids.forEach((id, rank) => meta.set(id, { rank, count }))
    }

    return meta
  }, [graph])

  useEffect(() => {
    if (!containerRef.current) return
    if (graph.order === 0) return
    if (containerRef.current.clientWidth === 0 || containerRef.current.clientHeight === 0) return

    zoomFittedRef.current = false
    hoveredNodeRef.current = null
    const initialView = useGraphViewStore.getState()

    const matchesNodeFilters = (node: string, data: Record<string, unknown>) => {
      const filt = useFiltersStore.getState()

      if (filt.selectedNodeTypes.length > 0 && !filt.selectedNodeTypes.includes(data.nodeType as NodeType)) {
        return false
      }

      const subtype = data.subtype as PersonSubtype | undefined
      if (filt.selectedSubtypes.length > 0 && (!subtype || !filt.selectedSubtypes.includes(subtype))) {
        return false
      }

      const query = filt.searchQuery.trim().toLowerCase()
      if (!query) return true

      const searchable = (
        (data.searchText as string | undefined)
        ?? `${String(data.label ?? '')} ${String(data.description ?? '')}`.toLowerCase()
      )

      return searchable.includes(query)
    }

    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      renderLabels: true,
      labelRenderedSizeThreshold: initialView.textFadeThreshold,
      defaultNodeType: 'circle',
      defaultEdgeType: initialView.showArrows ? 'arrow' : 'line',
      enableCameraZooming: true,
      enableCameraPanning: true,
      enableCameraRotation: false,
      minCameraRatio: 0.01,
      maxCameraRatio: 50,
      hideEdgesOnMove: true,
      hideLabelsOnMove: true,
      stagePadding: 30,
      edgeReducer: (edge, data) => {
        const sel = useSelectionStore.getState()
        const filt = useFiltersStore.getState()
        const view = useGraphViewStore.getState()
        const source = graph.source(edge)
        const target = graph.target(edge)
        const sourceAttrs = graph.getNodeAttributes(source)
        const targetAttrs = graph.getNodeAttributes(target)
        const hoveredNode = hoveredNodeRef.current
        const edgeScale = Math.max(0.1, view.edgeSizeScale)
        const edgeType = view.showArrows ? 'arrow' : 'line'
        const sx = Number(sourceAttrs.x ?? 0)
        const sy = Number(sourceAttrs.y ?? 0)
        const tx = Number(targetAttrs.x ?? 0)
        const ty = Number(targetAttrs.y ?? 0)
        const edgeLength = Math.hypot(sx - tx, sy - ty)
        const sourceDegree = graph.degree(source)
        const targetDegree = graph.degree(target)
        const lengthAttenuation = Math.max(0.05, Math.min(1, 84 / (edgeLength + 24)))
        const longEdgePenalty = edgeLength > 180 ? Math.max(0.08, 180 / edgeLength) : 1
        const baseColor = String(data.color ?? 'rgba(116, 122, 143, 0.12)')
        let visibilityAttenuation = Math.max(0.05, Math.min(1, lengthAttenuation * longEdgePenalty))

        if (!matchesNodeFilters(source, sourceAttrs as Record<string, unknown>) || !matchesNodeFilters(target, targetAttrs as Record<string, unknown>)) {
          return { ...data, hidden: true, size: 0, type: edgeType }
        }

        if (filt.selectedConfidence.length > 0 && !filt.selectedConfidence.includes(data.confidence as ConfidenceTier)) {
          return { ...data, hidden: true, size: 0, type: edgeType }
        }
        if (filt.selectedRelTypes.length > 0) {
          const relLabel = (data.label as string).replace(/ /g, '_')
          if (!filt.selectedRelTypes.includes(relLabel as RelationshipType)) {
            return { ...data, hidden: true, size: 0, type: edgeType }
          }
        }

        const hasScopedEdgeFilters = filt.selectedRelTypes.length > 0 || filt.selectedConfidence.length > 0
        const hasScopedNodeFilters =
          filt.selectedNodeTypes.length > 0 ||
          filt.selectedSubtypes.length > 0 ||
          filt.searchQuery.trim().length > 0
        const parallel = parallelEdgeMeta.get(String(edge))
        const hideParallelEdge =
          parallel !== undefined &&
          parallel.count > 1 &&
          parallel.rank > 0 &&
          !hasScopedEdgeFilters &&
          !hasScopedNodeFilters &&
          !sel.selectedNodeId &&
          !hoveredNode

        if (hideParallelEdge) {
          return { ...data, hidden: true, size: 0, type: edgeType }
        }

        const isGlobalView = !sel.selectedNodeId && !hoveredNode
        if (isGlobalView && !hasScopedEdgeFilters && !hasScopedNodeFilters) {
          const cameraRatio = sigmaRef.current?.getCamera().ratio ?? 1
          const minDegree = Math.min(sourceDegree, targetDegree)
          const maxDegree = Math.max(sourceDegree, targetDegree)

          // Obsidian-like LOD: trim twig links at wide zoom, reveal them as user zooms in.
          if ((cameraRatio > 1.05 && minDegree <= 1 && maxDegree <= 3) ||
              (cameraRatio > 1.2 && minDegree <= 1 && edgeLength > 34)) {
            return { ...data, hidden: true, size: 0, type: edgeType }
          }

          const zoomNorm = Math.max(0.45, Math.min(2.6, cameraRatio))
          const zoomAttenuation = 1 / Math.pow(zoomNorm, 0.6)
          const globalLongEdgeFade = Math.max(0.05, Math.min(1, Math.pow(185 / (edgeLength + 24), 1.15)))
          const avgDegree = (sourceDegree + targetDegree) * 0.5
          const hubFade = Math.max(0.2, Math.min(1, 1 / Math.pow(Math.max(1, avgDegree), 0.4)))
          const confidenceFade =
            data.confidence === 'documented'
              ? 1
              : data.confidence === 'reported'
                ? 0.78
                : 0.5
          const branchFade =
            sourceDegree <= 1 && targetDegree <= 1
              ? 0.28
              : sourceDegree <= 2 && targetDegree <= 2
                ? 0.42
                : sourceDegree <= 3 && targetDegree <= 3
                  ? 0.72
                  : 1
          visibilityAttenuation *= globalLongEdgeFade * zoomAttenuation * hubFade * branchFade * confidenceFade

          if (visibilityAttenuation < 0.015) {
            return { ...data, hidden: true, size: 0, type: edgeType }
          }
        }

        const attenuatedColor = scaleColorAlpha(baseColor, 0.02 + visibilityAttenuation * 0.15)

        if (sel.selectedNodeId) {
          if (source !== sel.selectedNodeId && target !== sel.selectedNodeId) {
            return { ...data, hidden: true, type: edgeType }
          }
          if (edge === sel.selectedEdgeId) {
            return { ...data, color: '#c4b5fd', size: 0.8 * edgeScale, type: edgeType }
          }
          return { ...data, color: attenuatedColor, size: Math.max(0.06, 0.18 * edgeScale * visibilityAttenuation), type: edgeType }
        }

        if (hoveredNode) {
          if (source === hoveredNode || target === hoveredNode) {
            return { ...data, color: attenuatedColor, size: Math.max(0.06, 0.2 * edgeScale * visibilityAttenuation), type: edgeType }
          }
          return { ...data, hidden: true, type: edgeType }
        }

        return { ...data, color: attenuatedColor, size: Math.max(0.006, 0.055 * edgeScale * visibilityAttenuation), type: edgeType }
      },
      nodeReducer: (node, data) => {
        const sel = useSelectionStore.getState()
        const filt = useFiltersStore.getState()
        const view = useGraphViewStore.getState()
        const hoveredNode = hoveredNodeRef.current
        const nodeScale = Math.max(0.2, view.nodeSizeScale)
        const baseSize = (Number(data.size) || 1) * nodeScale
        const degree = Number((data as Record<string, unknown>).degree ?? 0)

        if (!matchesNodeFilters(node, data as Record<string, unknown>)) {
          return { ...data, hidden: true }
        }

        if (sel.selectedNodeId) {
          const isSelected = node === sel.selectedNodeId
          const neighbors = graph.neighbors(sel.selectedNodeId)
          const isNeighbor = neighbors.includes(node)

          if (!isSelected && !isNeighbor) {
            return { ...data, hidden: true }
          }
          if (isSelected) {
            return {
              ...data,
              highlighted: true,
              zIndex: 3,
              size: baseSize * 2,
              borderColor: '#c4b5fd',
              borderWidth: 2,
            }
          }
          return { ...data, zIndex: 1, size: baseSize * 1.2 }
        }

        if (hoveredNode === node) {
          return {
            ...data,
            size: baseSize * 1.5,
            borderColor: '#c4b5fd',
            borderWidth: 1.5,
          }
        }

        if (hoveredNode && node !== hoveredNode) {
          return { ...data, hidden: true }
        }

        if (!hoveredNode && !sel.selectedNodeId) {
          const hasScopedNodeFilters =
            filt.selectedNodeTypes.length > 0 ||
            filt.selectedSubtypes.length > 0 ||
            filt.searchQuery.trim().length > 0
          const cameraRatio = sigmaRef.current?.getCamera().ratio ?? 1

          if (!hasScopedNodeFilters) {
            if ((cameraRatio > 1.05 && degree <= 1) || (cameraRatio > 1.35 && degree <= 2)) {
              return { ...data, hidden: true }
            }
          }

          const degreeFade = degree <= 1 ? 0.5 : degree <= 2 ? 0.68 : degree <= 3 ? 0.82 : 1
          const degreeSize = degree <= 1 ? 0.78 : degree <= 2 ? 0.88 : degree <= 3 ? 0.94 : 1
          return {
            ...data,
            color: scaleColorAlpha(String(data.color ?? '#94a3b8'), degreeFade),
            size: Math.max(0.1, baseSize * degreeSize),
          }
        }

        return { ...data, size: baseSize }
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
      hoveredNodeRef.current = node
      const attrs = graph.getNodeAttributes(node)
      const screenPos = sigma.graphToViewport({ x: attrs.x ?? 0, y: attrs.y ?? 0 })
      const connCount = graph.degree(node)
      setTooltip({
        x: screenPos.x,
        y: screenPos.y - 25,
        type: 'node',
        label: attrs.label as string,
        sublabel: (attrs.description as string | undefined) || (attrs.nodeType as string | undefined),
        description: `${connCount} connections`,
      })
      sigma.refresh()
    })

    sigma.on('leaveNode', () => {
      hoveredNodeRef.current = null
      setTooltip(null)
      sigma.refresh()
    })

    sigma.on('enterEdge', ({ edge }) => {
      const sourceAttrs = graph.getNodeAttributes(graph.source(edge))
      const targetAttrs = graph.getNodeAttributes(graph.target(edge))
      const edgeAttrs = graph.getEdgeAttributes(edge)
      const midX = ((sourceAttrs.x ?? 0) + (targetAttrs.x ?? 0)) / 2
      const midY = ((sourceAttrs.y ?? 0) + (targetAttrs.y ?? 0)) / 2
      const screenPos = sigma.graphToViewport({ x: midX, y: midY })
      const relKey = edgeAttrs.label?.toString().replace(/ /g, '_') as string
      const labels = lang === 'en' ? RELATIONSHIP_TYPE_LABELS_EN : RELATIONSHIP_TYPE_LABELS

      setTooltip({
        x: screenPos.x,
        y: screenPos.y - 20,
        type: 'edge',
        label: labels[relKey as RelationshipType] ?? edgeAttrs.label as string,
        confidence: edgeAttrs.confidence as string,
      })
    })

    sigma.on('leaveEdge', () => {
      setTooltip(null)
    })

    // Fit camera to graph bounds in viewport pixels to avoid extreme initial zoom.
    setTimeout(() => {
      if (zoomFittedRef.current) return
      zoomFittedRef.current = true
      try {
        const camera = sigma.getCamera() as {
          getState: () => { x: number; y: number; angle: number; ratio: number }
          setState: (state: Partial<{ x: number; y: number; angle: number; ratio: number }>) => void
          animate?: (state: Partial<{ x: number; y: number; angle: number; ratio: number }>, opts?: { duration?: number }) => Promise<void>
        }

        const bbox = sigma.getBBox()
        const minX = bbox.x[0]
        const maxX = bbox.x[1]
        const minY = bbox.y[0]
        const maxY = bbox.y[1]

        const baseState = camera.getState()
        camera.setState({ x: baseState.x, y: baseState.y, angle: 0, ratio: 1 })

        const topLeft = sigma.graphToViewport({ x: minX, y: minY })
        const bottomRight = sigma.graphToViewport({ x: maxX, y: maxY })
        const graphWidthPx = Math.max(1, Math.abs(bottomRight.x - topLeft.x))
        const graphHeightPx = Math.max(1, Math.abs(bottomRight.y - topLeft.y))
        const { width: viewWidthPx, height: viewHeightPx } = sigma.getDimensions()

        // Target a roomy frame similar to Obsidian's default graph viewport.
        const fill = 0.78
        const widthScale = graphWidthPx / Math.max(1, viewWidthPx * fill)
        const heightScale = graphHeightPx / Math.max(1, viewHeightPx * fill)
        const fitScale = Math.max(widthScale, heightScale)

        let targetRatio = camera.getState().ratio * fitScale
        if (!Number.isFinite(targetRatio) || targetRatio <= 0) targetRatio = 1
        targetRatio = Math.min(8, Math.max(0.06, targetRatio))

        if (typeof camera.animate === 'function') {
          camera.animate({ ratio: targetRatio }, { duration: 320 }).catch(() => {})
        } else {
          camera.setState({ ratio: targetRatio })
        }
      } catch {}
    }, 50)

    sigmaRef.current = sigma

    const unsubscribeFilters = useFiltersStore.subscribe(() => {
      sigma.refresh()
    })

    const unsubscribeSelection = useSelectionStore.subscribe(() => {
      sigma.refresh()
    })

    const unsubscribeView = useGraphViewStore.subscribe((state) => {
      sigma.setSetting('defaultEdgeType', state.showArrows ? 'arrow' : 'line')
      sigma.setSetting('labelRenderedSizeThreshold', state.textFadeThreshold)
      sigma.refresh()
    })

    return () => {
      unsubscribeFilters()
      unsubscribeSelection()
      unsubscribeView()
      sigma.kill()
      sigmaRef.current = null
    }
  }, [graph, lang])

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
          className="tooltip-enter absolute pointer-events-none z-40 glass border border-[rgba(168,130,255,0.15)] rounded-xl px-4 py-3 text-xs shadow-2xl max-w-xs"
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
