import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../contexts/LocaleContext'
import { websiteRuntimePreviewUrl } from '../../api/client'
import { shopWebsiteApi, type WebsiteOverview } from '../../api/shopWebsite'

function statusBadgeClass(status: string | undefined): string {
  if (status === 'deployed') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (status === 'building') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (status === 'preview_ready') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (status === 'error') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function formatMaybeNumber(value: number | null | undefined): string {
  if (value == null) return ''
  return String(value)
}

export default function ShopWebsiteDashboardPage() {
  const { t } = useLocale()
  const { token } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [overview, setOverview] = useState<WebsiteOverview | null>(null)
  const [deploying, setDeploying] = useState(false)
  const [deployMessage, setDeployMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  if (!id) return <p className="text-sm text-slate-500">{t('website.common.missingShopId')}</p>
  if (!token) return null

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const entryRes = await shopWebsiteApi.getEntry(token, id)
      if (cancelled) return
      if (!entryRes.data?.sites?.length) {
        navigate(`/shops/${id}/website`, { replace: true })
        return
      }

      const websiteRes = await shopWebsiteApi.getOverview(token, id)
      if (cancelled) return

      if (websiteRes.data?.overview) {
        setOverview(websiteRes.data.overview)
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id, navigate, token])

  const handleDeploy = async () => {
    setDeployMessage(null)
    setDeploying(true)
    const res = await shopWebsiteApi.deploy(token, id)
    setDeploying(false)
    if (res.data?.ok) {
      const websiteRes = await shopWebsiteApi.getOverview(token, id)
      if (websiteRes.data?.overview) setOverview(websiteRes.data.overview)
      setDeployMessage(t('website.builder.deploySuccess'))
      return
    }
    setDeployMessage(res.error || t('website.builder.deployError'))
  }

  const mainUrl = overview?.publicUrl || ''
  const apiRuntimePreview = websiteRuntimePreviewUrl(id)
  const previewUrl = overview?.previewUrl || apiRuntimePreview

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <section className="overflow-hidden rounded-none border border-slate-200 bg-white">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-none border px-3 py-1 text-xs font-semibold ${statusBadgeClass(overview?.status)}`}>
                {overview?.status || t('website.dashboard.statusDraft')}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">{t('website.dashboard.shopWebsiteTitle')}</h1>
            <p className="mt-2 text-sm text-slate-600">{t('website.dashboard.singleWebsiteHint')}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                to={`/shops/${id}/website/builder`}
                className="rounded-none bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {t('website.dashboard.websiteEdit')}
              </Link>
              <button
                type="button"
                onClick={() => void handleDeploy()}
                disabled={deploying}
                className="rounded-none border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
              >
                {deploying ? t('website.builder.deploying') : t('website.builder.deploy')}
              </button>
              {deployMessage ? <span className="text-sm text-slate-600">{deployMessage}</span> : null}
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-3">
              <div className="rounded-none border border-slate-200 p-4">
                <p className="text-xs text-slate-500">{t('website.common.publicUrl')}</p>
                {mainUrl ? (
                  <a href={mainUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm font-semibold text-blue-600 underline">
                    {mainUrl}
                  </a>
                ) : (
                  <p className="mt-1 break-all text-sm font-semibold text-slate-900">{t('website.common.notDeployed')}</p>
                )}
              </div>
              <div className="rounded-none border border-slate-200 p-4">
                <p className="text-xs text-slate-500">{t('website.common.previewUrl')}</p>
                <a href={previewUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm font-semibold text-blue-600 underline">
                  {previewUrl}
                </a>
                {overview?.previewUrl && overview.previewUrl !== apiRuntimePreview ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {t('website.dashboard.apiRuntimeLabel')}{' '}
                    <a href={apiRuntimePreview} target="_blank" rel="noreferrer" className="font-medium text-blue-600 underline">
                      {apiRuntimePreview}
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-none border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-950">{t('website.dashboard.usageBackendTitle')}</h2>
        {loading ? (
          <div className="mt-5 rounded-none border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            {t('website.common.loading')}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-none border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-950">{t('website.dashboard.viewsToday')}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatMaybeNumber(overview?.viewsToday) || t('website.dashboard.noData')}</p>
            </div>
            <div className="rounded-none border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-950">{t('website.dashboard.views7d')}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatMaybeNumber(overview?.views7d) || t('website.dashboard.noData')}</p>
            </div>
            <div className="rounded-none border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-950">{t('website.dashboard.mobileDesktopRatio')}</p>
              <p className="mt-2 text-sm font-medium text-slate-700">{overview?.mobileDesktopRatio || t('website.dashboard.noData')}</p>
            </div>
            <div className="rounded-none border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-950">{t('website.dashboard.coreWebVitals')}</p>
              <p className="mt-2 text-sm font-medium text-slate-700">{overview?.coreWebVitals || t('website.dashboard.noData')}</p>
            </div>
            <div className="rounded-none border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-950">{t('website.dashboard.promptsRun')}</p>
              <p className="mt-2 text-sm font-medium text-slate-700">{formatMaybeNumber(overview?.promptCount) || t('website.dashboard.noData')}</p>
            </div>
            <div className="rounded-none border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-950">{t('website.dashboard.successRate')}</p>
              <p className="mt-2 text-sm font-medium text-slate-700">
                {overview?.promptSuccessRate == null ? t('website.dashboard.noData') : `${overview.promptSuccessRate}%`}
              </p>
            </div>
            <div className="rounded-none border border-slate-200 p-5 lg:col-span-2">
              <p className="text-sm font-semibold text-slate-950">{t('website.dashboard.lastPrompt')}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{overview?.lastPrompt || t('website.dashboard.noData')}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
