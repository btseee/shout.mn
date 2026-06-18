import { t } from '@/i18n/index.ts'

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <p className="text-xs text-slate-400 dark:text-slate-500">{t.footer.copyright}</p>
        <a
          href="https://github.com/btseee/shout.mn"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          {t.footer.sourceCode} ↗
        </a>
      </div>
    </footer>
  )
}
