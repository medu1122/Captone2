import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../contexts/LocaleContext'
import { shopsApi } from '../../api/shops'
import { shopWebsiteApi, type WebsiteHistoryItem, type WebsiteOverview } from '../../api/shopWebsite'

type ActivityType = 'all' | 'prompt' | 'deploy'

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
  const { token } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [activityFilter, setActivityFilter] = useState<ActivityType>('all')
  const [copyDone, setCopyDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<WebsiteOverview | null>(null)
  const [history, setHistory] = useState<WebsiteHistoryItem[]>([])

  if (!id) return <p className="text-sm text-slate-500">{t('website.common.missingShopId')}</p>
  if (!token) return null

  const filteredEvents = useMemo(() => {
    if (activityFilter === 'all') return history
    return history.filter((item) => item.type === activityFilter)
  }, [activityFilter, history])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const [shopRes, containerRes, websiteRes] = await Promise.all([
        shopsApi.get(token, id),
        shopsApi.getShopContainer(token, id),
        shopWebsiteApi.getOverview(token, id),
      ])

      if (cancelled) return

      if (websiteRes.data?.overview) {
        setOverview(websiteRes.data.overview)
        setHistory(websiteRes.data.history || [])
        setLoading(false)
        return
      }

      const shop = shopRes.data
      const deploy = containerRes.data?.deployment
      const slug = String(shop?.slug || `shop-${id}`)
      const subdomain = deploy?.subdomain || `${slug}.captone2.site`
      const publicUrl = `https://${subdomain}`
      const previewUrl = `https://preview.captone2.site/sites/${id}`
      const status = deploy?.status === 'running' ? 'deployed' : deploy?.status === 'building' ? 'building' : 'draft'

      setOverview({
        siteId: null,
        slug,
        status,
        versionCount: 1,
        publicUrl,
        previewUrl,
        updatedAt: deploy?.updated_at || null,
        promptCount: null,
        promptSuccessRate: null,
        creditsUsed: null,
        lastPrompt: null,
        viewsToday: null,
        views7d: null,
        mobileDesktopRatio: null,
        coreWebVitals: null,
      })
      setHistory([])
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id, token])

  const copyUrl = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopyDone(true)
      setTimeout(() => setCopyDone(false), 1200)
    } catch (error) {
      console.error('Copy failed', error)
    }
  }

  const statusLabel =
    overview?.status === 'deployed'
      ? t('website.dashboard.statusDeployed')
      : overview?.status === 'building'
        ? t('website.dashboard.statusBuilding')
        : overview?.status === 'error'
          ? t('website.dashboard.statusError')
          : t('website.dashboard.statusDraft')

  const mainUrl = overview?.publicUrl || ''
  const previewUrl = overview?.previewUrl || ''

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
              onClick={() => window.open(mainUrl || previewUrl, '_blank', 'noopener,noreferrer')}
              disabled={!mainUrl && !previewUrl}
            >
              {t('website.dashboard.openWebsite')}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => void copyUrl(mainUrl || previewUrl)}
              disabled={!mainUrl && !previewUrl}
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
              <p className="mt-1 text-base font-semibold text-slate-900">{overview?.slug || '...'}</p>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={mainUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm text-primary underline underline-offset-2"
                  >
                    {mainUrl || t('website.common.notDeployed')}
                  </a>
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => mainUrl && window.open(mainUrl, '_blank', 'noopener,noreferrer')}
                    disabled={!mainUrl}
                  >
                    {t('website.common.visit')}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={previewUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm text-primary underline underline-offset-2"
                  >
                    {previewUrl || '-'}
                  </a>
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => previewUrl && window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                    disabled={!previewUrl}
                  >
                    {t('website.common.visit')}
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">{t('website.dashboard.status')}</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{statusLabel}</p>
              <p className="mt-3 text-xs font-medium text-slate-500">{t('website.dashboard.lastUpdated')}</p>
              <p className="text-sm text-slate-800">{overview?.updatedAt || '-'}</p>
              <p className="mt-3 text-xs font-medium text-slate-500">{t('website.dashboard.versionCount')}</p>
              <p className="text-sm text-slate-800">{overview?.versionCount ?? '-'}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{t('website.dashboard.quickPreview')}</p>
              <Link
                to={`/shops/${id}/website/builder`}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                {t('website.dashboard.goToEditor')}
              </Link>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                {previewUrl || '-'}
              </div>
              <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">{t('website.dashboard.mockPreview')}</p>
                  <p className="mt-1 text-xs text-slate-500">{loading ? t('website.common.loading') : t('website.dashboard.liveDataSoon')}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">{t('website.dashboard.importantMetrics')}</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t('website.dashboard.promptsRun')}</p>
                <p className="text-lg font-bold text-slate-900">{overview?.promptCount ?? '-'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t('website.dashboard.successRate')}</p>
                <p className="text-lg font-bold text-slate-900">
                  {overview?.promptSuccessRate != null ? `${overview.promptSuccessRate}%` : '-'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t('website.dashboard.lastPrompt')}</p>
                <p className="text-sm font-semibold text-slate-900">{overview?.lastPrompt || '-'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t('website.dashboard.creditsUsed')}</p>
                <p className="text-lg font-bold text-slate-900">{overview?.creditsUsed ?? '-'}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {overview?.viewsToday == null ? (
                <EmptyMetricCard label={t('website.dashboard.viewsToday')} t={t} />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{t('website.dashboard.viewsToday')}</p>
                  <p className="text-lg font-bold text-slate-900">{overview.viewsToday}</p>
                </div>
              )}
              {overview?.views7d == null ? (
                <EmptyMetricCard label={t('website.dashboard.views7d')} t={t} />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{t('website.dashboard.views7d')}</p>
                  <p className="text-lg font-bold text-slate-900">{overview.views7d}</p>
                </div>
              )}
              {overview?.mobileDesktopRatio == null ? (
                <EmptyMetricCard label={t('website.dashboard.mobileDesktopRatio')} t={t} />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{t('website.dashboard.mobileDesktopRatio')}</p>
                  <p className="text-lg font-bold text-slate-900">{overview.mobileDesktopRatio}</p>
                </div>
              )}
              {overview?.coreWebVitals == null ? (
                <EmptyMetricCard label={t('website.dashboard.coreWebVitals')} t={t} />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{t('website.dashboard.coreWebVitals')}</p>
                  <p className="text-lg font-bold text-slate-900">{overview.coreWebVitals}</p>
                </div>
              )}
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
              {filteredEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                  {t('website.dashboard.noHistory')}
                </div>
              ) : (
                filteredEvents.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-2">
                    <p className="text-sm font-medium text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.createdAt}</p>
                  </div>
                ))
              )}
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
                onClick={() => window.open(mainUrl || previewUrl, '_blank', 'noopener,noreferrer')}
                disabled={!mainUrl && !previewUrl}
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
