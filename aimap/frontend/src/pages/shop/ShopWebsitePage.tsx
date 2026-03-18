import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import { shopsApi } from '../../api/shops'
import { assetStorageUrl } from '../../api/client'

export default function ShopWebsitePage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const imageBotPath = id ? `/shops/${id}/image-bot` : '/shops'
  const storagePath = id ? `/shops/${id}/storage` : '/shops'

  const load = useCallback(() => {
    if (!token || !id) return
    setLoading(true)
    shopsApi.get(token, id).then(({ data }) => {
      setLoading(false)
      if (!data) return
      const logo = data.logo_url != null ? String(data.logo_url) : ''
      const cover = data.cover_url != null ? String(data.cover_url) : ''
      setLogoUrl(logo ? assetStorageUrl(logo) || logo : null)
      setCoverUrl(cover ? assetStorageUrl(cover) || cover : null)
    })
  }, [token, id])

  useEffect(() => {
    load()
  }, [load])

  if (!id) return null

  return (
    <div className="space-y-6">
      <p className="text-slate-600 text-sm">{t('shopDetail.websiteIntro')}</p>

      <div className="flex flex-wrap gap-3">
        <Link
          to={imageBotPath}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-4 py-2.5 text-sm font-medium hover:opacity-90"
        >
          {t('website.ctaImages')}
        </Link>
        <Link
          to={storagePath}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
        >
          {t('marketing.ctaStorage')}
        </Link>
      </div>

      <div className="bg-white border border-slate-300 rounded-lg p-6 space-y-6">
        <h3 className="text-sm font-semibold text-slate-900">{t('website.previewTitle')}</h3>
        {loading ? (
          <p className="text-sm text-slate-500">…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">{t('website.logo')}</p>
              <div className="aspect-video max-h-40 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-sm text-slate-400">{t('website.noLogo')}</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">{t('website.cover')}</p>
              <div className="aspect-video rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden">
                {coverUrl ? (
                  <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm text-slate-400">{t('website.noCover')}</span>
                )}
              </div>
            </div>
          </div>
        )}
        <p className="text-xs text-slate-500">{t('website.builderHint')}</p>
      </div>
    </div>
  )
}
