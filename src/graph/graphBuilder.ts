import Graph from 'graphology'
import circular from 'graphology-layout/circular'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import type { Entity } from '@/types/entity.ts'
import type { Relationship } from '@/types/relationship.ts'
import { ENTITY_TYPE_COLORS } from '@/types/entity.ts'
import type { EntityType } from '@/types/entity.ts'
import type { RelationshipStatus } from '@/types/relationship.ts'

export interface GraphFilters {
  entityTypes: EntityType[]
  relationshipStatuses: RelationshipStatus[]
  minConfidence: number
  minStrength: number
}

export function buildGraph(
  entities: Entity[],
  relationships: Relationship[],
  activeDate?: string,
): Graph {
  const graph = new Graph({ type: 'undirected', multi: false })

  for (const entity of entities) {
    const color = ENTITY_TYPE_COLORS[entity.type] ?? '#64748b'
    // Size: min 4px (backbench MP) to 28px (president)
    const size = 4 + Math.pow(entity.importance / 100, 1.5) * 24
    // Only render label inline for important nodes; small nodes get label on hover only
    const labelColor = entity.importance >= 70 ? '#e2e8f0' : '#94a3b8'
    graph.addNode(entity.id, {
      label: entity.name,
      color,
      size,
      labelColor,
      entityType: entity.type,
      importance: entity.importance,
      confidence: entity.confidence,
    })
  }

  for (const rel of relationships) {
    if (!graph.hasNode(rel.sourceEntityId) || !graph.hasNode(rel.targetEntityId)) continue
    if (rel.sourceEntityId === rel.targetEntityId) continue

    // Timeline filtering
    if (activeDate) {
      if (rel.startDate && rel.startDate > activeDate) continue
      if (rel.endDate && rel.endDate < activeDate) continue
    }

    const edgeColor = getEdgeColor(rel.status, rel.relationshipType)
    const edgeSize = getEdgeSize(rel.strength, rel.relationshipType)

    const edgeId = `${rel.sourceEntityId}--${rel.targetEntityId}`
    if (!graph.hasEdge(edgeId)) {
      graph.addEdgeWithKey(edgeId, rel.sourceEntityId, rel.targetEntityId, {
        label: rel.relationshipType.replace(/_/g, ' '),
        color: edgeColor,
        size: edgeSize,
        status: rel.status,
        confidence: rel.confidence,
        strength: rel.strength,
        relationshipId: rel.id,
      })
    }
  }

  return graph
}

// Bulk structural edges (employment/party) are thin and muted
const STRUCTURAL_TYPES = new Set(['employment', 'party_member'])

export function getEdgeColor(status: RelationshipStatus, type?: string): string {
  if (type && STRUCTURAL_TYPES.has(type)) return '#334155' // very muted
  const colors: Record<RelationshipStatus, string> = {
    confirmed: '#475569',
    probable: '#64748b',
    inferred: '#94a3b8',
    disputed: '#cbd5e1',
  }
  return colors[status]
}

export function getEdgeSize(strength: number, type?: string): number {
  if (type && STRUCTURAL_TYPES.has(type)) return 0.5 // very thin
  return 0.8 + (strength / 100) * 3.5
}

export function applyForceLayout(graph: Graph): void {
  if (graph.order === 0) return
  // Seed positions with circular so ForceAtlas2 has a clean start
  circular.assign(graph)
  // Run ForceAtlas2 synchronously for a stable result
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
}

/** @deprecated Use applyForceLayout */
export function applyCircularLayout(graph: Graph): void {
  applyForceLayout(graph)
}
