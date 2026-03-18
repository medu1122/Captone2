import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ShopAsset } from '../../api/shops'
import { assetStorageUrl } from '../../api/client'

type Props = {
  t: (key: string) => string
  assets: ShopAsset[]
  loading?: boolean
  onDelete: (assetId: string) => Promise<void>
  imageBotPath: string
}

export default function ShopAssetGrid({ t, assets, loading, onDelete, imageBotPath }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (assetId: string) => {
    if (!window.confirm(t('storage.deleteConfirm'))) return
    setDeletingId(assetId)
    try {
      await onDelete(assetId)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500 py-8 text-center">…</p>
  }

  if (!assets.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600 text-sm">
        <p>{t('storage.empty')}</p>
        <Link
          to={imageBotPath}
          className="inline-block mt-3 text-sm font-medium text-primary hover:underline"
        >
          {t('storage.openImageBot')}
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {assets.map((a) => {
        const src = assetStorageUrl(a.storage_path_or_url)
        return (
          <div
            key={a.id}
            className="group relative rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm"
          >
            <div className="aspect-square bg-slate-100">
              {src ? (
                <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">—</div>
              )}
            </div>
            <div className="p-2 border-t border-slate-100">
              <p className="text-xs text-slate-600 truncate" title={a.name || undefined}>
                {a.name || a.type || '—'}
              </p>
              <p className="text-[10px] text-slate-400">{a.model_source || ''}</p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(a.id)}
              disabled={deletingId === a.id}
              className="absolute top-2 right-2 rounded bg-red-600/90 text-white p-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50"
              aria-label={t('storage.delete')}
            >
              <span className="material-symbols-outlined text-lg leading-none">delete</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
