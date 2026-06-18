import { useEffect, useRef, useCallback } from 'react'
import Sigma from 'sigma'
import type Graph from 'graphology'
import { useSelectionStore } from '@/store/selection.ts'
import { useFiltersStore } from '@/store/filters.ts'

interface SigmaGraphProps {
  graph: Graph
  className?: string
}

export function SigmaGraph({ graph, className = '' }: SigmaGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const { selectedNodeId, selectedEdgeId, hopDepth, setSelectedNode, setSelectedEdge, clearSelection } = useSelectionStore()
  const filters = useFiltersStore()

  // Initialize sigma
  useEffect(() => {
    if (!containerRef.current) return
    if (graph.order === 0) return

    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultNodeType: 'circle',
      labelFont: 'Inter, system-ui, sans-serif',
      labelSize: 13,
      labelColor: { attribute: 'labelColor', color: '#64748b' },
      nodeReducer: (node, data) => {
        const sel = useSelectionStore.getState()
        const filt = useFiltersStore.getState()

        // Filter by entity type
        if (filt.entityTypes.length > 0 && !filt.entityTypes.includes(data.entityType as string)) {
          return { ...data, hidden: true }
        }

        // Filter by confidence
        if (data.confidence < filt.minConfidence) {
          return { ...data, hidden: true }
        }

        // Highlight selection
        if (sel.selectedNodeId) {
          const isSelected = node === sel.selectedNodeId
          const isNeighbor = graph.neighbors(sel.selectedNodeId).includes(node)
          if (!isSelected && !isNeighbor) {
            return { ...data, color: '#e2e8f0', size: Math.max(data.size * 0.7, 4), zIndex: 0 }
          }
          if (isSelected) {
            return { ...data, highlighted: true, zIndex: 2 }
          }
        }

        // Path highlighting
        if (sel.pathEntityIds.length > 0) {
          if (!sel.pathEntityIds.includes(node)) {
            return { ...data, color: '#e2e8f0', size: Math.max(data.size * 0.7, 4) }
          }
          return { ...data, highlighted: true, zIndex: 2 }
        }

        return data
      },
      edgeReducer: (edge, data) => {
        const sel = useSelectionStore.getState()
        const filt = useFiltersStore.getState()
        const source = graph.source(edge)
        const target = graph.target(edge)

        // Filter by status
        if (filt.relationshipStatuses.length > 0 && !filt.relationshipStatuses.includes(data.status)) {
          return { ...data, hidden: true }
        }
        // Filter by strength
        if (data.strength < filt.minStrength) {
          return { ...data, hidden: true }
        }
        // Filter by confidence
        if (data.confidence < filt.minConfidence) {
          return { ...data, hidden: true }
        }

        // Dim when node is selected
        if (sel.selectedNodeId) {
          if (source !== sel.selectedNodeId && target !== sel.selectedNodeId) {
            return { ...data, color: '#f1f5f9', size: 1 }
          }
          if (edge === selectedEdgeId) {
            return { ...data, color: '#e11d48', size: 3 }
          }
        }

        // Path highlighting
        if (sel.pathEntityIds.length > 0) {
          const bothOnPath = sel.pathEntityIds.includes(source) && sel.pathEntityIds.includes(target)
          if (!bothOnPath) {
            return { ...data, color: '#e2e8f0', size: 1 }
          }
          return { ...data, color: '#e11d48', size: 3 }
        }

        return data
      },
    })

    sigma.on('clickNode', ({ node }) => {
      setSelectedNode(node)
    })

    sigma.on('clickEdge', ({ edge }) => {
      const relId = graph.getEdgeAttribute(edge, 'relationshipId') as string
      setSelectedEdge(relId)
    })

    sigma.on('clickStage', () => {
      clearSelection()
    })

    sigmaRef.current = sigma

    return () => {
      sigma.kill()
      sigmaRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph])

  // Refresh sigma when selection or filters change
  const refresh = useCallback(() => {
    sigmaRef.current?.refresh({ skipIndexation: true })
  }, [])

  useEffect(() => {
    refresh()
  }, [selectedNodeId, selectedEdgeId, hopDepth, filters, refresh])

  return (
    <div
      ref={containerRef}
      className={`sigma-container ${className}`}
      role="img"
      aria-label="Харилцааны граф. Зангилаа сонгосны дараа гарыг дусгар гаръдах товчлуури ашиглана уу."
    />
  )
}
