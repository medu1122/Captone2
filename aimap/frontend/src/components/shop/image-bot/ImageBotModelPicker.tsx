import type { ImageModel } from './ImageBotInputPanel'
import openaiIcon from '../../../assets/image-bot/openai-gpt-image.png'
import geminiIcon from '../../../assets/image-bot/gemini-flash.png'

export const IMAGE_MODEL_GPT_ID = 'gpt-image-1.5'
export const IMAGE_MODEL_GEMINI_ID = 'gemini-2.5-flash-preview-05-20'

type Props = {
  name: string
  value: ImageModel
  onChange: (m: ImageModel) => void
  /** true = horizontal compact (cards); false = stacked with larger touch targets */
  compact?: boolean
  geminiDisabled?: boolean
}

export default function ImageBotModelPicker({ name, value, onChange, compact, geminiDisabled }: Props) {
  const itemClass = compact
    ? 'flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 has-[:checked]:border-primary has-[:checked]:bg-primary/5 cursor-pointer'
    : 'flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 has-[:checked]:border-primary has-[:checked]:bg-primary/5 cursor-pointer hover:bg-slate-50'

  const imgClass = compact ? 'h-6 w-6 shrink-0 object-contain' : 'h-9 w-9 shrink-0 object-contain'
  const textClass = compact ? 'text-[11px] font-mono text-slate-800 leading-tight break-all' : 'text-xs font-mono text-slate-800 leading-snug break-all'

  return (
    <div className={compact ? 'flex flex-col gap-1.5' : 'flex flex-col gap-2'}>
      <label className={itemClass}>
        <input
          type="radio"
          name={name}
          checked={value === 'gpt'}
          onChange={() => onChange('gpt')}
          className="border-slate-300 shrink-0"
        />
        <img src={openaiIcon} alt="" className={imgClass} width={36} height={36} />
        <span className={textClass}>{IMAGE_MODEL_GPT_ID}</span>
      </label>
      <label
        className={`${itemClass} ${geminiDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
        title={geminiDisabled ? 'Gemini not configured' : undefined}
      >
        <input
          type="radio"
          name={name}
          checked={value === 'gemini'}
          onChange={() => !geminiDisabled && onChange('gemini')}
          disabled={geminiDisabled}
          className="shrink-0 border-slate-300"
        />
        <img src={geminiIcon} alt="" className={imgClass} width={36} height={36} />
        <span className={textClass}>
          {IMAGE_MODEL_GEMINI_ID}
          {geminiDisabled ? ' (n/a)' : ''}
        </span>
      </label>
    </div>
  )
}
