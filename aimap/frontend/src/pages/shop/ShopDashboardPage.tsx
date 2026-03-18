import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import { shopsApi, type ShopAsset } from '../../api/shops'
import RecentAssetsStrip from '../../components/shop/RecentAssetsStrip'

function productCount(products: unknown): number {
  if (Array.isArray(products)) return products.length
  if (products && typeof products === 'object') return Object.keys(products as object).length
  return 0
}

export default function ShopDashboardPage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const [assets, setAssets] = useState<ShopAsset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(true)
  const [contentCount, setContentCount] = useState<number | null>(null)

  const storagePath = id ? `/shops/${id}/storage` : '/shops'
  const imageBotPath = id ? `/shops/${id}/image-bot` : '/shops'

  const load = useCallback(() => {
    if (!token || !id) return
    setAssetsLoading(true)
    shopsApi.listAssets(token, id).then(({ data }) => {
      setAssetsLoading(false)
      if (data?.assets) setAssets(data.assets)
    })
    shopsApi.get(token, id).then(({ data }) => {
      if (data?.products != null) setContentCount(productCount(data.products))
    })
  }, [token, id])

  useEffect(() => {
    load()
  }, [load])

  if (!id) return null

  return (
    <div className="space-y-6">
      <p className="text-slate-600 text-sm">{t('shopDetail.dashboardIntro')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <span className="text-sm font-medium text-slate-600">{t('shopDetail.stats.images')}</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {assetsLoading ? '…' : assets.length}
          </p>
          <Link to={imageBotPath} className="text-xs text-primary font-medium mt-2 inline-block hover:underline">
            {t('storage.openImageBot')} →
          </Link>
        </div>
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <span className="text-sm font-medium text-slate-600">{t('shopDetail.stats.content')}</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {contentCount === null ? '…' : contentCount}
          </p>
          <Link to={`/shops/${id}/edit`} className="text-xs text-primary font-medium mt-2 inline-block hover:underline">
            {t('shops.edit')} →
          </Link>
        </div>
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <span className="text-sm font-medium text-slate-600">{t('shopDetail.stats.siteStatus')}</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{t('website.siteDraft')}</p>
          <Link to={`/shops/${id}/website`} className="text-xs text-primary font-medium mt-2 inline-block hover:underline">
            {t('website.ctaBuilder')} →
          </Link>
        </div>
      </div>

      <div className="bg-white border border-slate-300 rounded-lg p-6">
        <RecentAssetsStrip
          t={t}
          assets={assets}
          max={6}
          titleKey="dashboard.recentAssets"
          storagePath={storagePath}
          loading={assetsLoading}
        />
      </div>
    </div>
  )
}
