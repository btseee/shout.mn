import { readFileSync, writeFileSync } from 'fs'

interface OldEntity {
  id: string; name: string; type: string; description: string
  aliases: string[]; tags: string[]; importance: number; confidence: number
  sourceIds: string[]; createdAt: string; updatedAt: string
}

interface OldRelationship {
  id: string; sourceEntityId: string; targetEntityId: string
  relationshipType: string; description: string; strength: number
  confidence: number; status: string; evidenceIds: string[]
  sourceIds: string[]; startDate: string; endDate: string
  createdAt: string; updatedAt: string
}

interface OldEvidence {
  id: string; sourceId: string; entityIds: string[]; relationshipIds: string[]
  claim: string; quote: string; pageNumber: string; notes: string
}

interface OldSource {
  id: string; title: string; publisher: string; url: string
  archiveUrl: string; publishedAt: string; retrievedAt: string
  reliabilityNotes: string; tags: string[]
}

const ENTITY_TYPE_MAP: Record<string, string> = {
  person: 'person',
  company: 'company',
  government_agency: 'government_body',
  media: 'media_outlet',
}

const PERSON_SUBTYPE_MAP: Record<string, string> = {
  president: 'politician',
  'prime-minister': 'politician',
  mp: 'politician',
  speaker: 'politician',
  minister: 'politician',
  governor: 'politician',
  judge: 'civil_servant',
  prosecutor: 'civil_servant',
  business: 'business_person',
  'first-lady': 'public_figure',
  family: 'public_figure',
}

const REL_TYPE_MAP: Record<string, string> = {
  spouse: 'family',
  parent: 'family',
  ownership: 'business_ownership',
  employment: 'employment',
  colleague: 'employment',
  appointment: 'appointment',
  board_membership: 'board_membership',
  procurement_contract: 'contract_awarded',
  donation: 'financial_transaction',
  investment: 'financial_transaction',
  partnership: 'co_mention',
  organizational_link: 'co_mention',
  party_member: 'political_affiliation',
  political_affiliation: 'political_affiliation',
}

function confidenceTier(n: number): 'documented' | 'reported' | 'alleged' {
  if (n >= 80) return 'documented'
  if (n >= 50) return 'reported'
  return 'alleged'
}

function main() {
  const oldEntities: OldEntity[] = JSON.parse(readFileSync('public/data/entities.json', 'utf-8'))
  const oldRels: OldRelationship[] = JSON.parse(readFileSync('public/data/relationships.json', 'utf-8'))
  const oldEvidence: OldEvidence[] = JSON.parse(readFileSync('public/data/evidence.json', 'utf-8'))
  const oldSources: OldSource[] = JSON.parse(readFileSync('public/data/sources.json', 'utf-8'))

  const evByRel = new Map<string, OldEvidence[]>()
  for (const ev of oldEvidence) {
    for (const relId of ev.relationshipIds) {
      if (!evByRel.has(relId)) evByRel.set(relId, [])
      evByRel.get(relId)!.push(ev)
    }
  }

  const srcById = new Map(oldSources.map(s => [s.id, s]))

  const nodes = oldEntities
    .filter(e => ENTITY_TYPE_MAP[e.type])
    .map(e => ({
      id: e.id,
      name: e.name,
      type: ENTITY_TYPE_MAP[e.type],
      subtype: e.type === 'person'
        ? (e.tags.find(t => PERSON_SUBTYPE_MAP[t]) ?? 'public_figure')
        : undefined,
      role_title: e.description.slice(0, 80),
      active_dates: undefined as { from: string; to?: string } | undefined,
      description: e.description,
      aliases: e.aliases.length ? e.aliases : undefined,
      importance: e.importance,
    }))

  const nodeIds = new Set(nodes.map(n => n.id))
  const edges = oldRels
    .filter(r => nodeIds.has(r.sourceEntityId) && nodeIds.has(r.targetEntityId))
    .filter(r => REL_TYPE_MAP[r.relationshipType])
    .map(r => {
      const evidences = (evByRel.get(r.id) ?? []).map(ev => {
        const src = srcById.get(ev.sourceId)
        return {
          source_name: src?.title ?? ev.sourceId,
          url: src?.url ?? '',
          date_accessed: src?.retrievedAt ?? new Date().toISOString().slice(0, 10),
          document_type: 'news_article' as const,
          note: ev.claim.slice(0, 120),
        }
      })
      if (evidences.length === 0) {
        evidences.push({
          source_name: 'Unknown',
          url: '',
          date_accessed: new Date().toISOString().slice(0, 10),
          document_type: 'other',
          note: r.description.slice(0, 120),
        })
      }
      return {
        id: r.id,
        from: r.sourceEntityId,
        to: r.targetEntityId,
        relationship_type: REL_TYPE_MAP[r.relationshipType],
        confidence: confidenceTier(r.confidence),
        evidence: evidences,
        date_range: (r.startDate || r.endDate)
          ? { from: r.startDate || undefined, to: r.endDate || undefined }
          : undefined,
      }
    })

  const sources = oldSources.map(s => ({
    id: s.id,
    title: s.title,
    url: s.url,
    document_type: 'news_article' as const,
    publisher: s.publisher,
    date_accessed: s.retrievedAt,
    reliability_notes: s.reliabilityNotes,
    tags: s.tags?.length ? s.tags : undefined,
  }))

  writeFileSync('public/data/nodes.json', JSON.stringify(nodes, null, 2))
  writeFileSync('public/data/edges.json', JSON.stringify(edges, null, 2))
  writeFileSync('public/data/sources.json', JSON.stringify(sources, null, 2))

  console.log(`Migrated: ${nodes.length} nodes, ${edges.length} edges, ${sources.length} sources`)
}

main()
