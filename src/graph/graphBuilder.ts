import Graph from 'graphology'
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
    const size = 5 + (entity.importance / 100) * 20
    graph.addNode(entity.id, {
      label: entity.name,
      color,
      size,
      type: entity.type,
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

    const edgeColor = getEdgeColor(rel.status)
    const edgeSize = 1 + (rel.strength / 100) * 4

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

export function getEdgeColor(status: RelationshipStatus): string {
  const colors: Record<RelationshipStatus, string> = {
    confirmed: '#64748b',
    probable: '#94a3b8',
    inferred: '#cbd5e1',
    disputed: '#e2e8f0',
  }
  return colors[status]
}

export function applyCircularLayout(graph: Graph): void {
  const nodes = graph.nodes()
  const count = nodes.length
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / count
    const radius = Math.min(300, 50 + count * 15)
    graph.setNodeAttribute(node, 'x', radius * Math.cos(angle))
    graph.setNodeAttribute(node, 'y', radius * Math.sin(angle))
  })
}
