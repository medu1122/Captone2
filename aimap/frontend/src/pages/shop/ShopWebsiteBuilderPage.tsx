import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import { assetStorageUrl } from '../../api/client'
import {
  shopWebsiteApi,
  type PromptPreviewBody,
  type WebsiteBuilderState,
  type WebsiteConfig,
  type WebsiteDeviceMode,
  type WebsiteSection,
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

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function cloneConfig(config: WebsiteConfig): WebsiteConfig {
  return JSON.parse(JSON.stringify(config)) as WebsiteConfig
}

function sectionFields(section: WebsiteSection): Array<{ key: string; value: string; multiline: boolean }> {
  const props = isObject(section.props) ? section.props : {}
  return Object.keys(props).map((key) => {
    const raw = props[key]
    if (typeof raw === 'string' || typeof raw === 'number') {
      return { key, value: String(raw), multiline: String(raw).length > 80 || key.toLowerCase().includes('body') }
    }
    return { key, value: JSON.stringify(raw ?? '', null, 2), multiline: true }
  })
}

function parseFieldValue(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return value
    }
  }
  return value
}

export default function ShopWebsiteBuilderPage() {
  const { t } = useLocale()
  const { token } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [deviceMode, setDeviceMode] = useState<WebsiteDeviceMode>('desktop')
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [scope, setScope] = useState<PromptScope>('all')
  const [creativity, setCreativity] = useState<Creativity>('balanced')
  const [copyDone, setCopyDone] = useState(false)
  const [recentPrompts, setRecentPrompts] = useState<string[]>([])
  const [statusText, setStatusText] = useState('website.builder.status.ready')
  const [statusSummary, setStatusSummary] = useState('')
  const [builderState, setBuilderState] = useState<WebsiteBuilderState | null>(null)
  const [currentConfig, setCurrentConfig] = useState<WebsiteConfig | null>(null)
  const [previewConfig, setPreviewConfig] = useState<WebsiteConfig | null>(null)
  const [fieldState, setFieldState] = useState<Record<string, string>>({})
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
  const [savingSection, setSavingSection] = useState(false)
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [previewingPrompt, setPreviewingPrompt] = useState(false)
  const [applyingPrompt, setApplyingPrompt] = useState(false)
  const [promptAffectedSections, setPromptAffectedSections] = useState<string[]>([])

  if (!id) return <p className="text-sm text-slate-500">{t('website.common.missingShopId')}</p>
  if (!token) return null
  const recentKey = `aimap-web-builder-recent-${id}`

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
  }, [id, token])

  useEffect(() => {
    if (!previewConfig || !selectedSectionId) {
      setFieldState({})
      return
    }
    const section = previewConfig.sections.find((item) => item.id === selectedSectionId)
    if (!section) {
      setFieldState({})
      return
    }
    const nextFields = sectionFields(section).reduce<Record<string, string>>((acc, field) => {
      acc[field.key] = field.value
      return acc
    }, {})
    setFieldState(nextFields)
  }, [previewConfig, selectedSectionId])

  const pushRecent = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const next = [trimmed, ...recentPrompts.filter((item) => item !== trimmed)].slice(0, 8)
    setRecentPrompts(next)
    localStorage.setItem(recentKey, JSON.stringify(next))
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

  const applyChip = (chip: string) => {
    setPrompt((prev) => (prev ? `${prev}\n${chip}` : chip))
  }

  const selectSection = (sectionId: string) => {
    const tag = `@section:${sectionId}`
    setSelectedSectionId(sectionId)
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
      const state = await shopWebsiteApi.getBuilderState(token, id)
      if (state.data) {
        setBuilderState(state.data)
        setPublicUrl(state.data.publicUrl)
        setPreviewUrl(state.data.previewUrl)
      }
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
      const state = await shopWebsiteApi.getBuilderState(token, id)
      if (state.data) {
        setBuilderState(state.data)
        setPublicUrl(state.data.publicUrl)
        setPreviewUrl(state.data.previewUrl)
      }
      return
    }
    setStatusText('website.builder.status.backendError')
  }

  const handleSaveSection = async () => {
    if (!selectedSectionId || !selectedSection) return
    const props = Object.keys(fieldState).reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = parseFieldValue(fieldState[key])
      return acc
    }, {})
    setSavingSection(true)
    const res = await shopWebsiteApi.updateSection(token, id, selectedSectionId, {
      props,
      theme: palette,
      settings: { tone },
      selectedAssetIds,
    })
    setSavingSection(false)
    if (res.data?.config) {
      const config = cloneConfig(res.data.config)
      setCurrentConfig(config)
      setPreviewConfig(config)
      setStatusText('website.builder.status.savedSection')
      setStatusSummary(res.data.summary || '')
      return
    }
    setStatusText('website.builder.status.backendError')
  }

  const handleMoveSection = async (direction: 'up' | 'down') => {
    if (!selectedSectionId) return
    setSavingSection(true)
    const res = await shopWebsiteApi.updateSection(token, id, selectedSectionId, {
      moveDirection: direction,
      theme: palette,
      settings: { tone },
      selectedAssetIds,
    })
    setSavingSection(false)
    if (res.data?.config) {
      const config = cloneConfig(res.data.config)
      setCurrentConfig(config)
      setPreviewConfig(config)
      setStatusText('website.builder.status.savedSection')
      setStatusSummary(res.data.summary || '')
      return
    }
    setStatusText('website.builder.status.backendError')
  }

  const charCount = prompt.length
  const assets = builderState?.assets || []

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{t('website.builder.title')}</h1>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                {t('website.builder.manualFirstBadge')}
              </span>
            </div>
            <p className="text-sm text-slate-600">{t(statusText)}</p>
            {statusSummary ? <p className="mt-1 text-xs text-slate-500">{statusSummary}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/shops/${id}/website`}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {t('website.builder.backToDashboard')}
            </Link>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}
              disabled={!publicUrl}
            >
              {t('website.builder.openPublicUrl')}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
              disabled={!previewUrl}
            >
              {t('website.builder.openPreviewUrl')}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => void copyUrl(previewUrl)}
            >
              {copyDone ? t('website.common.copied') : t('website.builder.copyUrl')}
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-slate-900">{t('website.builder.directionTitle')}</p>
              <p className="mt-1 text-xs text-slate-500">{t('website.builder.directionHint')}</p>
              <textarea
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                rows={4}
                className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={t('website.builder.ideaPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">{t('website.builder.templateLabel')}</label>
                <select
                  value={template}
                  onChange={(event) => setTemplate(event.target.value as WebsiteTemplate)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                >
                  <option value="catalog">{t('website.builder.template.catalog')}</option>
                  <option value="story">{t('website.builder.template.story')}</option>
                  <option value="minimal">{t('website.builder.template.minimal')}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">{t('website.builder.toneLabel')}</label>
                <select
                  value={tone}
                  onChange={(event) => setTone(event.target.value as WebsiteTone)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                >
                  <option value="balanced">{t('website.builder.tone.balanced')}</option>
                  <option value="friendly">{t('website.builder.tone.friendly')}</option>
                  <option value="luxury">{t('website.builder.tone.luxury')}</option>
                  <option value="energetic">{t('website.builder.tone.energetic')}</option>
                </select>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs text-slate-500">{t('website.builder.paletteLabel')}</p>
              <div className="grid grid-cols-2 gap-3">
                {(['primary', 'accent', 'background', 'surface'] as Array<keyof WebsiteTheme>).map((key) => (
                  <label key={key} className="rounded-xl border border-slate-200 p-2 text-xs text-slate-600">
                    <span className="mb-1 block">{t(`website.builder.palette.${key}`)}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={palette[key]}
                        onChange={(event) => setPalette((prev) => ({ ...prev, [key]: event.target.value }))}
                        className="h-9 w-10 rounded border border-slate-200 bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={palette[key]}
                        onChange={(event) => setPalette((prev) => ({ ...prev, [key]: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{t('website.builder.assetPickerTitle')}</p>
                <span className="text-xs text-slate-500">{selectedAssetIds.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {assets.length === 0 ? (
                  <div className="col-span-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
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
                        className={`overflow-hidden rounded-xl border text-left ${active ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200'}`}
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
                        <div className="p-2">
                          <p className="truncate text-xs font-medium text-slate-800">{asset.name || asset.type || 'Asset'}</p>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void saveThemeAndIdea('create')}
                disabled={creatingDraft || loading}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {creatingDraft ? t('website.builder.generating') : t('website.builder.generateDraft')}
              </button>
              <button
                type="button"
                onClick={() => void saveThemeAndIdea('rebuild')}
                disabled={creatingDraft || loading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {t('website.builder.rebuildDraft')}
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{t('website.builder.sectionEditorTitle')}</p>
                {selectedSection ? (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                    {selectedSection.name}
                  </span>
                ) : null}
              </div>
              <div className="space-y-2">
                {previewConfig?.sections.map((section) => {
                  const active = section.id === selectedSectionId
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setSelectedSectionId(section.id)}
                      className={`block w-full rounded-xl border px-3 py-2 text-left text-sm ${
                        active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{section.name}</span>
                        <span className={`text-[11px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>{section.type}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
              {selectedSection ? (
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleMoveSection('up')}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      {t('website.builder.moveUp')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMoveSection('down')}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      {t('website.builder.moveDown')}
                    </button>
                  </div>
                  {sectionFields(selectedSection).map((field) => (
                    <div key={field.key}>
                      <label className="mb-1 block text-xs text-slate-500">{field.key}</label>
                      {field.multiline ? (
                        <textarea
                          rows={field.value.length > 120 ? 5 : 3}
                          value={fieldState[field.key] ?? ''}
                          onChange={(event) => setFieldState((prev) => ({ ...prev, [field.key]: event.target.value }))}
                          className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      ) : (
                        <input
                          type="text"
                          value={fieldState[field.key] ?? ''}
                          onChange={(event) => setFieldState((prev) => ({ ...prev, [field.key]: event.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => void handleSaveSection()}
                    disabled={savingSection}
                    className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {savingSection ? t('website.builder.savingSection') : t('website.builder.saveSection')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">{t('website.builder.previewInteraction')}</p>
              <p className="text-xs text-slate-500">{t('website.builder.clickSectionHint')}</p>
            </div>
            <div className="flex overflow-hidden rounded-lg border border-slate-200">
              <button
                type="button"
                className={`px-3 py-1 text-xs ${deviceMode === 'desktop' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                onClick={() => setDeviceMode('desktop')}
              >
                {t('website.builder.deviceDesktop')}
              </button>
              <button
                type="button"
                className={`border-x border-slate-200 px-3 py-1 text-xs ${deviceMode === 'tablet' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                onClick={() => setDeviceMode('tablet')}
              >
                {t('website.builder.deviceTablet')}
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-xs ${deviceMode === 'mobile' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                onClick={() => setDeviceMode('mobile')}
              >
                {t('website.builder.deviceMobile')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            {loading ? (
              <div className="flex h-[760px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
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

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">{t('website.builder.promptStudio')}</p>

          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-500">{t('website.builder.quickTemplate')}</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_CHIP_KEYS.map((chipKey) => (
                <button
                  key={chipKey}
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => applyChip(t(chipKey))}
                >
                  {t(chipKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <label className="text-xs text-slate-500" htmlFor="website-prompt-input">
              {t('website.builder.promptLabel')}
            </label>
            <textarea
              id="website-prompt-input"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={8}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={t('website.builder.promptPlaceholder')}
            />
            <p className="text-xs text-slate-500">
              {charCount} {t('website.builder.characters')} · {charCount < 20 ? t('website.builder.promptTooShort') : t('website.builder.promptLengthOk')}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">{t('website.builder.scope')}</label>
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value as PromptScope)}
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              >
                <option value="all">{t('website.builder.scopeAll')}</option>
                <option value="selected">{t('website.builder.scopeSelected')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">{t('website.builder.creativity')}</label>
              <select
                value={creativity}
                onChange={(event) => setCreativity(event.target.value as Creativity)}
                className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              >
                <option value="safe">{t('website.builder.creativitySafe')}</option>
                <option value="balanced">{t('website.builder.creativityBalanced')}</option>
                <option value="creative">{t('website.builder.creativityCreative')}</option>
              </select>
            </div>
          </div>

          {promptAffectedSections.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {promptAffectedSections.map((sectionId) => (
                <button
                  key={sectionId}
                  type="button"
                  onClick={() => setSelectedSectionId(sectionId)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                >
                  {sectionId}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => void handlePreview()}
              disabled={previewingPrompt}
            >
              {previewingPrompt ? t('website.builder.previewing') : t('website.builder.previewChange')}
            </button>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              onClick={() => void handleApply()}
              disabled={applyingPrompt}
            >
              {applyingPrompt ? t('website.builder.applying') : t('website.builder.apply')}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
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
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setPrompt('')}
            >
              {t('website.builder.clearPrompt')}
            </button>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs text-slate-500">{t('website.builder.recentPrompts')}</p>
            <div className="space-y-2">
              {recentPrompts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 py-2 text-xs text-slate-500">
                  {t('website.builder.noPromptHistory')}
                </p>
              ) : (
                recentPrompts.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="block w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => setPrompt(item)}
                  >
                    {item}
                  </button>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
