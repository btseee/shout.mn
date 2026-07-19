import Graph from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import type { Node } from '@/types/node'
import type { Edge } from '@/types/edge'
import { getEmploymentColor } from '@/types/node'
import { RELATIONSHIP_TYPE_COLORS } from '@/types/edge'

export interface ForceLayoutOptions {
  centerForce?: number
  repelForce?: number
  linkForce?: number
}

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

function applyAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(107,114,128,${alpha})`
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
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

function contractLeafNodes(graph: Graph, ratio = 0.5): void {
  if (graph.order <= 2) return

  const r = Math.max(0, Math.min(1, ratio))
  for (const nodeId of graph.nodes()) {
    if (graph.degree(nodeId) !== 1) continue

    const [neighborId] = graph.neighbors(nodeId)
    if (!neighborId) continue

    const x = Number(graph.getNodeAttribute(nodeId, 'x') ?? 0)
    const y = Number(graph.getNodeAttribute(nodeId, 'y') ?? 0)
    const nx = Number(graph.getNodeAttribute(neighborId, 'x') ?? 0)
    const ny = Number(graph.getNodeAttribute(neighborId, 'y') ?? 0)

    graph.setNodeAttribute(nodeId, 'x', nx + (x - nx) * r)
    graph.setNodeAttribute(nodeId, 'y', ny + (y - ny) * r)
  }
}

function tuckLeafNodesToNeighbors(graph: Graph, ratio = 0.32, jitter = 4): void {
  if (graph.order <= 2) return

  const r = Math.max(0.05, Math.min(0.95, ratio))
  const j = Math.max(0, jitter)

  for (const nodeId of graph.nodes()) {
    if (graph.degree(nodeId) !== 1) continue

    const [neighborId] = graph.neighbors(nodeId)
    if (!neighborId) continue

    const x = Number(graph.getNodeAttribute(nodeId, 'x') ?? 0)
    const y = Number(graph.getNodeAttribute(nodeId, 'y') ?? 0)
    const nx = Number(graph.getNodeAttribute(neighborId, 'x') ?? 0)
    const ny = Number(graph.getNodeAttribute(neighborId, 'y') ?? 0)

    let vx = x - nx
    let vy = y - ny
    let dist = Math.hypot(vx, vy)

    if (dist <= 1e-6) {
      const fallbackAngle = stableNoise01(`${nodeId}-leaf-fallback-angle`) * Math.PI * 2
      vx = Math.cos(fallbackAngle)
      vy = Math.sin(fallbackAngle)
      dist = 1
    }

    let ux = vx / dist
    let uy = vy / dist

    const angleJitter = stableNoise(`${nodeId}-leaf-angle`) * 0.45
    const cosA = Math.cos(angleJitter)
    const sinA = Math.sin(angleJitter)
    const rux = ux * cosA - uy * sinA
    const ruy = ux * sinA + uy * cosA
    ux = rux
    uy = ruy

    const targetDist = Math.max(5, Math.min(24, dist * r))
    const radialJitter = stableNoise(`${nodeId}-leaf-radial`) * j
    const finalDist = Math.max(4, targetDist + radialJitter)

    graph.setNodeAttribute(nodeId, 'x', nx + ux * finalDist)
    graph.setNodeAttribute(nodeId, 'y', ny + uy * finalDist)
  }
}

function softenDegreeTwoChains(graph: Graph, pull = 0.3, passes = 2): void {
  if (graph.order <= 2) return

  const p = Math.max(0.05, Math.min(0.9, pull))
  const nPasses = Math.max(1, Math.min(6, passes))

  for (let pass = 0; pass < nPasses; pass++) {
    const updates: Array<{ id: string; x: number; y: number }> = []

    for (const nodeId of graph.nodes()) {
      if (graph.degree(nodeId) !== 2) continue

      const neighbors = graph.neighbors(nodeId)
      if (neighbors.length !== 2) continue

      const x = Number(graph.getNodeAttribute(nodeId, 'x') ?? 0)
      const y = Number(graph.getNodeAttribute(nodeId, 'y') ?? 0)

      const n1x = Number(graph.getNodeAttribute(neighbors[0], 'x') ?? 0)
      const n1y = Number(graph.getNodeAttribute(neighbors[0], 'y') ?? 0)
      const n2x = Number(graph.getNodeAttribute(neighbors[1], 'x') ?? 0)
      const n2y = Number(graph.getNodeAttribute(neighbors[1], 'y') ?? 0)

      const midX = (n1x + n2x) * 0.5
      const midY = (n1y + n2y) * 0.5

      updates.push({
        id: nodeId,
        x: x + (midX - x) * p,
        y: y + (midY - y) * p,
      })
    }

    if (updates.length === 0) break
    for (const u of updates) {
      graph.setNodeAttribute(u.id, 'x', u.x)
      graph.setNodeAttribute(u.id, 'y', u.y)
    }
  }
}

function compressOuterTail(graph: Graph, knee = 0.62, tailScale = 0.38): void {
  if (graph.order <= 1) return

  const nodes = graph.nodes()
  let maxRadius = 0

  for (const nodeId of nodes) {
    const x = Number(graph.getNodeAttribute(nodeId, 'x') ?? 0)
    const y = Number(graph.getNodeAttribute(nodeId, 'y') ?? 0)
    const r = Math.hypot(x, y)
    if (r > maxRadius) maxRadius = r
  }

  if (!Number.isFinite(maxRadius) || maxRadius <= 1e-9) return

  const k = Math.max(0.2, Math.min(0.9, knee))
  const tScale = Math.max(0.1, Math.min(1, tailScale))

  for (const nodeId of nodes) {
    const x = Number(graph.getNodeAttribute(nodeId, 'x') ?? 0)
    const y = Number(graph.getNodeAttribute(nodeId, 'y') ?? 0)
    const r = Math.hypot(x, y)
    if (r <= 1e-9) continue

    const t = Math.max(0, Math.min(1, r / maxRadius))
    const mapped = t <= k ? t : k + (t - k) * tScale
    const scale = mapped / t

    graph.setNodeAttribute(nodeId, 'x', x * scale)
    graph.setNodeAttribute(nodeId, 'y', y * scale)
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
    const edgeAlpha = edge.confidence === 'documented' ? 0.085 : edge.confidence === 'reported' ? 0.062 : 0.045
    const edgeColor = toMutedRgba(baseEdgeColor, edgeAlpha)
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
  }

  return graph
}

export function applyForceLayout(graph: Graph, options: ForceLayoutOptions = {}): void {
  if (graph.order === 0) return

  try {
    const components = getConnectedComponents(graph)

    if (components.length === 1) {
      runForceAtlas(graph, options)
      separateOverlaps(graph, { passes: 4, padding: 1.1 })
      normalizeLayoutSpan(graph, { minSpan: 520, maxSpan: 1300, multiplier: 32 })
      return
    }

    const [mainComponent, ...restComponents] = components
    const mainGraph = extractComponentGraph(graph, mainComponent)

    if (mainGraph.order > 1) {
      runForceAtlas(mainGraph, options)
      normalizeLayoutSpan(mainGraph, { minSpan: 900, maxSpan: 2400, multiplier: 68 })
      copyLayoutPositions(graph, mainGraph, mainComponent)
    } else {
      graph.setNodeAttribute(mainComponent[0], 'x', 0)
      graph.setNodeAttribute(mainComponent[0], 'y', 0)
    }

    const mainRadius = estimateRadius(mainGraph)
    // Distribute disconnected components through the same cloud (not an annulus)
    // to avoid the persistent donut/hollow-center appearance.
    const innerRadius = 0
    const outerRadius = Math.max(mainRadius * 0.34, 56 + Math.sqrt(restComponents.length) * 3.2)

    restComponents.forEach(componentNodes => {
      const anchor = getCloudAnchor(componentNodes[0], innerRadius, outerRadius)

      if (componentNodes.length === 1) {
        const nodeId = componentNodes[0]
        const jitterX = stableNoise(`${nodeId}-jx`) * 6
        const jitterY = stableNoise(`${nodeId}-jy`) * 6
        graph.setNodeAttribute(nodeId, 'x', anchor.x + jitterX)
        graph.setNodeAttribute(nodeId, 'y', anchor.y + jitterY)
        return
      }

      const subGraph = extractComponentGraph(graph, componentNodes)
      runForceAtlas(subGraph, options)
      separateOverlaps(subGraph, { passes: 4, padding: 1.0 })

      const targetSpan = Math.min(120, Math.max(30, Math.sqrt(subGraph.order) * 16))
      normalizeLayoutSpan(subGraph, { minSpan: targetSpan, maxSpan: targetSpan, multiplier: 32 })

      copyLayoutPositions(graph, subGraph, componentNodes, anchor.x, anchor.y)
    })

    separateOverlaps(graph, { passes: 4, padding: 1.1 })

    // Final global normalization to keep viewport framing stable.
    normalizeLayoutSpan(graph, { minSpan: 540, maxSpan: 1350, multiplier: 34 })
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

function compactRadialCore(graph: Graph, exponent = 1.16): void {
  if (graph.order <= 1) return

  let maxRadius = 0
  const nodes = graph.nodes()

  for (const nodeId of nodes) {
    const x = Number(graph.getNodeAttribute(nodeId, 'x') ?? 0)
    const y = Number(graph.getNodeAttribute(nodeId, 'y') ?? 0)
    const radius = Math.hypot(x, y)
    if (radius > maxRadius) maxRadius = radius
  }

  if (!Number.isFinite(maxRadius) || maxRadius <= 1e-6) return

  for (const nodeId of nodes) {
    const x = Number(graph.getNodeAttribute(nodeId, 'x') ?? 0)
    const y = Number(graph.getNodeAttribute(nodeId, 'y') ?? 0)
    const radius = Math.hypot(x, y)
    if (radius <= 1e-9) continue

    const t = Math.max(0, Math.min(1, radius / maxRadius))
    const mapped = Math.pow(t, exponent)
    const scale = mapped / t

    graph.setNodeAttribute(nodeId, 'x', x * scale)
    graph.setNodeAttribute(nodeId, 'y', y * scale)
  }
}

function runForceAtlas(graph: Graph, options: ForceLayoutOptions = {}): void {
  if (graph.order === 0) return

  const gravity = Number.isFinite(options.centerForce) ? Math.max(0.06, (options.centerForce as number) * 0.75) : 0.24
  const scalingRatio = Number.isFinite(options.repelForce) ? Math.max(1.2, (options.repelForce as number) * 1.05) : 2.8
  const edgeWeightInfluence = Number.isFinite(options.linkForce)
    ? Math.max(0, Math.min(0.86, (options.linkForce as number) * 0.9))
    : 0.5

  const spread = Math.sqrt(graph.order) * 5.8
  for (const nodeId of graph.nodes()) {
    const angle = stableNoise01(`${nodeId}-a`) * Math.PI * 2
    const r = Math.sqrt(stableNoise01(`${nodeId}-r`)) * spread
    graph.setNodeAttribute(nodeId, 'x', Math.cos(angle) * r)
    graph.setNodeAttribute(nodeId, 'y', Math.sin(angle) * r)
  }

  forceAtlas2.assign(graph, {
    iterations: 460,
    settings: {
      gravity,
      scalingRatio,
      strongGravityMode: false,
      barnesHutOptimize: true,
      barnesHutTheta: 0.5,
      slowDown: 1.5,
      edgeWeightInfluence,
      outboundAttractionDistribution: false,
      linLogMode: false,
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

  // Pull outer shell inward slightly to avoid hollow ring morphology.
  if (graph.order > 120) compactRadialCore(graph, 1.18)

  // Reduce spoke-like tails while preserving topology by tucking low-degree chains
  // closer to their local neighborhoods.
  if (graph.order > 80) {
    tuckLeafNodesToNeighbors(graph, 0.22, 1.6)
    softenDegreeTwoChains(graph, 0.22, 1)
    separateOverlaps(graph, { passes: 3, padding: 0.9 })
  }

  // Keep each component's internal span bounded before it is composed on the grid.
  normalizeLayoutSpan(graph, { minSpan: 300, maxSpan: 1400, multiplier: 45 })
}
