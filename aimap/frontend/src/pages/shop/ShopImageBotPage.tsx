import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import { shopsApi, type ImagePromptItem, type ShopAsset } from '../../api/shops'
import { assetStorageUrl } from '../../api/client'
import ImageBotInputPanel, {
  type AspectRatio,
  type ImageBotFormState,
  type ImageModel,
  type ProductItem,
} from '../../components/shop/image-bot/ImageBotInputPanel'
import ImageBotOutputGrid from '../../components/shop/image-bot/ImageBotOutputGrid'
import type { ResultSlot } from '../../components/shop/image-bot/ImageBotResultCard'
import ImageBotShopGallery from '../../components/shop/image-bot/ImageBotShopGallery'

function parseProducts(raw: unknown): ProductItem[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw as ProductItem[]
  return []
}

const INITIAL_SLOTS: ResultSlot[] = [
  { id: '1', imageUrl: null, placeholder: true },
  { id: '2', imageUrl: null, placeholder: true },
  { id: '3', imageUrl: null, placeholder: true },
]

type SlotMeta = {
  final_prompt: string
  prompt_template_id: string | null
  model_source: string
}

function firstImageUrl(urls: string[] | undefined, dataUrls: string[] | undefined, i: number): string | null {
  const u = urls?.[i]
  const d = dataUrls?.[i]
  return u || d || null
}

