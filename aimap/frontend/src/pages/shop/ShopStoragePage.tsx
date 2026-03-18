import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import { shopsApi, type ShopAsset } from '../../api/shops'
import ShopAssetGrid from '../../components/shop/ShopAssetGrid'

export default function ShopStoragePage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const [assets, setAssets] = useState<ShopAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const imageBotPath = id ? `/shops/${id}/image-bot` : '/shops'

  const load = useCallback(() => {
    if (!token || !id) return
    setLoading(true)
    setError(null)
    shopsApi.listAssets(token, id).then(({ data, error: err }) => {
      setLoading(false)
      if (err) setError(err)
      else if (data?.assets) setAssets(data.assets)
    })
  }, [token, id])

  useEffect(() => {
    load()
  }, [load])

  const onDelete = async (assetId: string) => {
    if (!token || !id) return
    const { error: err, status } = await shopsApi.deleteAsset(token, id, assetId)
    if (err || status >= 400) {
      setError(err ?? t('storage.deleteFailed'))
      return
    }
    setAssets((prev) => prev.filter((a) => a.id !== assetId))
  }

  if (!id) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('storage.title')}</h2>
          <p className="text-sm text-slate-600 mt-1">{t('storage.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={imageBotPath}
            className="inline-flex items-center gap-1 rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            <span className="material-symbols-outlined text-lg">auto_awesome</span>
            {t('storage.openImageBot')}
          </Link>
          <Link
            to={`/shops/${id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t('dashboard.viewDashboard')}
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-800 text-sm">{error}</div>
      )}

      <ShopAssetGrid
        t={t}
        assets={assets}
        loading={loading}
        onDelete={onDelete}
        imageBotPath={imageBotPath}
      />
    </div>
  )
}
