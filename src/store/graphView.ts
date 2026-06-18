import { create } from 'zustand'

type LayoutMode = 'force' | 'circular'

interface GraphViewState {
  layoutMode: LayoutMode
  clusterMode: boolean
  showFilters: boolean
  showLegend: boolean
  setLayoutMode: (mode: LayoutMode) => void
  setClusterMode: (v: boolean) => void
  setShowFilters: (v: boolean) => void
  setShowLegend: (v: boolean) => void
}

export const useGraphViewStore = create<GraphViewState>((set) => ({
  layoutMode: 'force',
  clusterMode: false,
  showFilters: false,
  showLegend: true,
  setLayoutMode: (layoutMode) => set({ layoutMode }),
  setClusterMode: (clusterMode) => set({ clusterMode }),
  setShowFilters: (showFilters) => set({ showFilters }),
  setShowLegend: (showLegend) => set({ showLegend }),
}))
