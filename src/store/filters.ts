import { create } from 'zustand'
import type { NodeType } from '@/types/node'
import type { RelationshipType, ConfidenceTier } from '@/types/edge'
import type { PersonSubtype } from '@/types/node'

interface FiltersState {
  selectedNodeTypes: NodeType[]
  selectedRelTypes: RelationshipType[]
  selectedConfidence: ConfidenceTier[]
  selectedSubtypes: PersonSubtype[]
  minConnections: number
  searchQuery: string
  toggleNodeType: (t: NodeType) => void
  toggleRelType: (t: RelationshipType) => void
  toggleConfidence: (c: ConfidenceTier) => void
  toggleSubtype: (s: PersonSubtype) => void
  setRelTypes: (t: RelationshipType[]) => void
  setSubtypes: (s: PersonSubtype[]) => void
  setConfidence: (c: ConfidenceTier[]) => void
  setMinConnections: (count: number) => void
  setSearchQuery: (q: string) => void
  reset: () => void
}

export const useFiltersStore = create<FiltersState>((set) => ({
  selectedNodeTypes: [],
  selectedRelTypes: [],
  selectedConfidence: [],
  selectedSubtypes: [],
  minConnections: 0,
  searchQuery: '',
  toggleNodeType: (t) => set(s => ({
    selectedNodeTypes: s.selectedNodeTypes.includes(t)
      ? s.selectedNodeTypes.filter(x => x !== t)
      : [...s.selectedNodeTypes, t]
  })),
  toggleRelType: (t) => set(s => ({
    selectedRelTypes: s.selectedRelTypes.includes(t)
      ? s.selectedRelTypes.filter(x => x !== t)
      : [...s.selectedRelTypes, t]
  })),
  toggleConfidence: (c) => set(s => ({
    selectedConfidence: s.selectedConfidence.includes(c)
      ? s.selectedConfidence.filter(x => x !== c)
      : [...s.selectedConfidence, c]
  })),
  toggleSubtype: (s2) => set(s => ({
    selectedSubtypes: s.selectedSubtypes.includes(s2)
      ? s.selectedSubtypes.filter(x => x !== s2)
      : [...s.selectedSubtypes, s2]
  })),
  setRelTypes: (t) => set({ selectedRelTypes: t }),
  setSubtypes: (s) => set({ selectedSubtypes: s }),
  setConfidence: (c) => set({ selectedConfidence: c }),
  setMinConnections: (minConnections) => set({ minConnections }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  reset: () => set({ selectedNodeTypes: [], selectedRelTypes: [], selectedConfidence: [], selectedSubtypes: [], minConnections: 0, searchQuery: '' }),
}))
