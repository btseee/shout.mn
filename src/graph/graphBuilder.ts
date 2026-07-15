import Graph from 'graphology'
import circular from 'graphology-layout/circular'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import type { Node } from '@/types/node'
import type { Edge } from '@/types/edge'
import { NODE_TYPE_COLORS } from '@/types/node'
import { CONFIDENCE_COLORS, CONFIDENCE_DASH } from '@/types/edge'

export function buildGraph(nodes: Node[], edges: Edge[]): Graph {
  const graph = new Graph({ type: 'directed', multi: true })

  for (const node of nodes) {
    const color = NODE_TYPE_COLORS[node.type] ?? '#64748b'
    const size = 4 + Math.pow((node.importance ?? 50) / 100, 1.5) * 24
    const labelColor = (node.importance ?? 50) >= 70 ? '#e2e8f0' : '#94a3b8'
    graph.addNode(node.id, {
      label: node.name,
      color,
      size,
      labelColor,
      nodeType: node.type,
      importance: node.importance ?? 50,
    })
  }

  for (const edge of edges) {
    if (!graph.hasNode(edge.from) || !graph.hasNode(edge.to)) continue
    if (edge.from === edge.to) continue

    const edgeColor = CONFIDENCE_COLORS[edge.confidence]
    const dash = CONFIDENCE_DASH[edge.confidence]

    graph.addEdgeWithKey(edge.id, edge.from, edge.to, {
      label: edge.relationship_type.replace(/_/g, ' '),
      color: edgeColor,
      size: 1.5,
      dash,
      confidence: edge.confidence,
      edgeId: edge.id,
    })
  }

  return graph
}

export function applyForceLayout(graph: Graph): void {
  if (graph.order === 0) return
  try {
    circular.assign(graph)
    const settings = forceAtlas2.inferSettings(graph)
    forceAtlas2.assign(graph, {
      iterations: 200,
      settings: {
        ...settings,
        gravity: 1.2,
        scalingRatio: 3,
        strongGravityMode: false,
        barnesHutOptimize: graph.order > 50,
        slowDown: 4,
      },
    })
  } catch (e) {
    console.error('[shout.mn] ForceAtlas2 layout failed:', e)
    try { circular.assign(graph) } catch {}
  }
}
