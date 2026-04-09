import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import { assetStorageUrl } from '../../api/client'
import {
  shopWebsiteApi,
  type PromptPreviewBody,
  type WebsiteBuilderState,
  type WebsiteConfig,
  type WebsiteDeviceMode,
  type WebsiteTemplate,
  type WebsiteTheme,
  type WebsiteTone,
} from '../../api/shopWebsite'
import WebsitePreviewFrame from '../../components/shop/WebsitePreviewFrame'

type PromptScope = PromptPreviewBody['scope']
type Creativity = PromptPreviewBody['creativity']

const QUICK_CHIP_KEYS = [
  'website.builder.quickChip.primaryBlue',
  'website.builder.quickChip.addReview',
  'website.builder.quickChip.shortenHero',
  'website.builder.quickChip.optimizeMobile',
]

function cloneConfig(config: WebsiteConfig): WebsiteConfig {
  return JSON.parse(JSON.stringify(config)) as WebsiteConfig
}

function deployBadge(status: string | null | undefined): string {
  if (status === 'running' || status === 'deployed') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (status === 'building') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (status === 'error') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

export default function ShopWebsiteBuilderPage() {
  const { t } = useLocale()
  const { token } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [deviceMode, setDeviceMode] = useState<WebsiteDeviceMode>('desktop')
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<'setup' | 'prompt'>('setup')
  const [prompt, setPrompt] = useState('')
  const [scope, setScope] = useState<PromptScope>('all')
  const [creativity, setCreativity] = useState<Creativity>('balanced')
  const [recentPrompts, setRecentPrompts] = useState<string[]>([])
  const [statusText, setStatusText] = useState('website.builder.status.ready')
  const [statusSummary, setStatusSummary] = useState('')
  const [builderState, setBuilderState] = useState<WebsiteBuilderState | null>(null)
  const [currentConfig, setCurrentConfig] = useState<WebsiteConfig | null>(null)
  const [previewConfig, setPreviewConfig] = useState<WebsiteConfig | null>(null)
  const [publicUrl, setPublicUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [idea, setIdea] = useState('')
  const [template, setTemplate] = useState<WebsiteTemplate>('catalog')
  const [tone, setTone] = useState<WebsiteTone>('balanced')
  const [palette, setPalette] = useState<WebsiteTheme>({
    primary: '#0f172a',
    accent: '#2563eb',
    background: '#f8fafc',
    surface: '#ffffff',
  })
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [previewingPrompt, setPreviewingPrompt] = useState(false)
  const [applyingPrompt, setApplyingPrompt] = useState(false)
  const [promptAffectedSections, setPromptAffectedSections] = useState<string[]>([])
  const [deploying, setDeploying] = useState(false)
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null)

  if (!id) return <p className="text-sm text-slate-500">{t('website.common.missingShopId')}</p>
  if (!token) return null
  const recentKey = `aimap-web-builder-recent-${id}`

  const refreshBuilderState = async () => {
    const res = await shopWebsiteApi.getBuilderState(token, id)
    if (!res.data) return null
    const data = res.data
    const config = cloneConfig(data.config)
    setBuilderState(data)
    setCurrentConfig(config)
    setPreviewConfig(config)
    setPublicUrl(data.publicUrl)
    setPreviewUrl(data.previewUrl)
    setIdea(data.config.meta?.lastIdea || data.shop.description || '')
    setTemplate(data.selectedTemplate)
    setTone(data.config.settings.tone)
    setPalette(data.theme)
    setSelectedAssetIds(data.config.selectedAssetIds || [])
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
      const res = await shopWebsiteApi.getBuilderState(token, id)
      if (cancelled) return
      if (res.data) {
        const config = cloneConfig(res.data.config)
        setBuilderState(res.data)
        setCurrentConfig(config)
        setPreviewConfig(config)
        setPublicUrl(res.data.publicUrl)
        setPreviewUrl(res.data.previewUrl)
        setIdea(res.data.config.meta?.lastIdea || res.data.shop.description || '')
        setTemplate(res.data.selectedTemplate)
        setTone(res.data.config.settings.tone)
        setPalette(res.data.theme)
        setSelectedAssetIds(res.data.config.selectedAssetIds || [])
        setSelectedSectionId(res.data.sections[0]?.id || null)
        setStatusSummary('')
      }
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

  const applyChip = (chip: string) => {
    setPrompt((prev) => (prev ? `${prev}\n${chip}` : chip))
  }

  const selectSection = (sectionId: string) => {
    const tag = `@section:${sectionId}`
    setSelectedSectionId(sectionId)
    setActiveStep('prompt')
    setScope('selected')
    setPrompt((prev) => {
      if (prev.includes(tag)) return prev
      const prefix = t('website.builder.promptEditPrefix')
      return prev ? `${prev}\n${prefix} ${tag}: ` : `${prefix} ${tag}: `
    })
  }

  const selectedSection = useMemo(
    () => previewConfig?.sections.find((section) => section.id === selectedSectionId) || null,
    [previewConfig, selectedSectionId]
  )

  const versions = builderState?.versions || []
  const deployStatus = builderState?.deploy?.status || builderState?.site?.status || 'draft'

  const saveThemeAndIdea = async (mode: 'create' | 'rebuild') => {
    const body = {
      idea,
      template,
      tone,
      palette,
      selectedAssetIds,
    }
    setCreatingDraft(true)
    const res = mode === 'create'
      ? await shopWebsiteApi.createFromIdea(token, id, body)
      : await shopWebsiteApi.rebuild(token, id, body)
    setCreatingDraft(false)
    if (res.data?.config) {
      const config = cloneConfig(res.data.config)
      setCurrentConfig(config)
      setPreviewConfig(config)
      setTemplate(config.template)
      setTone(config.settings.tone)
      setPalette(config.theme)
      setSelectedAssetIds(config.selectedAssetIds)
      setSelectedSectionId(config.sections[0]?.id || null)
      setStatusText('website.builder.status.generated')
      setStatusSummary(res.data.summary || '')
      await refreshBuilderState()
      return
    }
    setStatusText('website.builder.status.backendError')
  }

  const handlePreview = async () => {
    const trimmed = prompt.trim()
    if (!trimmed) return
    setPreviewingPrompt(true)
    const res = await shopWebsiteApi.previewPrompt(token, id, {
      prompt: trimmed,
      scope,
      sectionId: selectedSectionId,
      creativity,
    })
    setPreviewingPrompt(false)
    if (res.data?.draftConfig) {
      setPreviewConfig(cloneConfig(res.data.draftConfig))
      setPromptAffectedSections(res.data.affectedSections || [])
      setStatusText('website.builder.status.previewed')
      setStatusSummary(res.data.summary || '')
      if (res.data.draftPreviewUrl) setPreviewUrl(res.data.draftPreviewUrl)
      return
    }
    setStatusText('website.builder.status.backendError')
  }

  const handleApply = async () => {
    const trimmed = prompt.trim()
    if (!trimmed) return
    setApplyingPrompt(true)
    const res = await shopWebsiteApi.applyPrompt(token, id, {
      prompt: trimmed,
      scope,
      sectionId: selectedSectionId,
      creativity,
    })
    setApplyingPrompt(false)
    if (res.data?.ok && res.data.config) {
      const config = cloneConfig(res.data.config)
      setCurrentConfig(config)
      setPreviewConfig(config)
      setPromptAffectedSections(res.data.affectedSections || [])
      setStatusText('website.builder.status.applied')
      setStatusSummary(res.data.message || '')
      pushRecent(trimmed)
      await refreshBuilderState()
      return
    }
    setStatusText('website.builder.status.backendError')
  }

  const handleDeploy = async () => {
    setDeploying(true)
    const res = await shopWebsiteApi.deploy(token, id)
    setDeploying(false)
    if (res.data?.ok) {
      setStatusSummary('Draft deployed successfully.')
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

  const charCount = prompt.length
  const assets = builderState?.assets || []

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <section className="overflow-hidden rounded-none border border-slate-200 bg-white">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_320px]">
          <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-none border px-3 py-1 text-xs font-semibold ${deployBadge(deployStatus)}`}>
                {deployStatus}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Website edit</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Preview là vùng làm việc chính. User click trực tiếp vào section để lấy tag sửa bằng prompt, còn panel bên phải chỉ giữ 2
              bước: chốt định hướng ban đầu và tinh chỉnh bằng prompt.
            </p>
            {statusSummary ? <p className="mt-4 text-sm text-slate-600">{statusSummary}</p> : <p className="mt-4 text-sm text-slate-600">{t(statusText)}</p>}
          </div>

          <div className="p-6">
            <p className="text-sm font-semibold text-slate-900">Tóm tắt nhanh</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-none border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Section đang chọn</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedSection?.name || 'Chưa chọn section nào'}</p>
              </div>
              <div className="rounded-none border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Prompt tag</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedSectionId ? `@section:${selectedSectionId}` : 'Click vào preview để lấy tag'}</p>
              </div>
              <div className="rounded-none border border-slate-200 p-4">
                <p className="text-xs text-slate-500">URLs</p>
                <p className="mt-1 break-all text-sm font-semibold text-slate-900">{previewUrl || publicUrl || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.85fr)]">
        <section className="rounded-none border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Preview và tương tác</h2>
              <p className="mt-1 text-sm text-slate-600">Click trực tiếp vào section để chèn tag code vào prompt flow ở bên phải.</p>
            </div>
            <div className="flex overflow-hidden rounded-none border border-slate-200">
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

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-none border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Selected section</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{selectedSection?.name || 'None'}</p>
            </div>
            <div className="rounded-none border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Prompt tag</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{selectedSectionId ? `@section:${selectedSectionId}` : 'Pick a section first'}</p>
            </div>
            <div className="rounded-none border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Preview URL</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">{previewUrl || '-'}</p>
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
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Bảng điều khiển chỉnh sửa</h2>
              <p className="mt-1 text-sm text-slate-600">Gộp định hướng website và prompt studio vào cùng một khối, chia theo 2 bước rõ ràng.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActiveStep('setup')}
                className={`rounded-none border px-4 py-4 text-left ${
                  activeStep === 'setup' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-800'
                }`}
              >
                <p className={`text-xs ${activeStep === 'setup' ? 'text-slate-300' : 'text-slate-500'}`}>Hộp số 1</p>
                <p className="mt-1 text-sm font-semibold">Khởi tạo định hướng</p>
              </button>
              <button
                type="button"
                onClick={() => setActiveStep('prompt')}
                className={`rounded-none border px-4 py-4 text-left ${
                  activeStep === 'prompt' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-800'
                }`}
              >
                <p className={`text-xs ${activeStep === 'prompt' ? 'text-slate-300' : 'text-slate-500'}`}>Hộp số 2</p>
                <p className="mt-1 text-sm font-semibold">Prompt và tinh chỉnh</p>
              </button>
            </div>

            {activeStep === 'setup' ? (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Định hướng website</label>
                  <textarea
                    value={idea}
                    onChange={(event) => setIdea(event.target.value)}
                    rows={5}
                    className="w-full resize-none rounded-none border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder={t('website.builder.ideaPlaceholder')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Template</label>
                    <select
                      value={template}
                      onChange={(event) => setTemplate(event.target.value as WebsiteTemplate)}
                      className="w-full rounded-none border border-slate-200 px-3 py-3 text-sm"
                    >
                      <option value="catalog">{t('website.builder.template.catalog')}</option>
                      <option value="story">{t('website.builder.template.story')}</option>
                      <option value="minimal">{t('website.builder.template.minimal')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Tone</label>
                    <select
                      value={tone}
                      onChange={(event) => setTone(event.target.value as WebsiteTone)}
                      className="w-full rounded-none border border-slate-200 px-3 py-3 text-sm"
                    >
                      <option value="balanced">{t('website.builder.tone.balanced')}</option>
                      <option value="friendly">{t('website.builder.tone.friendly')}</option>
                      <option value="luxury">{t('website.builder.tone.luxury')}</option>
                      <option value="energetic">{t('website.builder.tone.energetic')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Palette</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['primary', 'accent', 'background', 'surface'] as Array<keyof WebsiteTheme>).map((key) => (
                      <label key={key} className="rounded-none border border-slate-200 p-3 text-xs text-slate-600">
                        <span className="mb-2 block font-medium">{key}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={palette[key]}
                            onChange={(event) => setPalette((prev) => ({ ...prev, [key]: event.target.value }))}
                            className="h-10 w-10 rounded-none border border-slate-200 bg-transparent p-0"
                          />
                          <input
                            type="text"
                            value={palette[key]}
                            onChange={(event) => setPalette((prev) => ({ ...prev, [key]: event.target.value }))}
                            className="w-full rounded-none border border-slate-200 px-3 py-2 text-xs"
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-950">Assets cho website</h3>
                    <span className="rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
                      {selectedAssetIds.length} active
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {assets.length === 0 ? (
                      <div className="col-span-2 rounded-none border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
                        {t('website.builder.noAssets')}
                      </div>
                    ) : (
                      assets.slice(0, 6).map((asset) => {
                        const active = selectedAssetIds.includes(asset.id)
                        return (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => setSelectedAssetIds((prev) => (
                              prev.includes(asset.id)
                                ? prev.filter((item) => item !== asset.id)
                                : [...prev, asset.id]
                            ))}
                            className={`overflow-hidden rounded-none border text-left transition ${
                              active ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200'
                            }`}
                          >
                            <div className="h-24 bg-slate-100">
                              {asset.storage_path_or_url ? (
                                <img
                                  src={assetStorageUrl(asset.storage_path_or_url)}
                                  alt={asset.name || ''}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="p-3">
                              <p className="truncate text-xs font-semibold text-slate-800">{asset.name || asset.type || 'Asset'}</p>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => void saveThemeAndIdea('create')}
                    disabled={creatingDraft || loading}
                    className="rounded-none bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {creatingDraft ? t('website.builder.generating') : t('website.builder.generateDraft')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveThemeAndIdea('rebuild')}
                    disabled={creatingDraft || loading}
                    className="rounded-none border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t('website.builder.rebuildDraft')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-none border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Section được lấy từ preview</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{selectedSection?.name || 'Chưa chọn section nào'}</p>
                  <p className="mt-2 text-xs text-slate-600">{selectedSectionId ? `@section:${selectedSectionId}` : 'Click vào vùng preview để sinh tag sửa.'}</p>
                </div>

                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Section tags</p>
                  <div className="flex flex-wrap gap-2">
                    {(previewConfig?.sections || []).map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => selectSection(section.id)}
                        className={`rounded-none border px-3 py-1.5 text-xs ${
                          section.id === selectedSectionId
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {section.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Quick prompt ideas</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_CHIP_KEYS.map((chipKey) => (
                      <button
                        key={chipKey}
                        type="button"
                        className="rounded-none border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        onClick={() => applyChip(t(chipKey))}
                      >
                        {t(chipKey)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="website-prompt-input">
                    Prompt with explicit scope
                  </label>
                  <textarea
                    id="website-prompt-input"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={9}
                    className="w-full resize-none rounded-none border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder={t('website.builder.promptPlaceholder')}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {charCount} {t('website.builder.characters')} · {charCount < 20 ? t('website.builder.promptTooShort') : t('website.builder.promptLengthOk')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Scope</label>
                    <select
                      value={scope}
                      onChange={(event) => setScope(event.target.value as PromptScope)}
                      className="w-full rounded-none border border-slate-200 px-3 py-3 text-sm"
                    >
                      <option value="all">{t('website.builder.scopeAll')}</option>
                      <option value="selected">{t('website.builder.scopeSelected')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">Creativity</label>
                    <select
                      value={creativity}
                      onChange={(event) => setCreativity(event.target.value as Creativity)}
                      className="w-full rounded-none border border-slate-200 px-3 py-3 text-sm"
                    >
                      <option value="safe">{t('website.builder.creativitySafe')}</option>
                      <option value="balanced">{t('website.builder.creativityBalanced')}</option>
                      <option value="creative">{t('website.builder.creativityCreative')}</option>
                    </select>
                  </div>
                </div>

                {promptAffectedSections.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Affected sections</p>
                    <div className="flex flex-wrap gap-2">
                      {promptAffectedSections.map((sectionId) => (
                        <button
                          key={sectionId}
                          type="button"
                          onClick={() => selectSection(sectionId)}
                          className="rounded-none border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                        >
                          {sectionId}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="rounded-none border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    onClick={() => void handlePreview()}
                    disabled={previewingPrompt}
                  >
                    {previewingPrompt ? t('website.builder.previewing') : t('website.builder.previewChange')}
                  </button>
                  <button
                    type="button"
                    className="rounded-none bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    onClick={() => void handleApply()}
                    disabled={applyingPrompt}
                  >
                    {applyingPrompt ? t('website.builder.applying') : t('website.builder.apply')}
                  </button>
                  <button
                    type="button"
                    className="rounded-none border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      if (!currentConfig) return
                      setPreviewConfig(cloneConfig(currentConfig))
                      setStatusText('website.builder.status.ready')
                      setStatusSummary('')
                    }}
                  >
                    {t('website.builder.resetPreview')}
                  </button>
                  <button
                    type="button"
                    className="rounded-none border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => setPrompt('')}
                  >
                    {t('website.builder.clearPrompt')}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleDeploy()}
                  disabled={deploying}
                  className="w-full rounded-none border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {deploying ? t('website.dashboard.deploying') : 'Deploy current draft'}
                </button>

                <div className="border-t border-slate-100 pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">Version rail</h3>
                      <p className="mt-1 text-xs text-slate-500">Theo dõi các lần generate, prompt apply và restore từ server.</p>
                    </div>
                    <span className={`rounded-none border px-2.5 py-1 text-[11px] font-semibold ${deployBadge(deployStatus)}`}>
                      {deployStatus}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {versions.length === 0 ? (
                      <div className="rounded-none border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
                        No server versions yet.
                      </div>
                    ) : (
                      versions.slice(0, 6).map((version) => (
                        <div key={version.id} className="rounded-none border border-slate-200 p-4">
                          <p className="text-sm font-semibold text-slate-900">{version.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{version.createdAt}</p>
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
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
