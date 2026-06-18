import { create } from 'zustand'

interface SelectionState {
  selectedNodeId: string | null
  selectedEdgeId: string | null
  pathEntityIds: string[]
  hopDepth: 1 | 2 | 3 | 'full'
  setSelectedNode: (id: string | null) => void
  setSelectedEdge: (id: string | null) => void
  setPath: (entityIds: string[]) => void
  setHopDepth: (depth: 1 | 2 | 3 | 'full') => void
  clearSelection: () => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedNodeId: null,
  selectedEdgeId: null,
  pathEntityIds: [],
  hopDepth: 1,
  setSelectedNode: (selectedNodeId) => set({ selectedNodeId, selectedEdgeId: null }),
  setSelectedEdge: (selectedEdgeId) => set({ selectedEdgeId, selectedNodeId: null }),
  setPath: (pathEntityIds) => set({ pathEntityIds }),
  setHopDepth: (hopDepth) => set({ hopDepth }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null, pathEntityIds: [] }),
}))
