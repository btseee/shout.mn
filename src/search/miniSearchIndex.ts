import MiniSearch from 'minisearch'
import type { Entity } from '@/types/entity.ts'
import type { Relationship } from '@/types/relationship.ts'
import type { Source } from '@/types/source.ts'

export interface SearchResult {
  id: string
  kind: 'entity' | 'relationship' | 'source'
  score: number
  label: string
  description: string
}

// Flattened document types for indexing
interface EntityDoc { id: string; name: string; description: string; aliases: string; tags: string }
interface RelDoc { id: string; description: string; relationshipType: string }
interface SourceDoc { id: string; title: string; publisher: string; tags: string }

interface SearchIndexes {
  entities: MiniSearch<EntityDoc>
  relationships: MiniSearch<RelDoc>
  sources: MiniSearch<SourceDoc>
}

// Cached state
let cachedIndexes: SearchIndexes | null = null

export function buildSearchIndex(
  entities: Entity[],
  relationships: Relationship[],
  sources: Source[],
): SearchIndexes {
  const entityIndex = new MiniSearch<EntityDoc>({
    fields: ['name', 'description', 'aliases', 'tags'],
    storeFields: ['id', 'name', 'description'],
    searchOptions: { fuzzy: 0.2, prefix: true, boost: { name: 2 } },
  })
  entityIndex.addAll(entities.map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description,
    aliases: e.aliases.join(' '),
    tags: e.tags.join(' '),
  })))

  const relationshipIndex = new MiniSearch<RelDoc>({
    fields: ['description', 'relationshipType'],
    storeFields: ['id', 'description', 'relationshipType'],
    searchOptions: { fuzzy: 0.2, prefix: true },
  })
  relationshipIndex.addAll(relationships.map((r) => ({
    id: r.id,
    description: r.description,
    relationshipType: r.relationshipType,
  })))

  const sourceIndex = new MiniSearch<SourceDoc>({
    fields: ['title', 'publisher', 'tags'],
    storeFields: ['id', 'title', 'publisher'],
    searchOptions: { fuzzy: 0.2, prefix: true, boost: { title: 2 } },
  })
  sourceIndex.addAll(sources.map((s) => ({
    id: s.id,
    title: s.title,
    publisher: s.publisher,
    tags: s.tags.join(' '),
  })))

  cachedIndexes = { entities: entityIndex, relationships: relationshipIndex, sources: sourceIndex }
  return cachedIndexes
}

export function searchAll(
  indexes: SearchIndexes,
  query: string,
  limit = 5,
): { entities: SearchResult[]; relationships: SearchResult[]; sources: SearchResult[] } {
  if (!query.trim()) return { entities: [], relationships: [], sources: [] }

  const entities: SearchResult[] = indexes.entities.search(query).slice(0, limit).map((r) => ({
    id: r.id as string,
    kind: 'entity',
    score: r.score,
    label: r.name as string,
    description: (r.description as string | undefined) ?? '',
  }))

  const relationships: SearchResult[] = indexes.relationships.search(query).slice(0, limit).map((r) => ({
    id: r.id as string,
    kind: 'relationship',
    score: r.score,
    label: (r.relationshipType as string).replace(/_/g, ' '),
    description: (r.description as string | undefined) ?? '',
  }))

  const sources: SearchResult[] = indexes.sources.search(query).slice(0, limit).map((r) => ({
    id: r.id as string,
    kind: 'source',
    score: r.score,
    label: r.title as string,
    description: (r.publisher as string | undefined) ?? '',
  }))

  return { entities, relationships, sources }
}
