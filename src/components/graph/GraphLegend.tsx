import { ENTITY_TYPE_LABELS, ENTITY_TYPE_COLORS } from '@/types/entity.ts'
import type { EntityType } from '@/types/entity.ts'

const ENTITY_TYPES = Object.keys(ENTITY_TYPE_LABELS) as EntityType[]

const STATUS_ITEMS = [
  { label: 'Баталгаажсан', style: 'border-b-2 border-slate-500', desc: 'Цөмцөг шугам' },
  { label: 'Магадлалтай', style: 'border-b-2 border-slate-400 opacity-80', desc: 'Хүнгэн шугам' },
  { label: 'Дүгнэсэн', style: 'border-b-2 border-dashed border-slate-300', desc: 'Тасархай шугам' },
  { label: 'Маргаантай', style: 'border-b-2 border-dotted border-slate-200', desc: 'Цэгцэлгэсэн шугам' },
]

export function GraphLegend() {
  return (
    <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3 z-10 max-w-48">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
        Субьектүүд
      </p>
      <div className="space-y-1 mb-3">
        {ENTITY_TYPES.slice(0, 6).map((type) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: ENTITY_TYPE_COLORS[type] }}
            />
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {ENTITY_TYPE_LABELS[type]}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
        Харилцаанууд
      </p>
      <div className="space-y-1.5">
        {STATUS_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-6 h-0 ${item.style}`} aria-hidden />
            <span className="text-xs text-slate-600 dark:text-slate-300">{item.label}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
        Зангилааны хэмжээ = ач холбогдол
      </p>
    </div>
  )
}
