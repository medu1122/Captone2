import { useLocale } from '../contexts/LocaleContext'

export default function DashboardPage() {
  const { t } = useLocale()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-300 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center bg-slate-50">
              <span className="material-symbols-outlined text-slate-500 text-xl">account_balance_wallet</span>
            </div>
            <span className="text-sm text-slate-600">{t('dashboard.creditBalance')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">—</p>
          <p className="text-xs text-slate-500 mt-1">API integration pending</p>
        </div>
        <div className="bg-white border border-slate-300 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center bg-slate-50">
              <span className="material-symbols-outlined text-slate-500 text-xl">store</span>
            </div>
            <span className="text-sm text-slate-600">{t('dashboard.shopsCount')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">—</p>
          <p className="text-xs text-slate-500 mt-1">API integration pending</p>
        </div>
        <div className="bg-white border border-slate-300 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center bg-slate-50">
              <span className="material-symbols-outlined text-slate-500 text-xl">language</span>
            </div>
            <span className="text-sm text-slate-600">{t('dashboard.websiteStatus')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">—</p>
          <p className="text-xs text-slate-500 mt-1">API integration pending</p>
        </div>
      </div>
      <div className="bg-white border border-slate-300 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">{t('dashboard.title')}</h2>
        <p className="text-slate-600 text-sm">
          Welcome. Stats and quick actions will appear here once backend endpoints are connected.
        </p>
      </div>
    </div>
  )
}
