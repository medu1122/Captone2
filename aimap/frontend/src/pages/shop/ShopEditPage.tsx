import { Link, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'

export default function ShopEditPage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to={`/shops/${id}`}
          className="text-slate-600 hover:text-slate-900 text-sm font-medium flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          {t('shops.backToList')}
        </Link>
      </div>
      <div className="bg-white border border-slate-300 rounded-lg p-8 text-center text-slate-500">
        {t('shopDetail.placeholder')} — Edit shop <code className="text-xs bg-slate-200 px-1 rounded">{id}</code>
      </div>
    </div>
  )
}
