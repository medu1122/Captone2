import { useCallback, useEffect, useRef, useState } from 'react'
import ImageBotModelPicker from './ImageBotModelPicker'
import { assetStorageUrl } from '../../../api/client'
import type { ShopAsset } from '../../../api/shops'

export type AspectRatio = '1:1' | '2:3' | '3:2' | '4:5' | '16:9'
export type ImageStyle = 'ad' | 'product_intro' | 'price_board' | 'banner_shop'
export type ImageModel = 'gpt' | 'gemini'

export type ProductItem = { name?: string; id?: string; [key: string]: unknown }

type RefTab = 'upload' | 'storage' | 'url'

export type ImageBotFormState = {
  aspect: AspectRatio
  style: ImageStyle
  shopOnly: boolean
  selectedProductKeys: string[]
  userPrompt: string
  model: ImageModel
  referenceFiles: File[]
  referenceUrls: string[]
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
  assets: ShopAsset[]
  onGenerate: (state: ImageBotFormState) => void
  generating: boolean
  geminiDisabled?: boolean
}

function productKey(p: ProductItem, i: number): string {
  if (p.id != null) return String(p.id)
  if (p.name != null) return `${i}-${String(p.name)}`
  return String(i)
}

export default function ImageBotInputPanel({
  t,
  products,
  assets,
  onGenerate,
  generating,
  geminiDisabled = false,
}: Props) {
  const [aspect, setAspect] = useState<AspectRatio>('1:1')
  const [style, setStyle] = useState<ImageStyle>('ad')
  const [shopOnly, setShopOnly] = useState(false)
  const [selectedProductKeys, setSelectedProductKeys] = useState<string[]>([])
  const [userPrompt, setUserPrompt] = useState('')
  const [model, setModel] = useState<ImageModel>('gemini')
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])
  const [referenceUrls, setReferenceUrls] = useState<string[]>([])
  const [refTab, setRefTab] = useState<RefTab>('upload')
  const [refUrlInput, setRefUrlInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (geminiDisabled && model === 'gemini') setModel('gpt')
  }, [geminiDisabled, model])

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

  const addRefUrl = () => {
    const url = refUrlInput.trim()
    if (url && !referenceUrls.includes(url)) {
      setReferenceUrls((prev) => [...prev, url])
    }
    setRefUrlInput('')
  }

  const removeRefUrl = (url: string) => {
    setReferenceUrls((prev) => prev.filter((u) => u !== url))
  }

  const toggleStorageUrl = (url: string) => {
    setReferenceUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    )
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
      referenceUrls: [...referenceUrls],
    })
  }

  const showProducts = !shopOnly && products.length > 0

  return (
    <div className="flex flex-col">
      <div className="space-y-4 pr-1">
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

          {/* Tab bar */}
          <div className="flex gap-0 rounded-lg border border-slate-200 overflow-hidden mb-2 w-fit">
            {(['upload', 'storage', 'url'] as RefTab[]).map((tab) => {
              const labels: Record<RefTab, string> = {
                upload: t('imageBot.refTabUpload'),
                storage: t('imageBot.refTabStorage'),
                url: t('imageBot.refTabUrl'),
              }
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRefTab(tab)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    refTab === tab
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {labels[tab]}
                </button>
              )
            })}
          </div>

          {/* Tab: Upload */}
          {refTab === 'upload' && (
            <div>
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
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                {t('imageBot.addRefImages')}
              </button>
              {referenceFiles.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {referenceFiles.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200"
                    >
                      <span className="truncate max-w-[120px]">{f.name}</span>
                      <button type="button" onClick={() => removeRef(i)} className="text-red-500 hover:text-red-700 ml-0.5">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Tab: Storage */}
          {refTab === 'storage' && (
            <div>
              {assets.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">{t('imageBot.refStorageEmpty')}</p>
              ) : (
                <div className="grid grid-cols-5 gap-1.5 max-h-32 overflow-y-auto">
                  {assets.map((a) => {
                    const src = assetStorageUrl(a.storage_path_or_url)
                    const selected = src ? referenceUrls.includes(src) : false
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => src && toggleStorageUrl(src)}
                        className={`aspect-square rounded-lg border-2 overflow-hidden bg-slate-100 transition-all ${
                          selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-slate-300'
                        }`}
                      >
                        {src && <img src={src} alt="" className="w-full h-full object-cover" />}
                      </button>
                    )
                  })}
                </div>
              )}
              {referenceUrls.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">{referenceUrls.length} selected</p>
              )}
            </div>
          )}

          {/* Tab: URL */}
          {refTab === 'url' && (
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={refUrlInput}
                  onChange={(e) => setRefUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRefUrl()}
                  placeholder="https://..."
                  className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={addRefUrl}
                  className="text-xs px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
                >
                  {t('imageBot.refAddUrl')}
                </button>
              </div>
              {referenceUrls.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {referenceUrls.map((url) => (
                    <li key={url} className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200 max-w-full">
                      <span className="truncate max-w-[160px]">{url.split('/').pop() ?? url}</span>
                      <button type="button" onClick={() => removeRefUrl(url)} className="text-red-500 hover:text-red-700 ml-0.5">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">{t('imageBot.model')}</p>
          <ImageBotModelPicker
            name="image-bot-model"
            value={model}
            onChange={setModel}
            geminiDisabled={geminiDisabled}
          />
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