export default function ShopImageBotPage() {
  const { t } = useLocale()
  const { id: shopId } = useParams<{ id: string }>()
  const { token } = useAuth()
  const [products, setProducts] = useState<ProductItem[]>([])
  const [assets, setAssets] = useState<ShopAsset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(true)
  const [shopError, setShopError] = useState<string | null>(null)
  const [slots, setSlots] = useState<ResultSlot[]>(INITIAL_SLOTS)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [prompts, setPrompts] = useState<ImagePromptItem[]>([])
  const [promptTemplateId, setPromptTemplateId] = useState<string>('')
  const slotMetaRef = useRef<Record<string, SlotMeta>>({})
  const lastAspectRef = useRef<AspectRatio>('1:1')

  useEffect(() => {
    if (!token || !shopId) return
    shopsApi.get(token, shopId).then(({ data, error, status }) => {
      if (error || status === 404 || status === 403) {
        setShopError(error ?? t('imageBot.shopLoadError'))
        setProducts([])
        return
      }
      if (data) setProducts(parseProducts(data.products))
    })
    shopsApi.listImagePrompts(token, shopId).then(({ data }) => {
      if (data?.prompts) setPrompts(data.prompts)
    })
  }, [token, shopId, t])

  const loadAssets = useCallback(() => {
    if (!token || !shopId) return
    setAssetsLoading(true)
    shopsApi.listAssets(token, shopId).then(({ data }) => {
      setAssetsLoading(false)
      if (data?.assets) setAssets(data.assets)
    })
  }, [token, shopId])

  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const handleGenerate = async (state: ImageBotFormState) => {
    if (!token || !shopId) return
    lastAspectRef.current = state.aspect
    setGenerating(true)
    slotMetaRef.current = {}
    try {
      const { data, error, status } = await shopsApi.generateImages(token, shopId, {
        prompt_template_id: promptTemplateId || undefined,
        aspect: state.aspect,
        image_style: state.style,
        shop_only: state.shopOnly,
        selectedProductKeys: state.shopOnly ? [] : state.selectedProductKeys,
        user_prompt: state.userPrompt,
        model: state.model === 'gpt' ? 'openai' : 'gemini',
        variant_count: 3,
      })
      if (error || status >= 400 || !data) {
        showToast(error ?? t('imageBot.generateError'))
        return
      }
      const metaBase: SlotMeta = {
        final_prompt: data.final_prompt || '',
        prompt_template_id: data.prompt_template_id ?? null,
        model_source: data.model_source || 'dall-e-3',
      }
      const next: ResultSlot[] = ['1', '2', '3'].map((id, i) => {
        const url = firstImageUrl(data.image_urls, data.image_data_urls, i)
        slotMetaRef.current[id] = { ...metaBase }
        return { id, imageUrl: url, placeholder: !url }
      })
      setSlots(next)
      if (!next.some((s) => s.imageUrl)) showToast(t('imageBot.generateError'))
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async (slotId: string) => {
    if (!token || !shopId) return
    const slot = slots.find((s) => s.id === slotId)
    if (!slot?.imageUrl) {
      showToast(t('imageBot.saveNoImage'))
      return
    }
    const meta = slotMetaRef.current[slotId]
    const body: Parameters<typeof shopsApi.saveImage>[2] = {
      model_source: meta?.model_source || 'dall-e-3',
      prompt_template_id: meta?.prompt_template_id,
      type: 'post',
    }
    if (slot.imageUrl.startsWith('data:')) body.image_base64 = slot.imageUrl
    else body.image_url = slot.imageUrl
    const { error, status } = await shopsApi.saveImage(token, shopId, body)
    if (error || status >= 400) {
      showToast(error ?? t('imageBot.saveFailed'))
      return
    }
    showToast(t('imageBot.saveToast'))
    loadAssets()
  }

  const handleEditApply = async (
    slotId: string,
    p: { prompt: string; model: ImageModel; refFiles: File[] }
  ) => {
    if (!token || !shopId || !p.prompt.trim()) return
    setGenerating(true)
    try {
      const meta = slotMetaRef.current[slotId]
      const { data, error, status } = await shopsApi.editImage(token, shopId, {
        edit_prompt: p.prompt,
        model: p.model === 'gpt' ? 'openai' : 'gemini',
        aspect: lastAspectRef.current,
        base_prompt: meta?.final_prompt,
      })
      if (error || status >= 400 || !data) {
        showToast(error ?? t('imageBot.generateError'))
        return
      }
      const url = firstImageUrl(data.image_urls, data.image_data_urls, 0)
      if (url) {
        setSlots((prev) =>
          prev.map((s) => (s.id === slotId ? { ...s, imageUrl: url, placeholder: false } : s))
        )
        slotMetaRef.current[slotId] = {
          final_prompt: `${meta?.final_prompt ?? ''}\n[Edit] ${p.prompt}`,
          prompt_template_id: meta?.prompt_template_id ?? null,
          model_source: data.model_source || meta?.model_source || 'dall-e-3',
        }
        showToast(t('imageBot.editAppliedToast'))
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleRebuildApply = async (
    slotId: string,
    p: { prompt: string; model: ImageModel; refFiles: File[]; aspect: AspectRatio | '' }
  ) => {
    if (!token || !shopId) return
    const asp = p.aspect || lastAspectRef.current
    setGenerating(true)
    try {
      const meta = slotMetaRef.current[slotId]
      const { data, error, status } = await shopsApi.rebuildImage(token, shopId, {
        user_prompt: p.prompt,
        model: p.model === 'gpt' ? 'openai' : 'gemini',
        aspect: asp,
        prompt_template_id: meta?.prompt_template_id || promptTemplateId || undefined,
        variant_count: 1,
      })
      if (error || status >= 400 || !data) {
        showToast(error ?? t('imageBot.generateError'))
        return
      }
      const url = firstImageUrl(data.image_urls, data.image_data_urls, 0)
      if (url) {
        setSlots((prev) =>
          prev.map((s) => (s.id === slotId ? { ...s, imageUrl: url, placeholder: false } : s))
        )
        slotMetaRef.current[slotId] = {
          final_prompt: data.final_prompt || '',
          prompt_template_id: data.prompt_template_id ?? null,
          model_source: data.model_source || 'dall-e-3',
        }
        lastAspectRef.current = asp
        showToast(t('imageBot.rebuildAppliedToast'))
      }
    } finally {
      setGenerating(false)
    }
  }

  const galleryAssets = useMemo(
    () =>
      assets.map((a) => ({
        ...a,
        storage_path_or_url: assetStorageUrl(a.storage_path_or_url),
      })),
    [assets]
  )

  const storagePath = useMemo(() => (shopId ? `/shops/${shopId}/storage` : '/shops'), [shopId])

  if (!shopId) return null

  if (shopError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm">{shopError}</div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{t('imageBot.pageTitle')}</h2>
        <p className="text-sm text-slate-600 mt-1">{t('imageBot.pageSubtitle')}</p>
      </div>

      {prompts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <label className="block text-xs font-medium text-slate-600 mb-1">{t('imageBot.promptTemplate')}</label>
          <select
            value={promptTemplateId}
            onChange={(e) => setPromptTemplateId(e.target.value)}
            className="w-full max-w-xl text-sm border border-slate-300 rounded-lg px-3 py-2"
          >
            <option value="">{t('imageBot.promptAuto')}</option>
            {prompts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {toast && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-800 text-sm">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="bg-white border border-slate-300 rounded-lg p-4 flex flex-col h-[min(420px,55vh)] min-h-[320px] max-h-[480px]">
          <h3 className="text-sm font-semibold text-slate-800 shrink-0 mb-3 border-b border-slate-100 pb-2">
            {t('imageBot.zoneInputTitle')}
          </h3>
          <div className="flex-1 min-h-0">
            <ImageBotInputPanel
              t={t}
              products={products}
              assets={assets}
              onGenerate={handleGenerate}
              generating={generating}
            />
          </div>
        </section>

        <section className="bg-white border border-slate-300 rounded-lg p-4 flex flex-col h-[min(420px,55vh)] min-h-[320px] max-h-[480px]">
          <h3 className="text-sm font-semibold text-slate-800 shrink-0 mb-3 border-b border-slate-100 pb-2">
            {t('imageBot.zoneOutputTitle')}
          </h3>
          <div className="flex-1 min-h-0">
            <ImageBotOutputGrid
              t={t}
              slots={slots}
              onSave={handleSave}
              onEditApply={handleEditApply}
              onRebuildApply={handleRebuildApply}
            />
          </div>
        </section>
      </div>

      <section className="bg-white border border-slate-300 rounded-lg p-4">
        <ImageBotShopGallery
          t={t}
          assets={galleryAssets}
          loading={assetsLoading}
          storagePath={storagePath}
        />
      </section>
    </div>
  )
}
