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
import WebsitePreviewFrame from '../../components/shop/WebsitePreviewFrame'

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

  if (!id) return <p className="text-sm text-slate-500">{t('website.common.missingShopId')}</p>
  if (!token) return null

  const recentKey = `aimap-web-builder-recent-${id}`

  const refreshBuilderState = async () => {
    const res = await shopWebsiteApi.getBuilderState(token, id)
    if (!res.data) return null
    const data = res.data
    const config = cloneConfig(data.config)
    setBuilderState(data)
    setPreviewConfig(config)
    setPublicUrl(data.publicUrl)
    setPreviewUrl(data.previewUrl)
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
      setLoading(true)
      const entryRes = await shopWebsiteApi.getEntry(token, id)
      if (cancelled) return
      if (!entryRes.data?.sites?.length) {
        navigate(`/shops/${id}/website`, { replace: true })
        return
      }

      const data = await refreshBuilderState()
      if (cancelled) return
      if (data) setStatusSummary('')
      setLoading(false)
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

  const handleSendPrompt = async () => {
    const trimmed = prompt.trim()
    if (!trimmed) return
    const scope: PromptScope = selectedSectionId ? 'selected' : 'all'
    setSendingPrompt(true)
    const res = await shopWebsiteApi.applyPrompt(token, id, {
      prompt: trimmed,
      scope,
      sectionId: selectedSectionId,
      creativity: 'balanced',
    })
    setSendingPrompt(false)
    if (res.data?.ok && res.data.config) {
      const config = cloneConfig(res.data.config)
      setPreviewConfig(config)
      setStatusText('website.builder.status.applied')
      setStatusSummary(res.data.message || '')
      pushRecent(trimmed)
      setPrompt('')
      await refreshBuilderState()
      return
    }
    setStatusText('website.builder.status.backendError')
  }

  const handleRestoreVersion = async (versionId: string) => {
    setRestoringVersionId(versionId)
    const res = await shopWebsiteApi.restoreVersion(token, id, versionId)
    setRestoringVersionId(null)
    if (res.data?.ok) {
      setStatusSummary(res.data.summary || 'Version restored.')
      setStatusText('website.builder.status.savedSection')
      await refreshBuilderState()
      return
    }
    setStatusText('website.builder.status.backendError')
  }

  const handleDeleteWebsite = async () => {
    if (!deletePassword.trim()) {
      setDeleteMessage('Hãy nhập mật khẩu để xác nhận xoá web.')
      return
    }
    setDeleting(true)
    const res = await shopWebsiteApi.deleteWebsite(token, id, { password: deletePassword })
    setDeleting(false)
    if (res.data?.ok) {
      navigate(`/shops/${id}/website`, { replace: true })
      return
    }
    setDeleteMessage(res.error || 'Không thể xoá website.')
  }

  const versions = builderState?.versions || []
  const deployStatus = builderState?.deploy?.status || builderState?.site?.status || 'draft'
  const websiteAddress = publicUrl || previewUrl || '-'
  const websiteStatus = deployStatus === 'running' || deployStatus === 'deployed' ? 'Online' : 'Offline'
  const lastUpdated = formatDateShort(
    builderState?.site?.updated_at
      || builderState?.deploy?.updated_at
      || previewConfig?.meta?.updatedAt
      || null
  )

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <section className="overflow-hidden rounded-none border border-slate-200 bg-white">
        <div className="p-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Website edit</h1>
          {statusSummary ? <p className="mt-3 text-sm text-slate-600">{statusSummary}</p> : <p className="mt-3 text-sm text-slate-600">{t(statusText)}</p>}
          <div className="mt-5 overflow-hidden border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-sm text-slate-600">
                  <th className="px-4 py-3 font-medium">Địa chỉ web</th>
                  <th className="px-4 py-3 font-medium">Truy cập</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium">Lần cập nhật cuối</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr className="text-sm text-slate-700">
                  <td className="px-4 py-4 font-medium text-slate-950">
                    {(publicUrl || previewUrl) ? (
                      <a href={publicUrl || previewUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                        {websiteAddress}
                      </a>
                    ) : websiteAddress}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => window.open(publicUrl || previewUrl, '_blank', 'noopener,noreferrer')}
                      disabled={!publicUrl && !previewUrl}
                      className="border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Truy cập
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`border px-2.5 py-1 text-xs font-semibold ${deployBadge(deployStatus)}`}>
                      {websiteStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4">{lastUpdated}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.85fr)]">
        <section className="rounded-none border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">Preview và tương tác</h2>
            <div className="flex overflow-hidden border border-slate-200">
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
              />
            )}
          </div>
        </section>

        <section className="rounded-none border border-slate-200 bg-white p-6">
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-950">Prompt</h2>

            <div>
              <textarea
                id="website-prompt-input"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={12}
                className="w-full resize-none rounded-none border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={t('website.builder.promptPlaceholder')}
              />
            </div>

            <button
              type="button"
              className="w-full rounded-none bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              onClick={() => void handleSendPrompt()}
              disabled={sendingPrompt}
            >
              {sendingPrompt ? t('website.builder.applying') : 'Gửi prompt'}
            </button>

            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-sm font-semibold text-slate-950">Version rail</h3>
              <div className="mt-4 space-y-2">
                {versions.length === 0 ? (
                  <div className="rounded-none border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
                    Chưa có phiên bản nào.
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
                        className="mt-3 rounded-none border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
              <p className="mb-3 text-xs text-slate-600">Mỗi shop chỉ một website. Xoá web để quay về màn hình tạo mới.</p>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteForm((prev) => !prev)
                  setDeleteMessage(null)
                }}
                className="w-full rounded-none border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                Xoá web
              </button>

              {showDeleteForm ? (
                <div className="mt-4 space-y-3 border border-rose-200 bg-rose-50 p-4">
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                    placeholder="Nhập mật khẩu để xác nhận xoá web"
                    className="w-full rounded-none border border-rose-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200"
                  />
                  <button
                    type="button"
                    onClick={() => void handleDeleteWebsite()}
                    disabled={deleting}
                    className="w-full rounded-none bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {deleting ? 'Đang xoá...' : 'Xác nhận xoá web'}
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
