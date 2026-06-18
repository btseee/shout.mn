import type { Entity } from '@/types/entity.ts'
import type { Relationship } from '@/types/relationship.ts'
import type { Source } from '@/types/source.ts'
import type { Evidence } from '@/types/evidence.ts'
import type { Investigation } from '@/types/investigation.ts'
import type { ChangelogEntry } from '@/types/changelog.ts'

const base = import.meta.env.BASE_URL.replace(/\/$/, '')

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`)
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
  return res.json() as Promise<T>
}

export const fetchEntities = () => fetchJson<Entity[]>('/data/entities.json')
export const fetchRelationships = () => fetchJson<Relationship[]>('/data/relationships.json')
export const fetchSources = () => fetchJson<Source[]>('/data/sources.json')
export const fetchEvidence = () => fetchJson<Evidence[]>('/data/evidence.json')
export const fetchInvestigations = () => fetchJson<Investigation[]>('/data/investigations.json')
export const fetchChangelog = () => fetchJson<ChangelogEntry[]>('/data/changelog.json')
