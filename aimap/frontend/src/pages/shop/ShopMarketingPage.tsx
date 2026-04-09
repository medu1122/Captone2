import { Link, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'

export default function ShopMarketingPage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()
  if (!id) return null

  const platforms = [
    { key: 'facebook', enabled: true, icon: 'f', to: `/shops/${id}/marketing/facebook` },
    { key: 'twitter', enabled: false, icon: 'x', to: '#' },
    { key: 'tiktok', enabled: false, icon: '♪', to: '#' },
    { key: 'instagram', enabled: false, icon: '◎', to: '#' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('marketing.choosePlatformTitle')}</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {platforms.map((p) => {
          const content = (
            <div
              className={`rounded-none border p-5 flex flex-col items-center gap-2 transition ${
                p.enabled
                  ? 'border-slate-300 bg-white hover:border-slate-500 hover:shadow-sm'
                  : 'border-slate-200 bg-slate-100 opacity-60'
              }`}
            >
              <div className="h-12 w-12 rounded-none bg-slate-900 text-white flex items-center justify-center text-xl font-semibold">
                {p.icon}
              </div>
              <p className="text-sm font-medium text-slate-800">{t(`marketing.platform.${p.key}`)}</p>
              {!p.enabled && (
                <span className="text-[11px] text-slate-500">{t('marketing.notSupported')}</span>
              )}
            </div>
          )

          if (!p.enabled) return <div key={p.key}>{content}</div>
          return (
            <Link key={p.key} to={p.to} className="block">
              {content}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
