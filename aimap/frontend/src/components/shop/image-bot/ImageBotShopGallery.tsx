type AssetRow = {
  id: string
  storage_path_or_url: string | null
  name: string | null
  type: string | null
}

type Props = {
  t: (key: string) => string
  assets: AssetRow[]
  loading: boolean
  storagePath: string
}

export default function ImageBotShopGallery({ t, assets, loading, storagePath }: Props) {
  return (
    <div className="min-h-0">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-slate-900">{t('imageBot.galleryTitle')}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{t('imageBot.galleryHint')}</p>
        <a
          href={storagePath}
          className="text-xs text-primary font-medium mt-1 inline-block hover:underline"
        >
          {t('imageBot.openStorage')}
        </a>
      </div>
      <div className="h-32 sm:h-36 overflow-x-auto overflow-y-hidden border border-slate-200 rounded-lg bg-slate-50 p-2">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">...</div>
        ) : assets.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm text-center px-4">
            {t('imageBot.galleryEmpty')}
          </div>
        ) : (
          <div className="flex gap-2 h-full items-center">
            {assets.map((a) => {
              const src = a.storage_path_or_url
              return (
                <div
                  key={a.id}
                  className="h-full aspect-square shrink-0 rounded-lg border border-slate-200 bg-white overflow-hidden"
                >
                  {src ? (
                    <img src={src} alt={a.name || ''} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 p-1 text-center">
                      {a.name || a.type || '—'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
