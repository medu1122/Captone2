import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'

type DeviceMode = 'desktop' | 'tablet' | 'mobile'
type PromptScope = 'all' | 'selected'
type Creativity = 'safe' | 'balanced' | 'creative'

type SectionItem = {
  id: string
  labelKey: string
}

const QUICK_CHIP_KEYS = [
  'website.builder.quickChip.primaryBlue',
  'website.builder.quickChip.addReview',
  'website.builder.quickChip.shortenHero',
  'website.builder.quickChip.optimizeMobile',
]

const SELECTABLE_SECTIONS: SectionItem[] = [
  { id: 'hero', labelKey: 'website.builder.section.hero' },
  { id: 'features', labelKey: 'website.builder.section.features' },
  { id: 'pricing', labelKey: 'website.builder.section.pricing' },
  { id: 'footer', labelKey: 'website.builder.section.footer' },
]

export default function ShopWebsiteBuilderPage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [scope, setScope] = useState<PromptScope>('all')
  const [creativity, setCreativity] = useState<Creativity>('balanced')
  const [copyDone, setCopyDone] = useState(false)
  const [recentPrompts, setRecentPrompts] = useState<string[]>([])
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  const [statusText, setStatusText] = useState('website.builder.status.ready')

  if (!id) return <p className="text-sm text-slate-500">{t('website.common.missingShopId')}</p>

  const slug = `shop-${id}`
  const publicUrl = `https://${slug}.aimap.app`
  const previewUrl = `https://preview.aimap.app/sites/${id}`
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

  const previewSizeClass = useMemo(() => {
    if (deviceMode === 'mobile') return 'max-w-[320px]'
    if (deviceMode === 'tablet') return 'max-w-[720px]'
    return 'max-w-[980px]'
  }, [deviceMode])

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
    if (!selectMode) return
    const tag = `#${sectionId}`
    setSelectedSection(sectionId)
    setScope('selected')
    setPrompt((prev) => {
      if (prev.includes(tag)) return prev
      const prefix = t('website.builder.promptEditPrefix')
      return prev ? `${prev}\n${prefix} ${tag}: ` : `${prefix} ${tag}: `
    })
  }

  const handlePreview = () => {
    if (!prompt.trim()) return
    setStatusText('website.builder.status.previewed')
  }

  const handleApply = () => {
    const trimmed = prompt.trim()
    if (!trimmed) return
    setUndoStack((prev) => [...prev, trimmed])
    setRedoStack([])
    pushRecent(trimmed)
    setStatusText('website.builder.status.applied')
  }

  const handleUndo = () => {
    if (undoStack.length === 0) return
    const current = undoStack[undoStack.length - 1]
    setRedoStack((prev) => [current, ...prev])
    setUndoStack((prev) => prev.slice(0, -1))
    setPrompt(undoStack.length > 1 ? undoStack[undoStack.length - 2] : '')
    setStatusText('website.builder.status.undo')
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const next = redoStack[0]
    setUndoStack((prev) => [...prev, next])
    setRedoStack((prev) => prev.slice(1))
    setPrompt(next)
    setStatusText('website.builder.status.redo')
  }

  const charCount = prompt.length

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{t('website.builder.title')}</h1>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                {t('website.common.showcaseBadge')}
              </span>
            </div>
            <p className="text-sm text-slate-600">{t(statusText)}</p>
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
            >
              {t('website.builder.openPublicUrl')}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[65%_35%]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{t('website.builder.previewInteraction')}</p>
            <div className="flex flex-wrap items-center gap-2">
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
              <button
                type="button"
                className={`rounded-lg border px-3 py-1 text-xs ${selectMode ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
                onClick={() => setSelectMode((prev) => !prev)}
              >
                {selectMode ? t('website.builder.selectModeOff') : t('website.builder.selectModeOn')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
              {previewUrl}
            </div>
            <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-3">
              <div className={`w-full ${previewSizeClass} rounded-xl border border-slate-200 bg-slate-50 p-3`}>
                <div className="mb-2 text-xs text-slate-500">{t('website.builder.clickSectionHint')}</div>
                <div className="space-y-2">
                  {SELECTABLE_SECTIONS.map((section) => {
                    const active = selectedSection === section.id
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => selectSection(section.id)}
                        className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${
                          active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        {t('website.builder.sectionPrefix')}: {t(section.labelKey)} {active ? `(${t('website.builder.selected')})` : ''}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
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

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={handlePreview}
            >
              {t('website.builder.previewChange')}
            </button>
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={handleApply}
            >
              {t('website.builder.apply')}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
            >
              {t('website.builder.undo')}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
            >
              {t('website.builder.redo')}
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
