import { useLocale } from '../contexts/LocaleContext'

export default function DashboardPage() {
  const { t } = useLocale()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-surface-dark border border-border-dark rounded-xl p-5 card-glow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
            </div>
            <span className="text-sm text-slate-400">{t('dashboard.creditBalance')}</span>
          </div>
          <p className="text-2xl font-bold text-white">—</p>
          <p className="text-xs text-slate-500 mt-1">API integration pending</p>
        </div>
        <div className="bg-surface-dark border border-border-dark rounded-xl p-5 card-glow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">store</span>
            </div>
            <span className="text-sm text-slate-400">{t('dashboard.shopsCount')}</span>
          </div>
          <p className="text-2xl font-bold text-white">—</p>
          <p className="text-xs text-slate-500 mt-1">API integration pending</p>
        </div>
        <div className="bg-surface-dark border border-border-dark rounded-xl p-5 card-glow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">language</span>
            </div>
            <span className="text-sm text-slate-400">{t('dashboard.websiteStatus')}</span>
          </div>
          <p className="text-2xl font-bold text-white">—</p>
          <p className="text-xs text-slate-500 mt-1">API integration pending</p>
        </div>
      </div>
      <div className="bg-surface-dark border border-border-dark rounded-xl p-6 card-glow">
        <h2 className="text-lg font-semibold text-white mb-2">{t('dashboard.title')}</h2>
        <p className="text-slate-400 text-sm">
          Welcome. Stats and quick actions will appear here once backend endpoints are connected.
        </p>
      </div>
    </div>
  )
}
