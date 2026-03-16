import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../contexts/LocaleContext'
import UserMenu from '../components/UserMenu'

const shopNavItems = [
  { path: '', labelKey: 'shopDetail.nav.dashboard', icon: 'dashboard' },
  { path: 'image-bot', labelKey: 'shopDetail.nav.imageBot', icon: 'image' },
  { path: 'storage', labelKey: 'shopDetail.nav.storage', icon: 'folder' },
  { path: 'marketing', labelKey: 'shopDetail.nav.marketing', icon: 'campaign' },
  { path: 'pipeline', labelKey: 'shopDetail.nav.pipeline', icon: 'account_tree' },
]

export default function ShopDetailLayout() {
  const { t } = useLocale()
  const { user, logout } = useAuth()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()

  const basePath = `/shops/${id}`
  const pathname = location.pathname

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      <aside className="w-56 flex-shrink-0 border-r border-slate-300 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-300 flex items-center gap-3">
          <Link to="/shops" className="flex items-center gap-3 hover:opacity-90">
            <img src="/icons/logo-aimap.png" alt="AIMAP logo" className="h-12 w-auto" />
            <span className="font-bold text-lg text-slate-900">AIMAP</span>
          </Link>
        </div>
        <div className="flex-1 flex flex-col justify-between">
          <nav className="p-3 flex flex-col gap-0.5">
            {shopNavItems.map(({ path, labelKey, icon }) => {
              const itemPath = path ? `${basePath}/${path}` : basePath
              const active = pathname === itemPath || (path !== '' && pathname.startsWith(itemPath))
              return (
                <Link
                  key={path || 'dashboard'}
                  to={itemPath}
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
            {t('shopDetail.title')}
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
