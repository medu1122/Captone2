import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLocale } from '../contexts/LocaleContext'
import { useAuth } from '../contexts/AuthContext'
import { shopsApi, type ShopListItem } from '../api/shops'

function formatCount(t: (key: string) => string, key: string, count: number | null): string {
  if (count === null) return '—'
  return t(key).replace('{count}', String(count))
}

export default function ShopListPage() {
  const { t } = useLocale()
  const { token } = useAuth()
  const [shops, setShops] = useState<ShopListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    shopsApi.list(token).then(({ data, error: err }) => {
      if (cancelled) return
      setLoading(false)
      if (err) setError(err)
      else if (data?.shops) setShops(data.shops)
    })
    return () => { cancelled = true }
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-600">...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-red-800">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header row: title + CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">{t('shops.title')}</h2>
        <Link
          to="/shops/create"
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-5 rounded-none transition-colors text-sm"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          {t('shops.createShop')}
        </Link>
      </div>

      {/* Optional stats (like Dashboard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-300 rounded-none p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-none border border-slate-300 flex items-center justify-center bg-slate-50">
              <img src="/icons/shop.png" alt="" className="w-8 h-8" />
            </div>
            <span className="text-sm font-medium text-slate-600">{t('dashboard.activeShops')}</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {formatCount(t, 'dashboard.activeShopsCount', shops.length)}
          </p>
        </div>
        <div className="bg-white border border-slate-300 rounded-none p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-none border border-slate-300 flex items-center justify-center bg-slate-50">
              <img src="/icons/website.png" alt="" className="w-8 h-8" />
            </div>
            <span className="text-sm font-medium text-slate-600">{t('dashboard.liveWebsites')}</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {formatCount(t, 'dashboard.liveWebsitesCount', null)}
          </p>
        </div>
      </div>

      {/* Shop list: grid of cards or empty state */}
      <div className="bg-white border border-slate-300 rounded-none overflow-hidden">
        {shops.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-slate-600 mb-4">{t('shops.emptyMessage')}</p>
            <Link
              to="/shops/create"
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-5 rounded-none transition-colors text-sm"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              {t('shops.createFirstShop')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {shops.map((shop) => (
              <div
                key={shop.id}
                className="border border-slate-200 rounded-none p-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-3 mb-3">
                  {shop.logo_url ? (
                    <img
                      src={shop.logo_url}
                      alt=""
                      className="w-12 h-12 rounded-none object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-none border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500">
                      <span className="material-symbols-outlined text-2xl">store</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 truncate">{shop.name}</h3>
                    <p className="text-xs text-slate-500 truncate">{shop.slug}.captone2.site</p>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-none bg-slate-100 text-slate-600">
                      {shop.industry || '—'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Link
                    to={`/shops/${shop.id}`}
                    className="flex-1 text-center py-2 rounded-none border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                  >
                    {t('shops.enterShop')}
                  </Link>
                  <Link
                    to={`/shops/${shop.id}`}
                    className="flex-1 text-center py-2 rounded-none border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
                  >
                    {t('shops.edit')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
