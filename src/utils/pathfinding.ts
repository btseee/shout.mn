import type Graph from 'graphology'
import { bidirectional } from 'graphology-shortest-path/unweighted'

export interface PathResult {
  entityIds: string[]
  relationshipIds: string[]
}

export function findShortestPath(graph: Graph, sourceId: string, targetId: string): PathResult | null {
  if (!graph.hasNode(sourceId) || !graph.hasNode(targetId)) return null
  if (sourceId === targetId) return { entityIds: [sourceId], relationshipIds: [] }

  try {
    const path = bidirectional(graph, sourceId, targetId)
    if (!path) return null

    const relationshipIds: string[] = []
    for (let i = 0; i < path.length - 1; i++) {
      const edges = graph.edges(path[i], path[i + 1])
      if (edges.length > 0) {
        relationshipIds.push(edges[0])
      }
    }

    return { entityIds: path, relationshipIds }
  } catch {
    return null
  }
}
