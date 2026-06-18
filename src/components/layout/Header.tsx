import { Link, useRouter } from '@tanstack/react-router'
import { Search, Network, Clock, Sun, Moon, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useUiStore } from '@/store/ui.ts'
import { t } from '@/i18n/index.ts'

export function Header() {
  const { darkMode, toggleDarkMode } = useUiStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const path = router.state.location.pathname

  function close() { setMobileOpen(false) }

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        {t.nav.skipContent}
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="font-bold text-xl flex items-center gap-0.5">
            <span className="text-slate-900 dark:text-white">shout</span>
            <span className="text-rose-600 dark:text-rose-400">.mn</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Үндсэн навигаци">
            <NavLink to="/" active={path === '/'} icon={<Network size={15} />}>{t.nav.graph}</NavLink>
            <NavLink to="/search" active={path === '/search'} icon={<Search size={15} />}>{t.nav.search}</NavLink>
            <NavLink to="/changes" active={path === '/changes'} icon={<Clock size={15} />}>{t.nav.updates}</NavLink>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleDarkMode}
              aria-label={darkMode ? t.nav.toLight : t.nav.toDark}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button
              className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? t.nav.closeMenu : t.nav.openMenu}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 space-y-0.5">
          <MobileNavLink to="/" onClick={close}><Network size={15} /> {t.nav.graph}</MobileNavLink>
          <MobileNavLink to="/search" onClick={close}><Search size={15} /> {t.nav.search}</MobileNavLink>
          <MobileNavLink to="/changes" onClick={close}><Clock size={15} /> {t.nav.updates}</MobileNavLink>
        </div>
      )}
    </header>
  )
}

function NavLink({
  to, active, icon, children,
}: {
  to: string; active: boolean; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      {icon}{children}
    </Link>
  )
}

function MobileNavLink({
  to, onClick, children,
}: {
  to: string; onClick: () => void; children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      {children}
    </Link>
  )
}
