import Graph from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import type { Node } from '@/types/node'
import type { Edge } from '@/types/edge'
import { getEmploymentColor } from '@/types/node'
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

function extractComponentGraph(graph: Graph, componentNodes: string[]): Graph {
  const keep = new Set(componentNodes)
  const subGraph = graph.copy()
  for (const nodeId of subGraph.nodes()) {
    if (!keep.has(nodeId)) subGraph.dropNode(nodeId)
  }
  return subGraph
}

function copyLayoutPositions(target: Graph, source: Graph, nodeIds: string[], offsetX = 0, offsetY = 0): void {
  for (const nodeId of nodeIds) {
    const attrs = source.getNodeAttributes(nodeId)
    target.setNodeAttribute(nodeId, 'x', (attrs.x ?? 0) + offsetX)
    target.setNodeAttribute(nodeId, 'y', (attrs.y ?? 0) + offsetY)
  }
}

function estimateRadius(graph: Graph): number {
  let maxRadius = 0
  for (const nodeId of graph.nodes()) {
    const x = Number(graph.getNodeAttribute(nodeId, 'x') ?? 0)
    const y = Number(graph.getNodeAttribute(nodeId, 'y') ?? 0)
    const radius = Math.hypot(x, y)
    if (Number.isFinite(radius) && radius > maxRadius) maxRadius = radius
  }
  return Math.max(maxRadius, 12)
}

function stableNoise(seed: string): number {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const normalized = (hash >>> 0) / 4294967295
  return normalized * 2 - 1
}

function stableNoise01(seed: string): number {
  return (stableNoise(seed) + 1) * 0.5
}

