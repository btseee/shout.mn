import { ExternalLink as ExternalLinkIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface ExternalLinkProps {
  href: string
  children: ReactNode
  className?: string
  showIcon?: boolean
}

export function ExternalLink({ href, children, className = '', showIcon = true }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline transition-colors ${className}`}
    >
      {children}
      {showIcon && <ExternalLinkIcon size={12} className="shrink-0" />}
    </a>
  )
}
