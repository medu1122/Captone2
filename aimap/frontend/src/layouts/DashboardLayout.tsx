import { Link, Outlet, useLocation } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../contexts/LocaleContext'

const navItems = [
  { path: '/dashboard', labelKey: 'dashboard.title', icon: 'dashboard' },
  { path: '/shops', labelKey: 'nav.shops', icon: 'store' },
]

export default function DashboardLayout() {
  const { t } = useLocale()
  const { user } = useAuth()
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
            {navItems.map(({ path, labelKey, icon }) => {
              const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path))
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-slate-100 text-slate-900 border-l-2 border-slate-400 pl-[10px]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl text-slate-500">{icon}</span>
                  {t(labelKey)}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-slate-200 p-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">{t('dashboard.creditBalance')}</span>
                <span className="text-xs text-slate-500">—</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-slate-300 bg-white flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-lg font-semibold text-slate-900 truncate">
            {t(
              navItems.find((i) => i.path === location.pathname || (i.path !== '/dashboard' && location.pathname.startsWith(i.path)))?.labelKey ?? 'dashboard.title'
            )}
          </h1>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 truncate max-w-[120px]">{user.name || user.email}</span>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-300" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-300 text-slate-600 text-sm font-medium">
                    {user.name?.[0] ?? user.email?.[0] ?? '?'}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6 bg-slate-100">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
