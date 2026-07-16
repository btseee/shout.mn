import Graph from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import type { Node } from '@/types/node'
import type { Edge } from '@/types/edge'
import { NODE_TYPE_COLORS } from '@/types/node'
import { RELATIONSHIP_TYPE_COLORS } from '@/types/edge'

function getConnectedComponents(graph: Graph): string[][] {
  const visited = new Set<string>()
  const components: string[][] = []

  for (const node of graph.nodes()) {
    if (visited.has(node)) continue
    const component: string[] = []
    const queue = [node]
    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      component.push(current)
      for (const neighbor of graph.neighbors(current)) {
        if (!visited.has(neighbor)) queue.push(neighbor)
      }
    }
    components.push(component)
  }

  components.sort((a, b) => b.length - a.length)
  return components
}

export function buildGraph(nodes: Node[], edges: Edge[]): Graph {
  const graph = new Graph({ type: 'directed', multi: true })

  for (const node of nodes) {
    const color = NODE_TYPE_COLORS[node.type] ?? '#64748b'
    const imp = node.importance ?? 50
    const size = 2 + Math.pow(imp / 100, 1.5) * 8
    const labelColor = imp >= 70 ? '#e2e8f0' : '#94a3b8'

    const attrs: Record<string, any> = {
      label: node.name,
      color,
      size,
      labelColor,
      nodeType: node.type,
      importance: imp,
    }

    graph.addNode(node.id, attrs)
  }

  const addedEdges = new Set<string>()

  for (const edge of edges) {
    if (!graph.hasNode(edge.source_node) || !graph.hasNode(edge.target_node)) continue
    if (edge.source_node === edge.target_node) continue

    // Skip duplicate edges between same pair
    const edgeKey = `${edge.source_node}->${edge.target_node}`
    if (addedEdges.has(edgeKey)) continue
    addedEdges.add(edgeKey)

    const edgeColor = RELATIONSHIP_TYPE_COLORS[edge.relationship_type] || '#64748b'
    const weight = edge.confidence === 'documented' ? 3 : edge.confidence === 'reported' ? 2 : 1

    graph.addEdgeWithKey(edge.id, edge.source_node, edge.target_node, {
      label: edge.relationship_type.replace(/_/g, ' '),
      color: edgeColor,
      size: edge.confidence === 'documented' ? 1 : 0.5,
      type: 'arrow',
      weight,
      confidence: edge.confidence,
      edgeId: edge.id,
    })
  }

  return graph
}

export function applyForceLayout(graph: Graph): void {
  if (graph.order === 0) return

  try {
    const components = getConnectedComponents(graph)

    if (components.length === 1) {
      runForceAtlas(graph, graph.nodes())
      return
    }

    const cols = Math.ceil(Math.sqrt(components.length))
    const spacing = 300

    for (let i = 0; i < components.length; i++) {
      const compNodes = components[i]
      const col = i % cols
      const row = Math.floor(i / cols)
      const offsetX = (col - (cols - 1) / 2) * spacing
      const offsetY = (row - Math.ceil(components.length / cols - 1) / 2) * spacing

      const subGraph = graph.copy()
      for (const n of subGraph.nodes()) {
        if (!compNodes.includes(n)) subGraph.dropNode(n)
      }

      if (subGraph.order > 1) {
        runForceAtlas(subGraph, compNodes)
        for (const nodeId of compNodes) {
          const attrs = subGraph.getNodeAttributes(nodeId)
          graph.setNodeAttribute(nodeId, 'x', (attrs.x ?? 0) + offsetX)
          graph.setNodeAttribute(nodeId, 'y', (attrs.y ?? 0) + offsetY)
        }
      } else {
        graph.setNodeAttribute(compNodes[0], 'x', offsetX)
        graph.setNodeAttribute(compNodes[0], 'y', offsetY)
      }
    }
  } catch (e) {
    console.error('[shout.mn] Layout failed:', e)
  }
}

function runForceAtlas(graph: Graph, nodeIds: string[]): void {
  if (graph.order === 0) return

  const cx = graph.order / 2
  const cy = graph.order / 2
  for (const nodeId of graph.nodes()) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.random() * 50
    graph.setNodeAttribute(nodeId, 'x', cx + Math.cos(angle) * r)
    graph.setNodeAttribute(nodeId, 'y', cy + Math.sin(angle) * r)
  }

  const edgeCount = graph.size
  const nodeCount = graph.order
  const density = edgeCount / (nodeCount * (nodeCount - 1) / 2)

  forceAtlas2.assign(graph, {
    iterations: 300,
    settings: {
      gravity: 0.8,
      scalingRatio: 3,
      strongGravityMode: true,
      barnesHutOptimize: nodeCount > 50,
      barnesHutTheta: 0.5,
      slowDown: 1.5,
      edgeWeightInfluence: 0.8,
      outboundAttractionDistribution: false,
      linLogMode: false,
      adjustSizes: true,
    },
  })

  const padding = 60
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const nodeId of graph.nodes()) {
    const x = graph.getNodeAttribute(nodeId, 'x') ?? 0
    const y = graph.getNodeAttribute(nodeId, 'y') ?? 0
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }

  const width = maxX - minX + padding * 2
  const height = maxY - minY + padding * 2
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  for (const nodeId of graph.nodes()) {
    const x = graph.getNodeAttribute(nodeId, 'x') ?? 0
    const y = graph.getNodeAttribute(nodeId, 'y') ?? 0
    graph.setNodeAttribute(nodeId, 'x', (x - centerX) + width / 2)
    graph.setNodeAttribute(nodeId, 'y', (y - centerY) + height / 2)
  }
}
