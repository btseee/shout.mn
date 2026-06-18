import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: number
  className?: string
  label?: string
}

export function LoadingSpinner({ size = 24, className = '', label = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`} role="status" aria-label={label}>
      <Loader2 size={size} className="animate-spin text-slate-400" />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-64">
      <LoadingSpinner size={32} />
    </div>
  )
}
