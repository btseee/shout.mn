import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { t } from '@/i18n/index.ts'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="mb-4 text-slate-300 dark:text-slate-600">
        {icon ?? <AlertCircle size={48} />}
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <EmptyState
      icon={<AlertCircle size={48} className="text-red-400" />}
      title={t.common.errorTitle}
      description={message ?? t.common.errorDesc}
    />
  )
}
