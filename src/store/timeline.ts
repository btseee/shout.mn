import { create } from 'zustand'

interface TimelineState {
  activeDate: string          // ISO date string '' = today/all
  dateRangeStart: string
  dateRangeEnd: string
  isPlaying: boolean
  playbackSpeed: number       // multiplier
  setActiveDate: (date: string) => void
  setDateRange: (start: string, end: string) => void
  setPlaying: (v: boolean) => void
  setPlaybackSpeed: (speed: number) => void
  reset: () => void
}

export const useTimelineStore = create<TimelineState>((set) => ({
  activeDate: '',
  dateRangeStart: '2015-01-01',
  dateRangeEnd: new Date().toISOString().slice(0, 10),
  isPlaying: false,
  playbackSpeed: 1,
  setActiveDate: (activeDate) => set({ activeDate }),
  setDateRange: (dateRangeStart, dateRangeEnd) => set({ dateRangeStart, dateRangeEnd }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  reset: () => set({ activeDate: '', isPlaying: false }),
}))
