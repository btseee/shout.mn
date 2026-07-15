import { create } from 'zustand'
import type { NodeType } from '@/types/node'
import type { RelationshipType, ConfidenceTier } from '@/types/edge'

interface FiltersState {
  selectedNodeTypes: NodeType[]
  selectedRelTypes: RelationshipType[]
  selectedConfidence: ConfidenceTier[]
  searchQuery: string
  toggleNodeType: (t: NodeType) => void
  toggleRelType: (t: RelationshipType) => void
  toggleConfidence: (c: ConfidenceTier) => void
  setSearchQuery: (q: string) => void
  reset: () => void
}

export const useFiltersStore = create<FiltersState>((set) => ({
  selectedNodeTypes: [],
  selectedRelTypes: [],
  selectedConfidence: [],
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
  setSearchQuery: (q) => set({ searchQuery: q }),
  reset: () => set({ selectedNodeTypes: [], selectedRelTypes: [], selectedConfidence: [], searchQuery: '' }),
}))
