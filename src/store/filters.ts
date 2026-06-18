import { create } from 'zustand'
import type { EntityType } from '@/types/entity.ts'
import type { RelationshipStatus } from '@/types/relationship.ts'

interface FiltersState {
  entityTypes: EntityType[]
  relationshipStatuses: RelationshipStatus[]
  minConfidence: number
  minStrength: number
  minImportance: number
  dateFrom: string
  dateTo: string
  tags: string[]
  setEntityTypes: (types: EntityType[]) => void
  setRelationshipStatuses: (statuses: RelationshipStatus[]) => void
  setMinConfidence: (v: number) => void
  setMinStrength: (v: number) => void
  setMinImportance: (v: number) => void
  setDateRange: (from: string, to: string) => void
  setTags: (tags: string[]) => void
  resetFilters: () => void
}

const defaultFilters = {
  entityTypes: [] as EntityType[],
  relationshipStatuses: [] as RelationshipStatus[],
  minConfidence: 0,
  minStrength: 0,
  minImportance: 60,
  dateFrom: '',
  dateTo: '',
  tags: [] as string[],
}

export const useFiltersStore = create<FiltersState>((set) => ({
  ...defaultFilters,
  setEntityTypes: (entityTypes) => set({ entityTypes }),
  setRelationshipStatuses: (relationshipStatuses) => set({ relationshipStatuses }),
  setMinConfidence: (minConfidence) => set({ minConfidence }),
  setMinStrength: (minStrength) => set({ minStrength }),
  setMinImportance: (minImportance) => set({ minImportance }),
  setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo }),
  setTags: (tags) => set({ tags }),
  resetFilters: () => set(defaultFilters),
}))
