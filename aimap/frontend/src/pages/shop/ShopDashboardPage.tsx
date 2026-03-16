import { useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'

export default function ShopDashboardPage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-6">
      <p className="text-slate-600">
        {t('shopDetail.dashboardIntro')} <code className="text-xs bg-slate-200 px-1 rounded">{id}</code>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <span className="text-sm font-medium text-slate-600">{t('shopDetail.stats.images')}</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">—</p>
        </div>
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <span className="text-sm font-medium text-slate-600">{t('shopDetail.stats.content')}</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">—</p>
        </div>
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <span className="text-sm font-medium text-slate-600">{t('shopDetail.stats.siteStatus')}</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">—</p>
        </div>
      </div>
    </div>
  )
}
