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
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [deploying, setDeploying] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

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
        setActionMessage(null)
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

  const reloadOverview = async () => {
    const [containerRes, websiteRes] = await Promise.all([
      shopsApi.getShopContainer(token, id),
      shopWebsiteApi.getOverview(token, id),
    ])
    if (websiteRes.data?.overview) {
      setOverview(websiteRes.data.overview)
      setHistory(websiteRes.data.history || [])
      return
    }
    if (containerRes.data?.deployment && overview) {
      setOverview({
        ...overview,
        status: containerRes.data.deployment.status === 'running'
          ? 'deployed'
          : containerRes.data.deployment.status === 'building'
            ? 'building'
            : containerRes.data.deployment.status === 'error'
              ? 'error'
              : 'draft',
      })
    }
  }

  const copyUrl = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopyDone(true)
      setTimeout(() => setCopyDone(false), 1200)
    } catch (error) {
      console.error('Copy failed', error)
    }
  }

  const handleDeploy = async () => {
    setDeploying(true)
    const res = await shopWebsiteApi.deploy(token, id)
    setDeploying(false)
    if (res.data?.ok) {
      setActionMessage(t('website.dashboard.deploySuccess'))
      await reloadOverview()
      return
    }
    setActionMessage(res.error || t('website.deployFailed'))
  }

  const handleStop = async () => {
    setStopping(true)
    const res = await shopsApi.stopShopContainer(token, id)
    setStopping(false)
    if (res.data?.ok) {
      setActionMessage(t('website.dashboard.stopSuccess'))
      await reloadOverview()
      return
    }
    setActionMessage(res.error || t('website.dashboard.actionError'))
  }

  const handleRemove = async () => {
    setRemoving(true)
    const res = await shopsApi.deleteShopContainer(token, id)
    setRemoving(false)
    if (res.data?.ok) {
      setActionMessage(t('website.dashboard.removeSuccess'))
      await reloadOverview()
      return
    }
    setActionMessage(res.error || t('website.dashboard.actionError'))
  }

  const handleRestore = async (versionId: string) => {
    setRestoringId(versionId)
    const res = await shopWebsiteApi.restoreVersion(token, id, versionId)
    setRestoringId(null)
    if (res.data?.ok) {
      setActionMessage(res.data.summary || t('website.dashboard.restoreSuccess'))
      await reloadOverview()
      return
    }
    setActionMessage(res.error || t('website.dashboard.actionError'))
  }

  const statusLabel =
    overview?.status === 'deployed'
      ? t('website.dashboard.statusDeployed')
      : overview?.status === 'building'
        ? t('website.dashboard.statusBuilding')
        : overview?.status === 'error'
          ? t('website.dashboard.statusError')
          : overview?.status === 'preview_ready'
            ? t('website.dashboard.statusPreviewReady')
          : t('website.dashboard.statusDraft')

  const mainUrl = overview?.publicUrl || ''
  const previewUrl = overview?.previewUrl || ''
  const isRunning = overview?.status === 'deployed'
  const templateLabel = overview?.template || '-'
  const toneLabel = overview?.tone || '-'

  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{t('website.dashboard.title')}</h1>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-slate-600">{t('website.dashboard.controlCenterDesc')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/shops/${id}/website/builder`}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {t('website.dashboard.openBuilder')}
            </Link>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => void reloadOverview()}
              disabled={loading}
            >
              {t('website.dashboard.refresh')}
            </button>
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
        {actionMessage ? <p className="mt-3 text-sm text-slate-600">{actionMessage}</p> : null}
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
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">{t('website.dashboard.template')}</p>
                  <p className="font-semibold text-slate-900">{templateLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t('website.dashboard.tone')}</p>
                  <p className="font-semibold text-slate-900">{toneLabel}</p>
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
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDeploy}
                  disabled={deploying}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {deploying ? t('website.dashboard.deploying') : t('website.dashboard.deployNow')}
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  disabled={stopping || !isRunning}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {stopping ? t('website.dashboard.stopping') : t('website.stopBtn')}
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={removing}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {removing ? t('website.dashboard.removing') : t('website.deleteContainerBtn')}
                </button>
              </div>
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
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">{t('website.dashboard.manualFirst')}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {loading ? t('website.common.loading') : t('website.dashboard.manualFirstValue')}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">{t('website.dashboard.selectedAssets')}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {overview?.selectedAssetIds?.length ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">{t('website.dashboard.nextStep')}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {isRunning ? t('website.dashboard.nextStepRefine') : t('website.dashboard.nextStepDeploy')}
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
                    {item.summary ? <p className="mt-1 text-xs text-slate-500">{item.summary}</p> : null}
                    {item.restorable ? (
                      <button
                        type="button"
                        onClick={() => void handleRestore(item.id)}
                        disabled={restoringId === item.id}
                        className="mt-2 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {restoringId === item.id ? t('website.dashboard.restoring') : t('website.dashboard.restoreVersion')}
                      </button>
                    ) : null}
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
                {t('website.dashboard.openBuilder')}
              </Link>
              <button
                type="button"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => void handleDeploy()}
                disabled={deploying}
              >
                {deploying ? t('website.dashboard.deploying') : t('website.dashboard.deployNow')}
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
