import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import {
  shopWebsiteApi,
  type PromptPreviewBody,
  type WebsiteBuilderState,
  type WebsiteConfig,
  type WebsiteDeviceMode,
} from '../../api/shopWebsite'
import { websiteRuntimePreviewUrl } from '../../api/client'
import WebsitePreviewFrame, { type WebsitePreviewVariant } from '../../components/shop/WebsitePreviewFrame'

type PromptScope = PromptPreviewBody['scope']

function cloneConfig(config: WebsiteConfig): WebsiteConfig {
  return JSON.parse(JSON.stringify(config)) as WebsiteConfig
}

function deployBadge(status: string | null | undefined): string {
  if (status === 'running' || status === 'deployed') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (status === 'building') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (status === 'error') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function formatDateShort(value?: string | null): string {
  if (!value) return '-'
  return value.slice(0, 10)
}

function statusDotClass(status: string): string {
  if (status === 'running' || status === 'deployed') return 'bg-emerald-500'
  if (status === 'building') return 'bg-blue-500'
  if (status === 'error') return 'bg-rose-500'
  return 'bg-slate-400'
}

export default function ShopWebsiteBuilderPage() {
  const { t } = useLocale()
  const { token } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [deviceMode, setDeviceMode] = useState<WebsiteDeviceMode>('desktop')
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [recentPrompts, setRecentPrompts] = useState<string[]>([])
  const [statusText, setStatusText] = useState('website.builder.status.ready')
  const [statusSummary, setStatusSummary] = useState('')
  const [builderState, setBuilderState] = useState<WebsiteBuilderState | null>(null)
  const [previewConfig, setPreviewConfig] = useState<WebsiteConfig | null>(null)
  const [publicUrl, setPublicUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingPrompt, setSendingPrompt] = useState(false)
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null)
  const [showDeleteForm, setShowDeleteForm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null)
  const [previewVariant, setPreviewVariant] = useState<WebsitePreviewVariant>('interactive')
  const [publishedReloadKey, setPublishedReloadKey] = useState(0)
  const [deploying, setDeploying] = useState(false)
  const [deployMessage, setDeployMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!id) return <p className="text-sm text-slate-500">{t('website.common.missingShopId')}</p>
  if (!token) return null

  const recentKey = `aimap-web-builder-recent-${id}`

  const refreshBuilderState = async () => {
    const res = await shopWebsiteApi.getBuilderState(token, id)
    if (!res.data) {
      setActionError(res.error || t('website.builder.loadFailed'))
      return null
    }
    const data = res.data
    const config = cloneConfig(data.config)
    setBuilderState(data)
    setPreviewConfig(config)
    setPublicUrl(data.publicUrl)
    setPreviewUrl(data.previewUrl)
    setPublishedReloadKey((k) => k + 1)
    setSelectedSectionId((current) => current && config.sections.some((section) => section.id === current) ? current : (data.sections[0]?.id || null))
    return data
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(recentKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) setRecentPrompts(parsed.slice(0, 8))
    } catch (error) {
      console.error('Cannot load prompt history', error)
    }
  }, [recentKey])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setActionError(null)
        const entryRes = await shopWebsiteApi.getEntry(token, id)
        if (cancelled) return
        if (!entryRes.data?.sites?.length) {
          navigate(`/shops/${id}/website`, { replace: true })
          return
        }

        const data = await refreshBuilderState()
        if (cancelled) return
        if (data) setStatusSummary('')
      } catch (error) {
        if (!cancelled) {
          setActionError(error instanceof Error ? error.message : t('website.builder.loadFailed'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id, navigate, token])

  const pushRecent = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const next = [trimmed, ...recentPrompts.filter((item) => item !== trimmed)].slice(0, 8)
    setRecentPrompts(next)
    localStorage.setItem(recentKey, JSON.stringify(next))
  }

  const selectSection = (sectionId: string) => {
    const tag = `@section:${sectionId}`
    setSelectedSectionId(sectionId)
    setPrompt((prev) => {
      if (prev.includes(tag)) return prev
      const prefix = t('website.builder.promptEditPrefix')
      return prev ? `${prev}\n${prefix} ${tag}: ` : `${prefix} ${tag}: `
    })
  }

  // Derive scope and sectionId from the current prompt text — not from the selectedSectionId state.
  // This means removing the @section: tag from the prompt automatically switches to whole-page mode.
  const promptSectionMatch = /\@section:([\w-]+)/.exec(prompt)
  const promptSectionId = promptSectionMatch ? promptSectionMatch[1] : null
  const currentScope: PromptScope = promptSectionId ? 'selected' : 'all'

  const handleSendPrompt = async () => {
    const trimmed = prompt.trim()
    if (!trimmed) return
    const sectionTagMatch = /\@section:([\w-]+)/.exec(trimmed)
    const resolvedSectionId = sectionTagMatch ? sectionTagMatch[1] : null
    const scope: PromptScope = resolvedSectionId ? 'selected' : 'all'
    setActionError(null)
    setSendingPrompt(true)
    try {
      const res = await shopWebsiteApi.applyPrompt(token, id, {
        prompt: trimmed,
        scope,
        sectionId: resolvedSectionId,
        creativity: 'balanced',
      })
      if (res.data?.ok && res.data.config) {
        const config = cloneConfig(res.data.config)
        setPreviewConfig(config)
        setStatusText('website.builder.status.applied')
        setStatusSummary(res.data.message || '')
        pushRecent(trimmed)
        setPrompt('')
        setPublishedReloadKey((k) => k + 1)
        await refreshBuilderState()
        return
      }
      setStatusText('website.builder.status.backendError')
      setActionError(res.error || t('website.builder.applyFailed'))
    } catch (error) {
      setStatusText('website.builder.status.backendError')
      setActionError(error instanceof Error ? error.message : t('website.builder.applyFailed'))
    } finally {
      setSendingPrompt(false)
    }
  }

  const handleDeploy = async () => {
    setDeployMessage(null)
    setActionError(null)
    setDeploying(true)
    try {
      const res = await shopWebsiteApi.deploy(token, id)
      if (res.data?.ok) {
        setPublicUrl(res.data.publicUrl)
        setPreviewUrl(res.data.previewUrl)
        setPublishedReloadKey((k) => k + 1)
        setDeployMessage(t('website.builder.deploySuccess'))
        await refreshBuilderState()
        return
      }
      const errorText = res.error || t('website.builder.deployError')
      setDeployMessage(errorText)
      setActionError(errorText)
    } catch (error) {
      const errorText = error instanceof Error ? error.message : t('website.builder.deployError')
      setDeployMessage(errorText)
      setActionError(errorText)
    } finally {
      setDeploying(false)
    }
  }

  const handleRestoreVersion = async (versionId: string) => {
    setActionError(null)
    setRestoringVersionId(versionId)
    try {
      const res = await shopWebsiteApi.restoreVersion(token, id, versionId)
      if (res.data?.ok) {
        setStatusSummary(res.data.summary || t('website.dashboard.restoreSuccess'))
        setStatusText('website.builder.status.savedSection')
        setPublishedReloadKey((k) => k + 1)
        await refreshBuilderState()
        return
      }
      setStatusText('website.builder.status.backendError')
      setActionError(res.error || t('website.builder.restoreFailed'))
    } catch (error) {
      setStatusText('website.builder.status.backendError')
      setActionError(error instanceof Error ? error.message : t('website.builder.restoreFailed'))
    } finally {
      setRestoringVersionId(null)
    }
  }

  const handleDeleteWebsite = async () => {
    if (!deletePassword.trim()) {
      setDeleteMessage(t('website.builder.deletePasswordRequired'))
      return
    }
    setDeleting(true)
    const res = await shopWebsiteApi.deleteWebsite(token, id, { password: deletePassword })
    setDeleting(false)
    if (res.data?.ok) {
      navigate(`/shops/${id}/website`, { replace: true })
      return
    }
    setDeleteMessage(res.error || t('website.builder.deleteFailed'))
  }

  const versions = builderState?.versions || []
  const deployStatus = builderState?.deploy?.status || builderState?.site?.status || 'draft'
  const runtimePreviewSrc = websiteRuntimePreviewUrl(id)
  const openPreviewHref = publicUrl || previewUrl || runtimePreviewSrc
  const websiteAddress = openPreviewHref
  const websiteStatus = deployStatus === 'running' || deployStatus === 'deployed'
    ? t('website.builder.online')
    : t('website.builder.offline')
  const lastUpdated = formatDateShort(
    builderState?.site?.updated_at
      || builderState?.deploy?.updated_at
      || previewConfig?.meta?.updatedAt
      || null
  )

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">{t('website.builder.editTitle')}</h1>
              {statusSummary ? (
                <p className="mt-3 text-sm text-slate-600">{statusSummary}</p>
              ) : (
                <p className="mt-3 text-sm text-slate-600">{t(statusText)}</p>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(deployStatus)}`} />
              <span className={`border px-2.5 py-1 text-xs font-semibold ${deployBadge(deployStatus)}`}>{websiteStatus}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{t('website.builder.tableAddress')}</p>
              <a href={openPreviewHref} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm font-semibold text-blue-600 hover:underline">
                {websiteAddress}
              </a>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{t('website.builder.apiPreviewLabel')}</p>
              <a href={runtimePreviewSrc} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm font-semibold text-blue-600 hover:underline">
                {runtimePreviewSrc}
              </a>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{t('website.builder.tableLastUpdated')}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{lastUpdated}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{t('website.builder.tableVisit')}</p>
              <button
                type="button"
                onClick={() => window.open(openPreviewHref, '_blank', 'noopener,noreferrer')}
                className="mt-1 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('website.common.visit')}
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleDeploy()}
              disabled={deploying}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {deploying ? t('website.builder.deploying') : t('website.builder.deploy')}
            </button>
            {deployMessage ? <p className="text-sm text-slate-600">{deployMessage}</p> : null}
          </div>
          {actionError ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {actionError}
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.85fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">{t('website.builder.previewInteraction')}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-lg border border-slate-200">
                <button
                  type="button"
                  className={`px-3 py-2 text-xs font-medium ${previewVariant === 'interactive' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                  onClick={() => setPreviewVariant('interactive')}
                >
                  {t('website.builder.previewModeInteractive')}
                </button>
                <button
                  type="button"
                  className={`px-3 py-2 text-xs font-medium ${previewVariant === 'published' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                  onClick={() => setPreviewVariant('published')}
                >
                  {t('website.builder.previewModePublished')}
                </button>
              </div>
              <div className="flex overflow-hidden rounded-lg border border-slate-200">
                <button
                  type="button"
                  className={`px-4 py-2 text-xs font-medium ${deviceMode === 'desktop' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                  onClick={() => setDeviceMode('desktop')}
                >
                  {t('website.builder.deviceDesktop')}
                </button>
                <button
                  type="button"
                  className={`border-x border-slate-200 px-4 py-2 text-xs font-medium ${deviceMode === 'tablet' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                  onClick={() => setDeviceMode('tablet')}
                >
                  {t('website.builder.deviceTablet')}
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-xs font-medium ${deviceMode === 'mobile' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                  onClick={() => setDeviceMode('mobile')}
                >
                  {t('website.builder.deviceMobile')}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-none border border-slate-200 bg-slate-50 p-4">
            {loading ? (
              <div className="flex h-[760px] items-center justify-center rounded-none border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                {t('website.common.loading')}
              </div>
            ) : (
              <WebsitePreviewFrame
                config={previewConfig}
                deviceMode={deviceMode}
                selectedSectionId={selectedSectionId}
                onSelectSection={selectSection}
                variant={previewVariant}
                publishedSrc={runtimePreviewSrc}
                publishedReloadKey={publishedReloadKey}
              />
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-950">{t('website.builder.promptTitle')}</h2>

            <div>
              <textarea
                id="website-prompt-input"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={12}
                className="w-full resize-none rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={t('website.builder.promptPlaceholder')}
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className={`inline-block h-2 w-2 rounded-full ${currentScope === 'selected' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
              {currentScope === 'selected'
                ? t('website.builder.scopeIndicatorSection').replace('{id}', promptSectionId || '')
                : t('website.builder.scopeIndicatorWholePage')}
            </div>

            <button
              type="button"
              className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              onClick={() => void handleSendPrompt()}
              disabled={sendingPrompt || loading || !prompt.trim()}
            >
              {sendingPrompt ? t('website.builder.applying') : t('website.builder.sendPrompt')}
            </button>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-sm font-semibold text-slate-950">{t('website.builder.versionRail')}</h3>
              <div className="mt-4 space-y-2">
                {versions.length === 0 ? (
                  <div className="rounded-none border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
                    {t('website.builder.noVersions')}
                  </div>
                ) : (
                  versions.slice(0, 6).map((version) => (
                    <div key={version.id} className="rounded-none border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-900">{version.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateShort(version.createdAt)}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-600">{version.summary || version.source}</p>
                      <button
                        type="button"
                        onClick={() => void handleRestoreVersion(version.id)}
                        disabled={restoringVersionId === version.id}
                        className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {restoringVersionId === version.id ? t('website.dashboard.restoring') : t('website.dashboard.restoreVersion')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{t('website.builder.recentPrompts')}</p>
              <div className="space-y-2">
                {recentPrompts.length === 0 ? (
                  <div className="rounded-none border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
                    {t('website.builder.noPromptHistory')}
                  </div>
                ) : (
                  recentPrompts.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="block w-full rounded-none border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs text-slate-700 hover:bg-white"
                      onClick={() => setPrompt(item)}
                    >
                      {item}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <p className="mb-3 text-xs text-slate-600">{t('website.builder.singleSiteHint')}</p>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteForm((prev) => !prev)
                  setDeleteMessage(null)
                }}
                className="w-full rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                {t('website.builder.deleteWebsite')}
              </button>

              {showDeleteForm ? (
                <div className="mt-4 space-y-3 border border-rose-200 bg-rose-50 p-4">
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    placeholder={t('website.builder.deletePasswordPlaceholder')}
                    className="w-full rounded-lg border border-rose-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                  />
                  <button
                    type="button"
                    onClick={() => void handleDeleteWebsite()}
                    disabled={deleting}
                    className="w-full rounded-lg bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {deleting ? t('website.builder.deleting') : t('website.builder.confirmDeleteWebsite')}
                  </button>
                  {deleteMessage ? <p className="text-sm text-rose-700">{deleteMessage}</p> : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
