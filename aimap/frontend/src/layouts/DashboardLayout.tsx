import { Link, Outlet, useLocation } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../contexts/LocaleContext'

const navItems = [
  { path: '/dashboard', labelKey: 'dashboard.title', icon: 'dashboard' },
  { path: '/shops', labelKey: 'nav.shops', icon: 'store' },
  { path: '/profile', labelKey: 'nav.profile', icon: 'person' },
  { path: '/credit', labelKey: 'nav.credit', icon: 'account_balance_wallet' },
  { path: '/assets', labelKey: 'nav.assets', icon: 'folder' },
  { path: '/pipeline', labelKey: 'nav.pipeline', icon: 'account_tree' },
]

export default function DashboardLayout() {
  const { t } = useLocale()
  const { user } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background-dark text-slate-100 flex">
      <aside className="w-56 flex-shrink-0 border-r border-border-dark bg-surface-dark/50 flex flex-col">
        <div className="p-4 border-b border-border-dark flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">auto_awesome</span>
          </div>
          <span className="font-bold text-lg text-white">AIMAP</span>
        </div>
        <nav className="p-3 flex-1 flex flex-col gap-1">
          {navItems.map(({ path, labelKey, icon }) => {
            const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path))
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{icon}</span>
                {t(labelKey)}
              </Link>
            )
          })}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border-dark bg-surface-dark/50 flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-lg font-semibold text-white truncate">
            {t(
              navItems.find((i) => i.path === location.pathname || (i.path !== '/dashboard' && location.pathname.startsWith(i.path)))?.labelKey ?? 'dashboard.title'
            )}
          </h1>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300 truncate max-w-[120px]">{user.name || user.email}</span>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-lg">person</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
