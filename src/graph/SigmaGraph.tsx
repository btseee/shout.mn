import { useEffect, useRef, useCallback } from 'react'
import Sigma from 'sigma'
import type Graph from 'graphology'
import { useSelectionStore } from '@/store/selection'
import { useFiltersStore } from '@/store/filters'
import type { NodeType } from '@/types/node'
import type { ConfidenceTier } from '@/types/edge'

interface SigmaGraphProps {
  graph: Graph
  className?: string
}

export function SigmaGraph({ graph, className = '' }: SigmaGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const { selectedNodeId, selectedEdgeId, selectNode, selectEdge, clearSelection } = useSelectionStore()
  const filters = useFiltersStore()

  useEffect(() => {
    if (!containerRef.current) return
    if (graph.order === 0) return

    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      defaultNodeType: 'circle',
      labelFont: 'Inter, system-ui, sans-serif',
      labelSize: 12,
      labelWeight: '500',
      labelColor: { attribute: 'labelColor', color: '#94a3b8' },
      labelRenderedSizeThreshold: 8,
      nodeReducer: (node, data) => {
        const sel = useSelectionStore.getState()
        const filt = useFiltersStore.getState()

        if (filt.selectedNodeTypes.length > 0 && !filt.selectedNodeTypes.includes(data.nodeType as NodeType)) {
          return { ...data, hidden: true }
        }

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

        return data
      },
      edgeReducer: (edge, data) => {
        const sel = useSelectionStore.getState()
        const filt = useFiltersStore.getState()
        const source = graph.source(edge)
        const target = graph.target(edge)

        if (filt.selectedConfidence.length > 0 && !filt.selectedConfidence.includes(data.confidence as ConfidenceTier)) {
          return { ...data, hidden: true }
        }

        if (sel.selectedNodeId) {
          if (source !== sel.selectedNodeId && target !== sel.selectedNodeId) {
            return { ...data, color: '#f1f5f9', size: 1 }
          }
          if (edge === sel.selectedEdgeId) {
            return { ...data, color: '#e11d48', size: 3 }
          }
        }

        return data
      },
    })

    sigma.on('clickNode', ({ node }) => {
      selectNode(node)
    })

    sigma.on('clickEdge', ({ edge }) => {
      selectEdge(edge)
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

  const refresh = useCallback(() => {
    sigmaRef.current?.refresh({ skipIndexation: true })
  }, [])

  useEffect(() => {
    refresh()
  }, [selectedNodeId, selectedEdgeId, filters, refresh])

  return (
    <div
      ref={containerRef}
      className={`sigma-container ${className}`}
      role="img"
      aria-label="Power mapping graph"
    />
  )
}
