import { create } from 'zustand'

interface SelectionState {
  selectedNodeId: string | null
  selectedEdgeId: string | null
  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void
  clearSelection: () => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedNodeId: null,
  selectedEdgeId: null,
  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),
}))
