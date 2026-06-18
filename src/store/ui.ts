import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  darkMode: boolean
  sidebarOpen: boolean
  graphPanelOpen: boolean
  toggleDarkMode: () => void
  setSidebarOpen: (v: boolean) => void
  setGraphPanelOpen: (v: boolean) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      darkMode: false,
      sidebarOpen: false,
      graphPanelOpen: false,
      toggleDarkMode: () =>
        set((state) => {
          const next = !state.darkMode
          document.documentElement.classList.toggle('dark', next)
          return { darkMode: next }
        }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setGraphPanelOpen: (graphPanelOpen) => set({ graphPanelOpen }),
    }),
    {
      name: 'shout-ui',
      onRehydrateStorage: () => (state) => {
        if (state?.darkMode) {
          document.documentElement.classList.add('dark')
        }
      },
    },
  ),
)
