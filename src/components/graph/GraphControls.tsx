import { ZoomIn, ZoomOut, RotateCcw, Filter, Map } from 'lucide-react'
import { t } from '@/i18n/index.ts'

interface GraphControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onToggleFilters: () => void
  onToggleLegend: () => void
  showLegend: boolean
  showFilters: boolean
}

export function GraphControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onToggleFilters,
  onToggleLegend,
  showLegend,
  showFilters,
}: GraphControlsProps) {
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-10">
      <ControlButton onClick={onZoomIn} label={t.graph.zoomIn}>
        <ZoomIn size={16} />
      </ControlButton>
      <ControlButton onClick={onZoomOut} label={t.graph.zoomOut}>
        <ZoomOut size={16} />
      </ControlButton>
      <ControlButton onClick={onReset} label={t.graph.reset}>
        <RotateCcw size={16} />
      </ControlButton>
      <div className="h-px bg-slate-200 dark:bg-slate-700 my-0.5" />
      <ControlButton onClick={onToggleFilters} label={t.graph.toggleFilters} active={showFilters}>
        <Filter size={16} />
      </ControlButton>
      <ControlButton onClick={onToggleLegend} label={t.graph.toggleLegend} active={showLegend}>
        <Map size={16} />
      </ControlButton>
    </div>
  )
}

function ControlButton({
  onClick,
  label,
  active,
  children,
}: {
  onClick: () => void
  label: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-8 h-8 flex items-center justify-center rounded-lg shadow-sm border transition-colors ${
        active
          ? 'bg-rose-600 text-white border-rose-600'
          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  )
}
