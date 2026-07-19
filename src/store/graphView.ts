import { create } from 'zustand'

type LayoutMode = 'force' | 'circular'

interface GraphViewState {
  layoutMode: LayoutMode
  clusterMode: boolean
  showFilters: boolean
  showLegend: boolean
  showArrows: boolean
  textFadeThreshold: number
  nodeSizeScale: number
  edgeSizeScale: number
  centerForce: number
  repelForce: number
  linkForce: number
  setLayoutMode: (mode: LayoutMode) => void
  setClusterMode: (v: boolean) => void
  setShowFilters: (v: boolean) => void
  setShowLegend: (v: boolean) => void
  setShowArrows: (v: boolean) => void
  setTextFadeThreshold: (v: number) => void
  setNodeSizeScale: (v: number) => void
  setEdgeSizeScale: (v: number) => void
  setCenterForce: (v: number) => void
  setRepelForce: (v: number) => void
  setLinkForce: (v: number) => void
}

export const useGraphViewStore = create<GraphViewState>((set) => ({
  layoutMode: 'force',
  clusterMode: false,
  showFilters: true,
  showLegend: false,
  showArrows: false,
  textFadeThreshold: 1000,
  nodeSizeScale: 0.3,
  edgeSizeScale: 0.34,
  // Obsidian-like baseline: denser center with controlled spread.
  centerForce: 0.62,
  repelForce: 1.8,
  linkForce: 0.56,
  setLayoutMode: (layoutMode) => set({ layoutMode }),
  setClusterMode: (clusterMode) => set({ clusterMode }),
  setShowFilters: (showFilters) => set({ showFilters }),
  setShowLegend: (showLegend) => set({ showLegend }),
  setShowArrows: (showArrows) => set({ showArrows }),
  setTextFadeThreshold: (textFadeThreshold) => set({ textFadeThreshold }),
  setNodeSizeScale: (nodeSizeScale) => set({ nodeSizeScale }),
  setEdgeSizeScale: (edgeSizeScale) => set({ edgeSizeScale }),
  setCenterForce: (centerForce) => set({ centerForce }),
  setRepelForce: (repelForce) => set({ repelForce }),
  setLinkForce: (linkForce) => set({ linkForce }),
}))
