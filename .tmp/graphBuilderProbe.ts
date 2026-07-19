import Graph from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import type { Node } from '../src/types/node.ts'
import type { Edge } from '../src/types/edge.ts'
import { NODE_TYPE_COLORS } from '../src/types/node.ts'
import { RELATIONSHIP_TYPE_COLORS } from '../src/types/edge.ts'

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

// Cap graph size for WebGL safety
const MAX_NODES = 800
const MAX_EDGES = 2000

export function buildGraph(nodes: Node[], edges: Edge[]): Graph {
  const graph = new Graph({ type: 'directed', multi: true })

  // Sort by importance, take top N
  const sorted = [...nodes].sort((a, b) => (b.importance ?? 50) - (a.importance ?? 50))
  const keepNodes = new Set(sorted.slice(0, MAX_NODES).map(n => n.id))

  for (const node of nodes) {
    if (!keepNodes.has(node.id)) continue

    const color = NODE_TYPE_COLORS[node.type] ?? '#64748b'
    const imp = node.importance ?? 50
    const size = 3 + Math.pow(imp / 100, 1.5) * 8

    const attrs: Record<string, any> = {
      label: node.name,
      color,
      size,
      labelColor: '#94a3b8',
      nodeType: node.type,
      subtype: node.subtype,
      importance: imp,
    }

    graph.addNode(node.id, attrs)
  }

  // Sort edges by weight (documented > reported > alleged), take top N
  const edgeWeight = (e: Edge) => e.confidence === 'documented' ? 3 : e.confidence === 'reported' ? 2 : 1
  const sortedEdges = [...edges].sort((a, b) => edgeWeight(b) - edgeWeight(a))

  const addedEdges = new Set<string>()
  let edgeCount = 0

  for (const edge of sortedEdges) {
    if (edgeCount >= MAX_EDGES) break
    if (!graph.hasNode(edge.source_node) || !graph.hasNode(edge.target_node)) continue
    if (edge.source_node === edge.target_node) continue

    const edgeKey = `${edge.source_node}->${edge.target_node}`
    if (addedEdges.has(edgeKey)) continue
    addedEdges.add(edgeKey)

    const edgeColor = RELATIONSHIP_TYPE_COLORS[edge.relationship_type] || '#3d3654'
    const weight = edge.confidence === 'documented' ? 1.5 : edge.confidence === 'reported' ? 1 : 0.5

    graph.addEdgeWithKey(edge.id, edge.source_node, edge.target_node, {
      label: edge.relationship_type.replace(/_/g, ' '),
      color: edgeColor,
      size: 0.3,
      type: 'arrow',
      weight,
      confidence: edge.confidence,
      edgeId: edge.id,
    })
    edgeCount++
  }

  return graph
}

export function applyForceLayout(graph: Graph): void {
  if (graph.order === 0) return

  try {
    const components = getConnectedComponents(graph)

    if (components.length === 1) {
      runForceAtlas(graph)
      return
    }

    const cols = Math.ceil(Math.sqrt(components.length))
    const spacing = 400

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
        runForceAtlas(subGraph)
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

function runForceAtlas(graph: Graph): void {
  if (graph.order === 0) return

  const spread = Math.sqrt(graph.order) * 8
  for (const nodeId of graph.nodes()) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.random() * spread + 10
    graph.setNodeAttribute(nodeId, 'x', Math.cos(angle) * r)
    graph.setNodeAttribute(nodeId, 'y', Math.sin(angle) * r)
  }

  forceAtlas2.assign(graph, {
    iterations: 200,
    settings: {
      gravity: 0.3,
      scalingRatio: 3,
      strongGravityMode: false,
      barnesHutOptimize: true,
      barnesHutTheta: 0.5,
      slowDown: 1,
      edgeWeightInfluence: 0.5,
      outboundAttractionDistribution: false,
      linLogMode: true,
      adjustSizes: false,
    },
  })

  // Center at origin
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const nodeId of graph.nodes()) {
    const x = graph.getNodeAttribute(nodeId, 'x') ?? 0
    const y = graph.getNodeAttribute(nodeId, 'y') ?? 0
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  for (const nodeId of graph.nodes()) {
    const x = graph.getNodeAttribute(nodeId, 'x') ?? 0
    const y = graph.getNodeAttribute(nodeId, 'y') ?? 0
    graph.setNodeAttribute(nodeId, 'x', x - cx)
    graph.setNodeAttribute(nodeId, 'y', y - cy)
  }
}
