import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import { getImageModelsConfig } from '../../api/config'
import { shopsApi, type ShopAsset } from '../../api/shops'
import { assetStorageUrl } from '../../api/client'
import ImageBotInputPanel, {
  type AspectRatio,
  type ImageBotFormState,
  type ImageModel,
  type ProductItem,
} from '../../components/shop/image-bot/ImageBotInputPanel'
import ImageBotOutputGrid from '../../components/shop/image-bot/ImageBotOutputGrid'
import type { ResultSlot } from '../../components/shop/image-bot/ImageBotResultCard'
import ImageBotResultModal from '../../components/shop/image-bot/ImageBotResultModal'
import ImageBotShopGallery from '../../components/shop/image-bot/ImageBotShopGallery'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

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

const SESSION_TTL_MS = 60 * 60 * 1000
const SESSION_KEY = (shopId: string) => `aimap_image_bot_${shopId}`
const MAX_SESSION_SIZE = 4 * 1024 * 1024

type SlotMeta = {
  final_prompt: string
  prompt_template_id: string | null
  model_source: string
}

type SessionData = {
  savedAt: number
  slots: ResultSlot[]
  slotMeta: Record<string, SlotMeta>
}

function loadSessionResults(shopId: string): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY(shopId))
    if (!raw) return null
    const data = JSON.parse(raw) as SessionData
    if (!data.savedAt || !Array.isArray(data.slots)) return null
    if (Date.now() - data.savedAt > SESSION_TTL_MS) {
      sessionStorage.removeItem(SESSION_KEY(shopId))
      return null
    }
    return { ...data, slotMeta: data.slotMeta || {} }
  } catch {
    return null
  }
}

function saveSessionResults(shopId: string, slots: ResultSlot[], slotMeta: Record<string, SlotMeta>): void {
  try {
    const payload: SessionData = { savedAt: Date.now(), slots, slotMeta }
    const json = JSON.stringify(payload)
    if (json.length > MAX_SESSION_SIZE) return
    sessionStorage.setItem(SESSION_KEY(shopId), json)
  } catch (e) {
    console.warn('[ImageBot] session save failed:', e)
  }
}

function firstImageUrl(urls: string[] | undefined, dataUrls: string[] | undefined, i: number): string | null {
  const u = urls?.[i]
  const d = dataUrls?.[i]
  return u || d || null
}

const ASPECTS: AspectRatio[] = ['1:1', '2:3', '3:2', '4:5', '16:9']

