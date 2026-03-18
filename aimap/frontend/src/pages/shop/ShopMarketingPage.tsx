import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import { shopsApi, type ShopAsset } from '../../api/shops'
import RecentAssetsStrip from '../../components/shop/RecentAssetsStrip'

export default function ShopMarketingPage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const [assets, setAssets] = useState<ShopAsset[]>([])
  const [loading, setLoading] = useState(true)

  const storagePath = id ? `/shops/${id}/storage` : '/shops'
  const imageBotPath = id ? `/shops/${id}/image-bot` : '/shops'

  const load = useCallback(() => {
    if (!token || !id) return
    setLoading(true)
    shopsApi.listAssets(token, id).then(({ data }) => {
      setLoading(false)
      if (data?.assets) setAssets(data.assets)
    })
  }, [token, id])

  useEffect(() => {
    load()
  }, [load])

  if (!id) return null

  return (
    <div className="space-y-6">
      <p className="text-slate-600 text-sm">{t('shopDetail.marketingIntro')}</p>

      <div className="flex flex-wrap gap-3">
        <Link
          to={imageBotPath}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-4 py-2.5 text-sm font-medium hover:opacity-90"
        >
          <span className="material-symbols-outlined text-xl">auto_awesome</span>
          {t('marketing.ctaImageBot')}
        </Link>
        <Link
          to={storagePath}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          <span className="material-symbols-outlined text-xl">folder_open</span>
          {t('marketing.ctaStorage')}
        </Link>
      </div>

      <div className="bg-white border border-slate-300 rounded-lg p-6">
        <RecentAssetsStrip
          t={t}
          assets={assets}
          max={8}
          titleKey="marketing.recentImages"
          storagePath={storagePath}
          loading={loading}
        />
        <p className="text-xs text-slate-500 mt-4">{t('marketing.hint')}</p>
      </div>
    </div>
  )
}