function toMutedRgba(hex: string, alpha: number, mix = 0.9): string {
  const value = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(86,88,94,${alpha})`
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)

  const bgR = 26
  const bgG = 28
  const bgB = 34

  const mutedR = Math.round(r * (1 - mix) + bgR * mix)
  const mutedG = Math.round(g * (1 - mix) + bgG * mix)
  const mutedB = Math.round(b * (1 - mix) + bgB * mix)

  return `rgba(${mutedR}, ${mutedG}, ${mutedB}, ${alpha})`
}

function computeDegreeStats(nodes: Node[], edges: Edge[]): { degreeByNode: Map<string, number>; maxDegree: number } {
  const nodeIds = new Set(nodes.map(node => node.id))
  const degreeByNode = new Map<string, number>()

  for (const node of nodes) degreeByNode.set(node.id, 0)

  for (const edge of edges) {
    if (edge.source_node === edge.target_node) continue
    if (!nodeIds.has(edge.source_node) || !nodeIds.has(edge.target_node)) continue

    degreeByNode.set(edge.source_node, (degreeByNode.get(edge.source_node) ?? 0) + 1)
    degreeByNode.set(edge.target_node, (degreeByNode.get(edge.target_node) ?? 0) + 1)
  }

  let maxDegree = 0
  for (const degree of degreeByNode.values()) {
    if (degree > maxDegree) maxDegree = degree
  }

  return { degreeByNode, maxDegree }
}

function getCloudAnchor(seed: string, innerRadius: number, outerRadius: number): { x: number; y: number } {
  const angle = stableNoise01(`${seed}-a`) * Math.PI * 2
  const radial = stableNoise01(`${seed}-r`)
  const radius = innerRadius + Math.pow(radial, 1.4) * Math.max(12, outerRadius - innerRadius)
  const tangentialJitter = (stableNoise01(`${seed}-t`) - 0.5) * 18

  return {
    x: Math.cos(angle) * radius + Math.sin(angle) * tangentialJitter,
    y: Math.sin(angle) * radius - Math.cos(angle) * tangentialJitter,
  }
}

function separateOverlaps(graph: Graph, options: { passes?: number; padding?: number } = {}): void {
  if (graph.order <= 1) return

  const passes = options.passes ?? 6
  const padding = options.padding ?? 2
  const nodes = graph.nodes()

  for (let pass = 0; pass < passes; pass++) {
    const state = new Map<string, { x: number; y: number; size: number }>()
    let maxSize = 0

    for (const nodeId of nodes) {
      const x = Number(graph.getNodeAttribute(nodeId, 'x') ?? 0)
      const y = Number(graph.getNodeAttribute(nodeId, 'y') ?? 0)
      const size = Math.max(0.6, Number(graph.getNodeAttribute(nodeId, 'size') ?? 1))
      state.set(nodeId, { x, y, size })
      if (size > maxSize) maxSize = size
    }

    const cellSize = Math.max(8, maxSize * 2 + padding * 2)
    const grid = new Map<string, string[]>()

    for (const nodeId of nodes) {
      const pos = state.get(nodeId)
      if (!pos) continue
      const gx = Math.floor(pos.x / cellSize)
      const gy = Math.floor(pos.y / cellSize)
      const key = `${gx},${gy}`
      const bucket = grid.get(key)
      if (bucket) bucket.push(nodeId)
      else grid.set(key, [nodeId])
    }

    const delta = new Map<string, { dx: number; dy: number }>()
    let moved = false

    for (const nodeId of nodes) {
      const pos = state.get(nodeId)
      if (!pos) continue
      const gx = Math.floor(pos.x / cellSize)
      const gy = Math.floor(pos.y / cellSize)

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const key = `${gx + ox},${gy + oy}`
          const bucket = grid.get(key)
          if (!bucket) continue

          for (const otherId of bucket) {
            if (otherId <= nodeId) continue
            const otherPos = state.get(otherId)
            if (!otherPos) continue

            let vx = pos.x - otherPos.x
            let vy = pos.y - otherPos.y
            let dist = Math.hypot(vx, vy)

            const minDist = (pos.size + otherPos.size) * 0.5 + padding
            if (dist >= minDist) continue

            moved = true
            if (dist < 1e-6) {
              const jitter = stableNoise(`${nodeId}:${otherId}:${pass}`) * Math.PI
              vx = Math.cos(jitter)
              vy = Math.sin(jitter)
              dist = 1
            }

            const overlap = minDist - dist
            const push = overlap * 0.5
            const ux = vx / dist
            const uy = vy / dist

            const a = delta.get(nodeId) ?? { dx: 0, dy: 0 }
            a.dx += ux * push
            a.dy += uy * push
            delta.set(nodeId, a)

            const b = delta.get(otherId) ?? { dx: 0, dy: 0 }
            b.dx -= ux * push
            b.dy -= uy * push
            delta.set(otherId, b)
          }
        }
      }
    }

    if (!moved) break

    for (const nodeId of nodes) {
      const pos = state.get(nodeId)
      if (!pos) continue
      const d = delta.get(nodeId)
      if (!d) continue
      graph.setNodeAttribute(nodeId, 'x', pos.x + d.dx)
      graph.setNodeAttribute(nodeId, 'y', pos.y + d.dy)
    }
  }
}

function buildSearchText(node: Node): string {
  const aliases = (node.aliases ?? []).join(' ')
  const profileBits = [
    node.profile?.organization,
    node.profile?.position,
    node.profile?.party,
    node.profile?.political_faction,
    ...(node.profile?.all_organizations ?? []),
    ...(node.profile?.all_positions ?? []),
  ]
    .filter((v): v is string => Boolean(v))
    .join(' ')

  return [node.name, node.description, aliases, profileBits]
    .filter((v): v is string => Boolean(v))
    .join(' ')
    .toLowerCase()
}

export function buildGraph(nodes: Node[], edges: Edge[]): Graph {
  const graph = new Graph({ type: 'directed', multi: true })
  const { degreeByNode, maxDegree } = computeDegreeStats(nodes, edges)

  for (const node of nodes) {
    const color = getEmploymentColor(node.subtype)
    const imp = node.importance ?? 50
    const degree = degreeByNode.get(node.id) ?? 0
    const degreeNorm = maxDegree > 0 ? Math.log1p(degree) / Math.log1p(maxDegree) : 0
    const size = 1.4 + Math.pow(imp / 100, 1.08) * 3.3 + Math.pow(degreeNorm, 1.2) * 4.8

    const attrs: Record<string, unknown> = {
      label: node.name,
      color,
      size,
      degree,
      labelColor: '#94a3b8',
      nodeType: node.type,
      subtype: node.subtype,
      description: node.description,
      searchText: buildSearchText(node),
      importance: imp,
    }

    graph.addNode(node.id, attrs)
  }

  // Sort edges by weight (documented > reported > alleged)
  const edgeWeight = (e: Edge) => e.confidence === 'documented' ? 3 : e.confidence === 'reported' ? 2 : 1
  const sortedEdges = [...edges].sort((a, b) => edgeWeight(b) - edgeWeight(a))

  for (const edge of sortedEdges) {
    if (!graph.hasNode(edge.source_node) || !graph.hasNode(edge.target_node)) continue
    if (edge.source_node === edge.target_node) continue

    const baseEdgeColor = RELATIONSHIP_TYPE_COLORS[edge.relationship_type] || '#3d3654'
    const edgeAlpha = edge.confidence === 'documented' ? 0.13 : edge.confidence === 'reported' ? 0.09 : 0.055
    const edgeColor = toMutedRgba(baseEdgeColor, edgeAlpha, 0.8)
    const weight = edge.confidence === 'documented' ? 1.5 : edge.confidence === 'reported' ? 1 : 0.5

    graph.addEdgeWithKey(edge.id, edge.source_node, edge.target_node, {
      label: edge.relationship_type.replace(/_/g, ' '),
      color: edgeColor,
      size: 0.3,
      type: 'line',
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
      runForceAtlas(graph)
      separateOverlaps(graph, { passes: 5, padding: 1.5 })
      normalizeLayoutSpan(graph, { minSpan: 640, maxSpan: 1100, multiplier: 32 })
      return
    }

    const [mainComponent, ...restComponents] = components
    const connectedComponents = restComponents.filter(component => component.length > 1)
    const isolatedComponents = restComponents.filter(component => component.length === 1)
    const mainGraph = extractComponentGraph(graph, mainComponent)

    if (mainGraph.order > 1) {
      runForceAtlas(mainGraph)
      separateOverlaps(mainGraph, { passes: 5, padding: 1.4 })
      normalizeLayoutSpan(mainGraph, { minSpan: 760, maxSpan: 1080, multiplier: 32 })
      copyLayoutPositions(graph, mainGraph, mainComponent)
    } else {
      graph.setNodeAttribute(mainComponent[0], 'x', 0)
      graph.setNodeAttribute(mainComponent[0], 'y', 0)
    }

    const mainRadius = estimateRadius(mainGraph)
    const satelliteInnerRadius = mainRadius * 0.76
    const satelliteOuterRadius = mainRadius * 1.12

    connectedComponents.forEach(componentNodes => {
      const anchor = getCloudAnchor(componentNodes[0], satelliteInnerRadius, satelliteOuterRadius)
      const subGraph = extractComponentGraph(graph, componentNodes)
      runForceAtlas(subGraph)
      separateOverlaps(subGraph, { passes: 4, padding: 1.25 })

      const targetSpan = Math.min(110, Math.max(24, Math.sqrt(subGraph.order) * 14))
      normalizeLayoutSpan(subGraph, { minSpan: targetSpan, maxSpan: targetSpan, multiplier: 32 })

      copyLayoutPositions(graph, subGraph, componentNodes, anchor.x, anchor.y)
    })

    // Isolated nodes form a quiet outer halo, as in Obsidian's overview graph.
    const haloBaseRadius = mainRadius * 1.2
    const haloRings = Math.max(2, Math.min(4, Math.ceil(isolatedComponents.length / 120)))
    isolatedComponents.forEach((componentNodes, index) => {
      const nodeId = componentNodes[0]
      const ring = index % haloRings
      const ringIndex = Math.floor(index / haloRings)
      const nodesInRing = Math.ceil(isolatedComponents.length / haloRings)
      const angle = (ringIndex / Math.max(1, nodesInRing)) * Math.PI * 2
        + ring * 0.17
        + stableNoise(`${nodeId}-halo-angle`) * 0.018
      const radius = haloBaseRadius * (1 + ring * 0.055)
        + stableNoise(`${nodeId}-halo-radius`) * mainRadius * 0.018

      graph.setNodeAttribute(nodeId, 'x', Math.cos(angle) * radius)
      graph.setNodeAttribute(nodeId, 'y', Math.sin(angle) * radius)
    })

    separateOverlaps(graph, { passes: 3, padding: 1.2 })
    normalizeLayoutSpan(graph, { minSpan: 900, maxSpan: 1450, multiplier: 34 })
  } catch (e) {
    console.error('[shout.mn] Layout failed:', e)
  }
}

function normalizeLayoutSpan(
  graph: Graph,
  options: { minSpan?: number; maxSpan?: number; multiplier?: number } = {}
): void {
  if (graph.order === 0) return

  const minSpan = options.minSpan ?? 300
  const maxSpan = options.maxSpan ?? 1400
  const multiplier = options.multiplier ?? 45

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity

  for (const nodeId of graph.nodes()) {
    const x = graph.getNodeAttribute(nodeId, 'x') ?? 0
    const y = graph.getNodeAttribute(nodeId, 'y') ?? 0
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }

  const currentSpan = Math.max(maxX - minX, maxY - minY)
  const targetSpan = Math.min(maxSpan, Math.max(minSpan, Math.sqrt(graph.order) * multiplier))

  if (currentSpan <= 0 || !Number.isFinite(currentSpan)) return

  const scale = targetSpan / currentSpan
  for (const nodeId of graph.nodes()) {
    const x = graph.getNodeAttribute(nodeId, 'x') ?? 0
    const y = graph.getNodeAttribute(nodeId, 'y') ?? 0
    graph.setNodeAttribute(nodeId, 'x', x * scale)
    graph.setNodeAttribute(nodeId, 'y', y * scale)
  }
}

function runForceAtlas(graph: Graph): void {
  if (graph.order === 0) return

  const spread = Math.sqrt(graph.order) * 7.5
  for (const nodeId of graph.nodes()) {
    const angle = stableNoise01(`${nodeId}-a`) * Math.PI * 2
    const r = Math.sqrt(stableNoise01(`${nodeId}-r`)) * spread
    graph.setNodeAttribute(nodeId, 'x', Math.cos(angle) * r)
    graph.setNodeAttribute(nodeId, 'y', Math.sin(angle) * r)
  }

  forceAtlas2.assign(graph, {
    iterations: graph.order > 500 ? 420 : 260,
    settings: {
      gravity: 0.22,
      scalingRatio: 3.4,
      strongGravityMode: false,
      barnesHutOptimize: true,
      barnesHutTheta: 0.5,
      slowDown: 2,
      edgeWeightInfluence: 0.65,
      outboundAttractionDistribution: true,
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

  separateOverlaps(graph, { passes: 4, padding: 1.25 })
  normalizeLayoutSpan(graph, { minSpan: 300, maxSpan: 1400, multiplier: 45 })
}
