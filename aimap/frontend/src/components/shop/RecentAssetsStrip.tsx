import { Link } from 'react-router-dom'
import type { ShopAsset } from '../../api/shops'
import { assetStorageUrl } from '../../api/client'

type Props = {
  t: (key: string) => string
  assets: ShopAsset[]
  max?: number
  titleKey: string
  storagePath: string
  loading?: boolean
}

export default function RecentAssetsStrip({
  t,
  assets,
  max = 6,
  titleKey,
  storagePath,
  loading,
}: Props) {
  const slice = assets.slice(0, max)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{t(titleKey)}</h3>
        <Link to={storagePath} className="text-xs font-medium text-primary hover:underline shrink-0">
          {t('dashboard.viewStorage')}
        </Link>
      </div>
      {loading ? (
        <p className="text-xs text-slate-500">…</p>
      ) : slice.length === 0 ? (
        <p className="text-xs text-slate-500">{t('storage.empty')}</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {slice.map((a) => {
            const src = assetStorageUrl(a.storage_path_or_url)
            return (
              <div
                key={a.id}
                className="shrink-0 w-20 h-20 rounded-lg border border-slate-200 overflow-hidden bg-slate-100"
              >
                {src ? (
                  <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">—</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
