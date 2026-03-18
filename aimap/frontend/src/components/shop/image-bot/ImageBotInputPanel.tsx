import { useCallback, useRef, useState } from 'react'

export type AspectRatio = '1:1' | '2:3' | '3:2' | '4:5' | '16:9'
export type ImageStyle = 'ad' | 'product_intro' | 'price_board' | 'banner_shop'
export type ImageModel = 'gpt' | 'gemini'

export type ProductItem = { name?: string; id?: string; [key: string]: unknown }

export type ImageBotFormState = {
  aspect: AspectRatio
  style: ImageStyle
  shopOnly: boolean
  selectedProductKeys: string[]
  userPrompt: string
  model: ImageModel
  referenceFiles: File[]
}

const ASPECTS: AspectRatio[] = ['1:1', '2:3', '3:2', '4:5', '16:9']

const STYLES: { value: ImageStyle; labelKey: string }[] = [
  { value: 'ad', labelKey: 'imageBot.styleAd' },
  { value: 'product_intro', labelKey: 'imageBot.styleProductIntro' },
  { value: 'price_board', labelKey: 'imageBot.stylePriceBoard' },
  { value: 'banner_shop', labelKey: 'imageBot.styleBannerShop' },
]

type Props = {
  t: (key: string) => string
  products: ProductItem[]
  onGenerate: (state: ImageBotFormState) => void
  generating: boolean
}

function productKey(p: ProductItem, i: number): string {
  if (p.id != null) return String(p.id)
  if (p.name != null) return `${i}-${String(p.name)}`
  return String(i)
}

export default function ImageBotInputPanel({ t, products, onGenerate, generating }: Props) {
  const [aspect, setAspect] = useState<AspectRatio>('1:1')
  const [style, setStyle] = useState<ImageStyle>('ad')
  const [shopOnly, setShopOnly] = useState(false)
  const [selectedProductKeys, setSelectedProductKeys] = useState<string[]>([])
  const [userPrompt, setUserPrompt] = useState('')
  const [model, setModel] = useState<ImageModel>('gemini')
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleProduct = (key: string) => {
    setSelectedProductKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const onFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return
    setReferenceFiles((prev) => [...prev, ...Array.from(files)])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const removeRef = (index: number) => {
    setReferenceFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleGenerate = () => {
    onGenerate({
      aspect,
      style,
      shopOnly,
      selectedProductKeys: shopOnly ? [] : selectedProductKeys,
      userPrompt,
      model,
      referenceFiles: [...referenceFiles],
    })
  }

  const showProducts = !shopOnly && products.length > 0

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="overflow-y-auto flex-1 min-h-0 space-y-4 pr-1">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">{t('imageBot.aspectRatio')}</p>
          <div className="flex flex-wrap gap-2">
            {ASPECTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAspect(a)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  aspect === a
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="image-bot-style" className="text-xs font-medium text-slate-500 block mb-1">
            {t('imageBot.imageStyle')}
          </label>
          <select
            id="image-bot-style"
            value={style}
            onChange={(e) => setStyle(e.target.value as ImageStyle)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {t(s.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shopOnly}
              onChange={(e) => {
                setShopOnly(e.target.checked)
                if (e.target.checked) setSelectedProductKeys([])
              }}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">{t('imageBot.shopOnlyAd')}</span>
          </label>
        </div>

        {showProducts && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">{t('imageBot.pickProducts')}</p>
            <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {products.map((p, i) => {
                const key = productKey(p, i)
                const label = p.name != null ? String(p.name) : `Product ${i + 1}`
                return (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedProductKeys.includes(key)}
                      onChange={() => toggleProduct(key)}
                      className="rounded border-slate-300"
                    />
                    <span className="truncate text-slate-700">{label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {!shopOnly && products.length === 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {t('imageBot.noProductsHint')}
          </p>
        )}

        <div>
          <label htmlFor="image-bot-prompt" className="text-xs font-medium text-slate-500 block mb-1">
            {t('imageBot.extraPrompt')}
          </label>
          <textarea
            id="image-bot-prompt"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={3}
            placeholder={t('imageBot.extraPromptPlaceholder')}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">{t('imageBot.refImages')}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-sm px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            {t('imageBot.addRefImages')}
          </button>
          {referenceFiles.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {referenceFiles.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200"
                >
                  <span className="truncate max-w-[120px]">{f.name}</span>
                  <button type="button" onClick={() => removeRef(i)} className="text-red-600">
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">{t('imageBot.model')}</p>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="image-bot-model"
                checked={model === 'gpt'}
                onChange={() => setModel('gpt')}
                className="border-slate-300"
              />
              <span className="text-sm">GPT</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="image-bot-model"
                checked={model === 'gemini'}
                onChange={() => setModel('gemini')}
                className="border-slate-300"
              />
              <span className="text-sm">Gemini</span>
            </label>
          </div>
        </div>
      </div>

      <div className="shrink-0 pt-4 border-t border-slate-200 mt-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {generating ? '...' : t('imageBot.generate')}
        </button>
      </div>
    </div>
  )
}
