import { useCallback, useRef, useState } from 'react'
import type { AspectRatio, ImageModel } from './ImageBotInputPanel'
import ImageBotModelPicker from './ImageBotModelPicker'
import type { ResultSlot } from './ImageBotResultCard'

type PanelMode = 'none' | 'edit' | 'rebuild'

type SlotMeta = {
  final_prompt: string
  prompt_template_id: string | null
  model_source: string
}

type Props = {
  t: (key: string) => string
  slot: ResultSlot
  slotMeta: SlotMeta | null
  onSave: (id: string) => void
  onEditApply: (id: string, payload: { prompt: string; model: ImageModel; refFiles: File[] }) => void
  onRebuildApply: (
    id: string,
    payload: {
      prompt: string
      model: ImageModel
      refFiles: File[]
      aspect: AspectRatio | ''
    }
  ) => void
  onClose: () => void
  aspects: AspectRatio[]
}

export default function ImageBotResultModal({
  t,
  slot,
  slotMeta,
  onSave,
  onEditApply,
  onRebuildApply,
  onClose,
  aspects,
}: Props) {
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [imageError, setImageError] = useState(false)
  const [panel, setPanel] = useState<PanelMode>('none')
  const [editPrompt, setEditPrompt] = useState('')
  const [editModel, setEditModel] = useState<ImageModel>('gemini')
  const [editFiles, setEditFiles] = useState<File[]>([])
  const [rebuildPrompt, setRebuildPrompt] = useState('')
  const [rebuildModel, setRebuildModel] = useState<ImageModel>('gemini')
  const [rebuildAspect, setRebuildAspect] = useState<AspectRatio | ''>('')
  const [rebuildFiles, setRebuildFiles] = useState<File[]>([])
  const editFileRef = useRef<HTMLInputElement>(null)
  const rebuildFileRef = useRef<HTMLInputElement>(null)
  const panStart = useRef({ x: 0, y: 0, cursor: { x: 0, y: 0 } })
  const panRef = useRef(pan)
  panRef.current = pan

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.15 : 0.15
    setScale((s) => Math.min(3, Math.max(0.5, s + delta)))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    panStart.current = {
      x: panRef.current.x,
      y: panRef.current.y,
      cursor: { x: e.clientX, y: e.clientY },
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons !== 1) return
    setPan({
      x: panStart.current.x + e.clientX - panStart.current.cursor.x,
      y: panStart.current.y + e.clientY - panStart.current.cursor.y,
    })
  }, [])

  const openEdit = () => setPanel(panel === 'edit' ? 'none' : 'edit')
  const openRebuild = () => setPanel(panel === 'rebuild' ? 'none' : 'rebuild')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-none bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(3, s + 0.25))}
              className="rounded-none border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
              className="rounded-none border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
            >
              −
            </button>
            <span className="text-xs text-slate-500">{Math.round(scale * 100)}%</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-none border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100"
          >
            {t('imageBot.modalClose')}
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <div
            className="flex flex-1 items-center justify-center overflow-hidden bg-slate-900"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            style={{ cursor: scale > 1 ? 'move' : 'default' }}
          >
            {slot.loading ? (
              <div className="flex flex-col items-center gap-2 text-white">
                <div className="h-10 w-10 animate-spin rounded-none border-2 border-white border-t-transparent" />
                <span className="text-sm">{t('imageBot.generatingSlot')}</span>
              </div>
            ) : imageError || !slot.imageUrl ? (
              <div className="flex flex-col items-center gap-2 px-4 text-center text-slate-400">
                <span className="text-sm">
                  {imageError ? t('imageBot.imageLoadError') : t('imageBot.previewPlaceholder')}
                </span>
                {imageError && (
                  <button
                    type="button"
                    onClick={() => setImageError(false)}
                    className="text-xs text-primary underline"
                  >
                    {t('imageBot.rebuild')}
                  </button>
                )}
              </div>
            ) : (
              <img
                src={slot.imageUrl}
                alt=""
                className="max-h-full max-w-full select-none object-contain"
                style={{
                  transform: `scale(${scale}) translate(${pan.x}px, ${pan.y}px)`,
                }}
                draggable={false}
                onError={() => setImageError(true)}
              />
            )}
          </div>

          <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-slate-50">
            {slotMeta?.model_source && (
              <p className="border-b border-slate-200 p-3 text-xs text-slate-500">
                {t('imageBot.modelUsed')}: {slotMeta.model_source}
              </p>
            )}
            <div className="space-y-2 border-b border-slate-200 p-3">
              <button
                type="button"
                onClick={() => onSave(slot.id)}
                disabled={!slot.imageUrl || slot.loading}
                className="w-full rounded-none bg-primary py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('imageBot.save')}
              </button>
              <button
                type="button"
                onClick={openEdit}
                className="w-full rounded-none border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                {t('imageBot.edit')}
              </button>
              <button
                type="button"
                onClick={openRebuild}
                className="w-full rounded-none border border-slate-300 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                {t('imageBot.rebuild')}
              </button>
            </div>

            {panel === 'edit' && (
              <div className="space-y-2 border-t border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-800">{t('imageBot.panelEditTitle')}</p>
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  rows={2}
                  placeholder={t('imageBot.panelEditPrompt')}
                  className="w-full rounded-none border border-slate-300 px-2 py-1 text-xs"
                />
                <input
                  ref={editFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) setEditFiles((p) => [...p, ...Array.from(e.target.files!)])
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => editFileRef.current?.click()}
                  className="text-xs text-primary underline"
                >
                  {t('imageBot.addRefImages')}
                </button>
                <div className="flex gap-3 text-xs">
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={editModel === 'gpt'} onChange={() => setEditModel('gpt')} />
                    GPT
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={editModel === 'gemini'} onChange={() => setEditModel('gemini')} />
                    Gemini
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onEditApply(slot.id, { prompt: editPrompt, model: editModel, refFiles: editFiles })
                    setEditPrompt('')
                    setEditFiles([])
                    setPanel('none')
                  }}
                  className="w-full rounded-none bg-slate-800 py-1.5 text-xs font-medium text-white"
                >
                  {t('imageBot.apply')}
                </button>
              </div>
            )}

            {panel === 'rebuild' && (
              <div className="space-y-2 border-t border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-800">{t('imageBot.panelRebuildTitle')}</p>
                <textarea
                  value={rebuildPrompt}
                  onChange={(e) => setRebuildPrompt(e.target.value)}
                  rows={2}
                  placeholder={t('imageBot.panelRebuildPrompt')}
                  className="w-full rounded-none border border-slate-300 px-2 py-1 text-xs"
                />
                <input
                  ref={rebuildFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length)
                      setRebuildFiles((p) => [...p, ...Array.from(e.target.files!)])
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => rebuildFileRef.current?.click()}
                  className="text-xs text-primary underline"
                >
                  {t('imageBot.refImagesOptional')}
                </button>
                <div>
                  <p className="mb-1 text-xs text-slate-500">{t('imageBot.model')}</p>
                  <ImageBotModelPicker
                    name={`modal-rebuild-${slot.id}`}
                    value={rebuildModel}
                    onChange={setRebuildModel}
                    compact
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    {t('imageBot.rebuildAspectOptional')}
                  </label>
                  <select
                    value={rebuildAspect}
                    onChange={(e) => setRebuildAspect(e.target.value as AspectRatio | '')}
                    className="w-full rounded-none border border-slate-300 px-2 py-1 text-xs"
                  >
                    <option value="">{t('imageBot.sameAsMain')}</option>
                    {aspects.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onRebuildApply(slot.id, {
                      prompt: rebuildPrompt,
                      model: rebuildModel,
                      refFiles: rebuildFiles,
                      aspect: rebuildAspect,
                    })
                    setRebuildPrompt('')
                    setRebuildFiles([])
                    setRebuildAspect('')
                    setPanel('none')
                  }}
                  className="w-full rounded-none bg-slate-800 py-1.5 text-xs font-medium text-white"
                >
                  {t('imageBot.rebuildAction')}
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