export default function ShopImageBotPage() {
  const { t } = useLocale()
  const { id: shopId } = useParams<{ id: string }>()
  const { token } = useAuth()
  const [products, setProducts] = useState<ProductItem[]>([])
  const [assets, setAssets] = useState<ShopAsset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(true)
  const [shopError, setShopError] = useState<string | null>(null)
  const [slots, setSlots] = useState<ResultSlot[]>(INITIAL_SLOTS)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [imageModelsConfig, setImageModelsConfig] = useState<{ openai: boolean; gemini: boolean } | null>(null)
  const slotMetaRef = useRef<Record<string, SlotMeta>>({})
  const slotsRef = useRef<ResultSlot[]>(INITIAL_SLOTS)
  const lastAspectRef = useRef<AspectRatio>('1:1')

  useEffect(() => {
    if (!shopId) return
    const data = loadSessionResults(shopId)
    if (data) {
      setSlots(data.slots)
      slotsRef.current = data.slots
      slotMetaRef.current = data.slotMeta
    }
  }, [shopId])

  useEffect(() => {
    getImageModelsConfig().then(setImageModelsConfig)
  }, [])

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
    const VARIANTS = 3
    const SLOT_IDS = ['1', '2', '3'] as const
    lastAspectRef.current = state.aspect
    setGenerating(true)
    slotMetaRef.current = {}
    const initialSlots = SLOT_IDS.map((id, i) => ({
      id,
      imageUrl: null,
      placeholder: true,
      loading: i < VARIANTS,
    }))
    setSlots(initialSlots)
    slotsRef.current = initialSlots

    let anyImage = false
    try {
      const refDataUrls: string[] = []
      for (const file of state.referenceFiles) {
        try {
          refDataUrls.push(await fileToDataUrl(file))
        } catch (e) {
          console.warn('ref image convert error:', e)
        }
      }
      for (const u of state.referenceUrls) {
        if (u.startsWith('data:')) refDataUrls.push(u)
      }

      const body = {
        aspect: state.aspect,
        image_style: state.style,
        shop_only: state.shopOnly,
        selectedProductKeys: state.shopOnly ? [] : state.selectedProductKeys,
        user_prompt: state.userPrompt,
        model: state.model === 'gpt' ? 'openai' : 'gemini',
        variant_count: VARIANTS,
        ref_images: refDataUrls.length ? refDataUrls : undefined,
      }

      const { ok, streamError } = await shopsApi.generateImagesStream(token, shopId, body, (ev) => {
        if (ev.type === 'prompt') {
          console.log('[ImageBot] Meta:', {
            prompt_template_id: ev.prompt_template_id,
            variant_count: ev.variant_count,
            model: ev.model,
          })
        }
        if (ev.type === 'variant') {
          const slotId = SLOT_IDS[ev.index]
          if (!slotId) return
          const url = ev.image_data_url || ev.image_url || null
          if (url) anyImage = true
          setSlots((prev) => {
            const next = prev.map((s) =>
              s.id === slotId ? { ...s, imageUrl: url, placeholder: !url, loading: false } : s
            )
            slotsRef.current = next
            return next
          })
        }
        if (ev.type === 'error') {
          showToast(ev.message)
          const slotId = SLOT_IDS[ev.index]
          if (slotId) {
            setSlots((prev) => {
              const next = prev.map((s) => (s.id === slotId ? { ...s, loading: false } : s))
              slotsRef.current = next
              return next
            })
          }
        }
        if (ev.type === 'done') {
          const m: SlotMeta = {
            final_prompt: ev.final_prompt || '',
            prompt_template_id: ev.prompt_template_id ?? null,
            model_source: ev.model_source || 'dall-e-3',
          }
          SLOT_IDS.forEach((id) => {
            slotMetaRef.current[id] = m
          })
          if (shopId) saveSessionResults(shopId, slotsRef.current, slotMetaRef.current)
        }
        if (ev.type === 'fatal') {
          showToast(ev.message)
        }
      })

      if (!ok) {
        showToast(streamError || t('imageBot.generateError'))
        setSlots(INITIAL_SLOTS)
        slotsRef.current = INITIAL_SLOTS
        if (shopId) sessionStorage.removeItem(SESSION_KEY(shopId))
        return
      }
      if (!anyImage) showToast(t('imageBot.generateError'))
    } catch (e) {
      console.error('[ImageBot] Exception:', e)
      showToast(t('imageBot.generateError'))
      setSlots(INITIAL_SLOTS)
      slotsRef.current = INITIAL_SLOTS
      if (shopId) sessionStorage.removeItem(SESSION_KEY(shopId))
    } finally {
      setGenerating(false)
      setSlots((prev) => {
        const next = prev.map((s) => ({ ...s, loading: false }))
        slotsRef.current = next
        return next
      })
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
    if (shopId) saveSessionResults(shopId, slotsRef.current, slotMetaRef.current)
    loadAssets()
  }

  const handleEditApply = async (
    slotId: string,
    p: { prompt: string; model: ImageModel; refFiles: File[] }
  ) => {
    if (!token || !shopId || !p.prompt.trim()) return
    setGenerating(true)
    try {
      const refDataUrls: string[] = []
      for (const file of p.refFiles) {
        try {
          refDataUrls.push(await fileToDataUrl(file))
        } catch (e) {
          console.warn('ref image convert error:', e)
        }
      }
      const meta = slotMetaRef.current[slotId]
      const { data, error, status } = await shopsApi.editImage(token, shopId, {
        edit_prompt: p.prompt,
        model: p.model === 'gpt' ? 'openai' : 'gemini',
        aspect: lastAspectRef.current,
        base_prompt: meta?.final_prompt,
        ref_images: refDataUrls.length ? refDataUrls : undefined,
      })
      if (error || status >= 400 || !data) {
        showToast(error ?? t('imageBot.generateError'))
        return
      }
      const url = firstImageUrl(data.image_urls, data.image_data_urls, 0)
      if (url) {
        setSlots((prev) => {
          const next = prev.map((s) => (s.id === slotId ? { ...s, imageUrl: url, placeholder: false } : s))
          slotsRef.current = next
          return next
        })
        slotMetaRef.current[slotId] = {
          final_prompt: `${meta?.final_prompt ?? ''}\n[Edit] ${p.prompt}`,
          prompt_template_id: meta?.prompt_template_id ?? null,
          model_source: data.model_source || meta?.model_source || 'dall-e-3',
        }
        if (shopId) saveSessionResults(shopId, slotsRef.current, slotMetaRef.current)
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
      const refDataUrls: string[] = []
      for (const file of p.refFiles) {
        try {
          refDataUrls.push(await fileToDataUrl(file))
        } catch (e) {
          console.warn('ref image convert error:', e)
        }
      }
      const meta = slotMetaRef.current[slotId]
      const { data, error, status } = await shopsApi.rebuildImage(token, shopId, {
        user_prompt: p.prompt,
        model: p.model === 'gpt' ? 'openai' : 'gemini',
        aspect: asp,
        prompt_template_id: meta?.prompt_template_id ?? undefined,
        variant_count: 1,
        ref_images: refDataUrls.length ? refDataUrls : undefined,
      })
      if (error || status >= 400 || !data) {
        showToast(error ?? t('imageBot.generateError'))
        return
      }
      const url = firstImageUrl(data.image_urls, data.image_data_urls, 0)
      if (url) {
        setSlots((prev) => {
          const next = prev.map((s) => (s.id === slotId ? { ...s, imageUrl: url, placeholder: false } : s))
          slotsRef.current = next
          return next
        })
        slotMetaRef.current[slotId] = {
          final_prompt: data.final_prompt || '',
          prompt_template_id: data.prompt_template_id ?? null,
          model_source: data.model_source || 'dall-e-3',
        }
        lastAspectRef.current = asp
        if (shopId) saveSessionResults(shopId, slotsRef.current, slotMetaRef.current)
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

  const selectedSlot = selectedSlotId ? slots.find((s) => s.id === selectedSlotId) : null
  const selectedMeta = selectedSlotId ? slotMetaRef.current[selectedSlotId] ?? null : null

  if (!shopId) return null

  if (shopError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{shopError}</div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{t('imageBot.pageTitle')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('imageBot.pageSubtitle')}</p>
      </div>

      {toast && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {toast}
        </div>
      )}

      <section className="flex min-h-[560px] flex-col rounded-lg border border-slate-300 bg-white p-4">
        <h3 className="mb-3 shrink-0 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">
          {t('imageBot.zoneInputTitle')}
        </h3>
        <div className="min-h-0 flex-1">
          <ImageBotInputPanel
            t={t}
            products={products}
            assets={assets}
            onGenerate={handleGenerate}
            generating={generating}
            geminiDisabled={imageModelsConfig ? !imageModelsConfig.gemini : false}
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-300 bg-white p-4">
        <h3 className="mb-3 shrink-0 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">
          {t('imageBot.zoneOutputTitle')}
        </h3>
        <ImageBotOutputGrid
          t={t}
          slots={slots}
          onSave={handleSave}
          onEditApply={handleEditApply}
          onRebuildApply={handleRebuildApply}
          onSlotClick={(id) => setSelectedSlotId(id)}
        />
      </section>

      <section className="rounded-lg border border-slate-300 bg-white p-4">
        <ImageBotShopGallery
          t={t}
          assets={galleryAssets}
          loading={assetsLoading}
          storagePath={storagePath}
        />
      </section>

      {selectedSlot && (
        <ImageBotResultModal
          t={t}
          slot={selectedSlot}
          slotMeta={selectedMeta}
          onSave={handleSave}
          onEditApply={handleEditApply}
          onRebuildApply={handleRebuildApply}
          onClose={() => setSelectedSlotId(null)}
          aspects={ASPECTS}
        />
      )}
    </div>
  )
}
