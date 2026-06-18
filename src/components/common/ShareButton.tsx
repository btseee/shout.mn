import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { copyToClipboard } from '@/utils/export.ts'
import { t } from '@/i18n/index.ts'

export function ShareButton() {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    await copyToClipboard(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      aria-label={t.common.copyLinkLabel}
    >
      {copied ? (
        <>
          <Check size={14} className="text-green-600" />
          {t.common.copied}
        </>
      ) : (
        <>
          <Share2 size={14} />
          {t.common.share}
        </>
      )}
    </button>
  )
}
