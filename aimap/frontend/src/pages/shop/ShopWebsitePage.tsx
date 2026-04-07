import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'

type ActivityType = 'all' | 'prompt' | 'deploy'

const EVENTS = [
  { id: 'e1', type: 'prompt', titleKey: 'website.dashboard.event.e1.title', timeKey: 'website.dashboard.event.e1.time' },
  { id: 'e2', type: 'prompt', titleKey: 'website.dashboard.event.e2.title', timeKey: 'website.dashboard.event.e2.time' },
  { id: 'e3', type: 'deploy', titleKey: 'website.dashboard.event.e3.title', timeKey: 'website.dashboard.event.e3.time' },
  { id: 'e4', type: 'deploy', titleKey: 'website.dashboard.event.e4.title', timeKey: 'website.dashboard.event.e4.time' },
]

function EmptyMetricCard({ label, t }: { label: string; t: (key: string) => string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{t('website.dashboard.emptyBackend')}</p>
      <p className="mt-1 text-xs text-slate-500">{t('website.dashboard.emptyHint')}</p>
    </div>
  )
}

export default function ShopWebsitePage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()
  const [websiteVariant, setWebsiteVariant] = useState('v1')
  const [activityFilter, setActivityFilter] = useState<ActivityType>('all')
  const [copyDone, setCopyDone] = useState(false)

  if (!id) return <p className="text-sm text-slate-500">{t('website.common.missingShopId')}</p>

  const slug = `shop-${id}`
  const publicUrl = `https://${slug}.aimap.app`
  const previewUrl = `https://preview.aimap.app/sites/${id}`
  const isDeployed = false

  const filteredEvents = useMemo(() => {
    if (activityFilter === 'all') return EVENTS
    return EVENTS.filter((item) => item.type === activityFilter)
  }, [activityFilter])

  const copyUrl = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopyDone(true)
      setTimeout(() => setCopyDone(false), 1200)
    } catch (error) {
      console.error('Copy failed', error)
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{t('website.dashboard.title')}</h1>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                {t('website.common.showcaseBadge')}
              </span>
            </div>
            <p className="text-sm text-slate-600">{t('website.dashboard.showcaseDesc')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/shops/${id}/website/builder`}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {t('website.dashboard.openPromptBuilder')}
            </Link>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => window.open(isDeployed ? publicUrl : previewUrl, '_blank', 'noopener,noreferrer')}
            >
              {t('website.dashboard.openWebsite')}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => void copyUrl(isDeployed ? publicUrl : previewUrl)}
            >
              {copyDone ? t('website.common.copied') : t('website.dashboard.copyLink')}
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">{t('website.dashboard.currentWebsite')}</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{slug}</p>
              <p className="mt-3 text-xs font-medium text-slate-500">{t('website.common.publicUrl')}</p>
              <p className="text-sm text-slate-800">{isDeployed ? publicUrl : t('website.common.notDeployed')}</p>
              <p className="mt-3 text-xs font-medium text-slate-500">{t('website.common.previewUrl')}</p>
              <p className="text-sm text-slate-800">{previewUrl}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">{t('website.dashboard.status')}</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {isDeployed ? t('website.dashboard.statusDeployed') : t('website.dashboard.statusPreviewReady')}
              </p>
              <p className="mt-3 text-xs font-medium text-slate-500">{t('website.dashboard.lastUpdated')}</p>
              <p className="text-sm text-slate-800">{t('website.dashboard.lastUpdatedValue')}</p>
              <p className="mt-3 text-xs font-medium text-slate-500">{t('website.dashboard.versionCount')}</p>
              <p className="text-sm text-slate-800">
                {websiteVariant === 'v1' ? t('website.dashboard.versionsV1') : t('website.dashboard.versionsV2')}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{t('website.dashboard.quickPreview')}</p>
              <div className="flex items-center gap-2">
                <select
                  value={websiteVariant}
                  onChange={(event) => setWebsiteVariant(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  <option value="v1">{t('website.dashboard.variantMain')}</option>
                  <option value="v2">{t('website.dashboard.variantEvent')}</option>
                </select>
                <Link
                  to={`/shops/${id}/website/builder`}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  {t('website.dashboard.goToEditor')}
                </Link>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                {previewUrl}
              </div>
              <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">{t('website.dashboard.mockPreview')}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('website.dashboard.versionLabel')} {websiteVariant === 'v1' ? 'v1.0' : 'v1.1'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">{t('website.dashboard.importantMetrics')}</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t('website.dashboard.promptsRun')}</p>
                <p className="text-lg font-bold text-slate-900">12</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t('website.dashboard.successRate')}</p>
                <p className="text-lg font-bold text-slate-900">91%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t('website.dashboard.lastPrompt')}</p>
                <p className="text-sm font-semibold text-slate-900">{t('website.dashboard.lastPromptValue')}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t('website.dashboard.creditsUsed')}</p>
                <p className="text-lg font-bold text-slate-900">24</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <EmptyMetricCard label={t('website.dashboard.viewsToday')} t={t} />
              <EmptyMetricCard label={t('website.dashboard.views7d')} t={t} />
              <EmptyMetricCard label={t('website.dashboard.mobileDesktopRatio')} t={t} />
              <EmptyMetricCard label={t('website.dashboard.coreWebVitals')} t={t} />
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">{t('website.dashboard.websiteHistory')}</p>
              <select
                value={activityFilter}
                onChange={(event) => setActivityFilter(event.target.value as ActivityType)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700"
              >
                <option value="all">{t('website.dashboard.filterAll')}</option>
                <option value="prompt">{t('website.dashboard.filterPrompt')}</option>
                <option value="deploy">{t('website.dashboard.filterDeploy')}</option>
              </select>
            </div>
            <div className="space-y-2">
              {filteredEvents.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-2">
                  <p className="text-sm font-medium text-slate-800">{t(item.titleKey)}</p>
                  <p className="text-xs text-slate-500">{t(item.timeKey)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">{t('website.dashboard.quickActions')}</p>
            <div className="mt-3 space-y-2">
              <Link
                to={`/shops/${id}/website/builder`}
                className="block rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-slate-800"
              >
                {t('website.dashboard.editWithPrompt')}
              </Link>
              <button
                type="button"
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
              >
                {t('website.dashboard.publishSoon')}
              </button>
              <button
                type="button"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => window.open(isDeployed ? publicUrl : previewUrl, '_blank', 'noopener,noreferrer')}
              >
                {t('website.dashboard.viewWebsite')}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
