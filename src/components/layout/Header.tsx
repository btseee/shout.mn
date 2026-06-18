import { Link, useRouter } from '@tanstack/react-router'
import { Search, Network, FileText, Clock, Sun, Moon, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useUiStore } from '@/store/ui.ts'

export function Header() {
  const { darkMode, toggleDarkMode } = useUiStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  function isActive(path: string) {
    return router.state.location.pathname === path
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-xl text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
          >
            <span className="text-slate-900 dark:text-white">shout</span>
            <span className="text-rose-600 dark:text-rose-400">.mn</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            <NavLink to="/graph" active={isActive('/graph')} icon={<Network size={16} />}>Graph</NavLink>
            <NavLink to="/search" active={isActive('/search')} icon={<Search size={16} />}>Search</NavLink>
            <NavLink to="/changes" active={isActive('/changes')} icon={<Clock size={16} />}>Updates</NavLink>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 space-y-1">
          <MobileNavLink to="/graph" onClick={() => setMobileOpen(false)}>
            <Network size={16} /> Graph
          </MobileNavLink>
          <MobileNavLink to="/search" onClick={() => setMobileOpen(false)}>
            <Search size={16} /> Search
          </MobileNavLink>
          <MobileNavLink to="/changes" onClick={() => setMobileOpen(false)}>
            <Clock size={16} /> Updates
          </MobileNavLink>
          <MobileNavLink to="/about" onClick={() => setMobileOpen(false)}>
            <FileText size={16} /> About
          </MobileNavLink>
        </div>
      )}
    </header>
  )
}

function NavLink({
  to,
  active,
  icon,
  children,
}: {
  to: string
  active: boolean
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      {icon}
      {children}
    </Link>
  )
}

function MobileNavLink({
  to,
  onClick,
  children,
}: {
  to: string
  onClick: () => void
  children: React.ReactNode
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
