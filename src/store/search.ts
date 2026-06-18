import { create } from 'zustand'

interface SearchState {
  query: string
  highlightedEntityId: string | null
  setQuery: (q: string) => void
  setHighlightedEntity: (id: string | null) => void
  clearSearch: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  highlightedEntityId: null,
  setQuery: (query) => set({ query }),
  setHighlightedEntity: (highlightedEntityId) => set({ highlightedEntityId }),
  clearSearch: () => set({ query: '', highlightedEntityId: null }),
}))
