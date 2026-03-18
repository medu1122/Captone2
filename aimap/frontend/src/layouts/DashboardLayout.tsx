import { Link, Outlet, useLocation } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../contexts/LocaleContext'
import UserMenu from '../components/UserMenu'

const navItems = [
  { path: '/dashboard', labelKey: 'dashboard.title', adminOnly: false },
  { path: '/shops', labelKey: 'nav.shops', adminOnly: false },
  { path: '/admin/containers', labelKey: 'admin.containers', adminOnly: true },
]

export default function DashboardLayout() {
  const { t } = useLocale()
  const { user, logout, loading } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      <aside className="w-56 flex-shrink-0 border-r border-slate-300 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-300 flex items-center gap-3">
          <img src="/icons/logo-aimap.png" alt="AIMAP logo" className="h-12 w-auto" />
          <span className="font-bold text-lg text-slate-900">AIMAP</span>
        </div>
        <div className="flex-1 flex flex-col justify-between">
          <nav className="p-3 flex flex-col gap-0.5">
            {navItems.map(({ path, labelKey, adminOnly }) => {
              if (adminOnly && user?.role !== 'admin') return null
              const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path))
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-slate-100 text-slate-900 border-l-2 border-slate-400'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {t(labelKey)}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-slate-200 p-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">{t('dashboard.creditBalance')}</span>
                <span className="text-xs font-medium text-slate-800 tabular-nums">
                  {loading ? '…' : (user?.creditBalance ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-slate-300 bg-white flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-lg font-semibold text-slate-900 truncate">
            {location.pathname === '/profile'
              ? t('nav.profile')
              : location.pathname === '/shops/create'
                ? t('shops.createShop')
                : t(
                    navItems.find((i) => i.path === location.pathname || (i.path !== '/dashboard' && location.pathname.startsWith(i.path)))?.labelKey ?? 'dashboard.title'
                  )}
          </h1>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {user && <UserMenu user={user} onLogout={logout} />}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6 bg-slate-100">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
