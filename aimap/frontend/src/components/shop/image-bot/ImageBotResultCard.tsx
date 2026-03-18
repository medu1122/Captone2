import { useRef, useState } from 'react'
import type { AspectRatio, ImageModel } from './ImageBotInputPanel'
import ImageBotModelPicker from './ImageBotModelPicker'

export type ResultSlot = {
  id: string
  imageUrl: string | null
  placeholder?: boolean
  /** Đang chờ API trả ảnh cho ô này */
  loading?: boolean
}

type PanelMode = 'none' | 'edit' | 'rebuild'

type Props = {
  t: (key: string) => string
  slot: ResultSlot
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
  aspects: AspectRatio[]
}

export default function ImageBotResultCard({
  t,
  slot,
  onSave,
  onEditApply,
  onRebuildApply,
  aspects,
}: Props) {
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

  const openEdit = () => {
    setPanel(panel === 'edit' ? 'none' : 'edit')
  }
  const openRebuild = () => {
    setPanel(panel === 'rebuild' ? 'none' : 'rebuild')
  }

  return (
    <div className="border border-slate-300 rounded-lg bg-white overflow-hidden flex flex-col">
      <div className="h-48 bg-slate-100 flex items-center justify-center shrink-0">
        {slot.loading ? (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
            <span className="text-xs">{t('imageBot.generatingSlot')}</span>
          </div>
        ) : slot.imageUrl ? (
          <img src={slot.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-slate-400 text-sm">{slot.placeholder ? t('imageBot.previewPlaceholder') : '—'}</span>
        )}
      </div>
      <div className="flex border-t border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => onSave(slot.id)}
          className="flex-1 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 border-r border-slate-200"
        >
          {t('imageBot.save')}
        </button>
        <button
          type="button"
          onClick={openEdit}
          className="flex-1 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 border-r border-slate-200"
        >
          {t('imageBot.edit')}
        </button>
        <button
          type="button"
          onClick={openRebuild}
          className="flex-1 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {t('imageBot.rebuild')}
        </button>
      </div>

      {panel === 'edit' && (
        <div className="border-t border-slate-200 p-3 bg-slate-50 space-y-2 shrink-0 max-h-56 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-800">{t('imageBot.panelEditTitle')}</p>
          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            rows={2}
            placeholder={t('imageBot.panelEditPrompt')}
            className="w-full text-xs border border-slate-300 rounded px-2 py-1"
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
            className="w-full py-1.5 rounded bg-slate-800 text-white text-xs font-medium"
          >
            {t('imageBot.apply')}
          </button>
        </div>
      )}

      {panel === 'rebuild' && (
        <div className="border-t border-slate-200 p-3 bg-slate-50 space-y-2 shrink-0 max-h-64 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-800">{t('imageBot.panelRebuildTitle')}</p>
          <textarea
            value={rebuildPrompt}
            onChange={(e) => setRebuildPrompt(e.target.value)}
            rows={2}
            placeholder={t('imageBot.panelRebuildPrompt')}
            className="w-full text-xs border border-slate-300 rounded px-2 py-1"
          />
          <input
            ref={rebuildFileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) setRebuildFiles((p) => [...p, ...Array.from(e.target.files!)])
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
            <p className="text-xs text-slate-500 mb-1">{t('imageBot.model')}</p>
            <ImageBotModelPicker
              name={`image-bot-rebuild-model-${slot.id}`}
              value={rebuildModel}
              onChange={setRebuildModel}
              compact
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('imageBot.rebuildAspectOptional')}</label>
            <select
              value={rebuildAspect}
              onChange={(e) => setRebuildAspect(e.target.value as AspectRatio | '')}
              className="w-full text-xs border border-slate-300 rounded px-2 py-1"
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
            className="w-full py-1.5 rounded bg-slate-800 text-white text-xs font-medium"
          >
            {t('imageBot.rebuildAction')}
          </button>
        </div>
      )}
    </div>
  )
}
