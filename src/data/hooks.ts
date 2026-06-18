import { useQuery } from '@tanstack/react-query'
import {
  fetchEntities,
  fetchRelationships,
  fetchSources,
  fetchEvidence,
  fetchInvestigations,
  fetchChangelog,
} from './loaders.ts'

export const QUERY_KEYS = {
  entities: ['entities'] as const,
  relationships: ['relationships'] as const,
  sources: ['sources'] as const,
  evidence: ['evidence'] as const,
  investigations: ['investigations'] as const,
  changelog: ['changelog'] as const,
}

export function useEntities() {
  return useQuery({ queryKey: QUERY_KEYS.entities, queryFn: fetchEntities, staleTime: Infinity })
}

export function useRelationships() {
  return useQuery({ queryKey: QUERY_KEYS.relationships, queryFn: fetchRelationships, staleTime: Infinity })
}

export function useSources() {
  return useQuery({ queryKey: QUERY_KEYS.sources, queryFn: fetchSources, staleTime: Infinity })
}

export function useEvidence() {
  return useQuery({ queryKey: QUERY_KEYS.evidence, queryFn: fetchEvidence, staleTime: Infinity })
}

export function useInvestigations() {
  return useQuery({ queryKey: QUERY_KEYS.investigations, queryFn: fetchInvestigations, staleTime: Infinity })
}

export function useChangelog() {
  return useQuery({ queryKey: QUERY_KEYS.changelog, queryFn: fetchChangelog, staleTime: Infinity })
}

export function useEntity(id: string) {
  const { data: entities, ...rest } = useEntities()
  return { data: entities?.find((e) => e.id === id), ...rest }
}

export function useRelationship(id: string) {
  const { data: relationships, ...rest } = useRelationships()
  return { data: relationships?.find((r) => r.id === id), ...rest }
}

export function useSource(id: string) {
  const { data: sources, ...rest } = useSources()
  return { data: sources?.find((s) => s.id === id), ...rest }
}

export function useInvestigation(id: string) {
  const { data: investigations, ...rest } = useInvestigations()
  return { data: investigations?.find((i) => i.id === id), ...rest }
}
