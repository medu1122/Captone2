import type { AspectRatio, ImageModel } from './ImageBotInputPanel'
import ImageBotResultCard, { type ResultSlot } from './ImageBotResultCard'

const ASPECTS: AspectRatio[] = ['1:1', '2:3', '3:2', '4:5', '16:9']

type Props = {
  t: (key: string) => string
  slots: ResultSlot[]
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
}

export default function ImageBotOutputGrid({ t, slots, onSave, onEditApply, onRebuildApply }: Props) {
  return (
    <div className="h-full min-h-[14rem] max-h-[28rem] overflow-y-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((slot) => (
          <ImageBotResultCard
            key={slot.id}
            t={t}
            slot={slot}
            onSave={onSave}
            onEditApply={onEditApply}
            onRebuildApply={onRebuildApply}
            aspects={ASPECTS}
          />
        ))}
      </div>
    </div>
  )
}
