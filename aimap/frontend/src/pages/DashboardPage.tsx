import { useLocale } from '../contexts/LocaleContext'

// Placeholder until API: active shops count, live websites count, activity rows, access rows
const activeShopsCount: number | null = null
const liveWebsitesCount: number | null = null
const activityLogRows: { action: string; time: string; detail: string }[] = []
const accessLogRows: { ip: string; time: string }[] = []

function formatCount(t: (key: string) => string, key: string, count: number | null): string {
  if (count === null) return '—'
  return t(key).replace('{count}', String(count))
}

export default function DashboardPage() {
  const { t } = useLocale()

  return (
    <div className="space-y-6">
      {/* Two large info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg border border-slate-300 flex items-center justify-center bg-slate-50">
              <span className="material-symbols-outlined text-slate-500 text-2xl">store</span>
            </div>
            <span className="text-sm font-medium text-slate-600">{t('dashboard.activeShops')}</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {formatCount(t, 'dashboard.activeShopsCount', activeShopsCount)}
          </p>
        </div>
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg border border-slate-300 flex items-center justify-center bg-slate-50">
              <span className="material-symbols-outlined text-slate-500 text-2xl">language</span>
            </div>
            <span className="text-sm font-medium text-slate-600">{t('dashboard.liveWebsites')}</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {formatCount(t, 'dashboard.liveWebsitesCount', liveWebsitesCount)}
          </p>
        </div>
      </div>

      {/* Activity log */}
      <div className="bg-white border border-slate-300 rounded-lg overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-900 px-6 py-4 border-b border-slate-200">
          {t('dashboard.activityLog')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 font-medium text-slate-700">{t('dashboard.activityLogAction')}</th>
                <th className="px-6 py-3 font-medium text-slate-700">{t('dashboard.activityLogTime')}</th>
                <th className="px-6 py-3 font-medium text-slate-700">{t('dashboard.activityLogDetail')}</th>
              </tr>
            </thead>
            <tbody>
              {activityLogRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    {t('dashboard.activityLogEmpty')}
                  </td>
                </tr>
              ) : (
                activityLogRows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-900">{row.action}</td>
                    <td className="px-6 py-3 text-slate-600">{row.time}</td>
                    <td className="px-6 py-3 text-slate-600">{row.detail}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Access log */}
      <div className="bg-white border border-slate-300 rounded-lg overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-900 px-6 py-4 border-b border-slate-200">
          {t('dashboard.accessLog')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 font-medium text-slate-700">{t('dashboard.accessLogIP')}</th>
                <th className="px-6 py-3 font-medium text-slate-700">{t('dashboard.accessLogTime')}</th>
              </tr>
            </thead>
            <tbody>
              {accessLogRows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-slate-500">
                    {t('dashboard.accessLogEmpty')}
                  </td>
                </tr>
              ) : (
                accessLogRows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-900 font-mono text-xs">{row.ip}</td>
                    <td className="px-6 py-3 text-slate-600">{row.time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
