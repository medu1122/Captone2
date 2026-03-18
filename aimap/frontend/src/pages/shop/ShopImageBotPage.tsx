import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import { shopsApi, type ShopAsset } from '../../api/shops'
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

function makeMockImageUrl(seed: string, aspect: string): string {
  const [w, h] =
    aspect === '1:1'
      ? [400, 400]
      : aspect === '2:3'
        ? [400, 600]
        : aspect === '3:2'
          ? [600, 400]
          : aspect === '4:5'
            ? [400, 500]
            : aspect === '16:9'
              ? [640, 360]
              : [400, 400]
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`
}

const INITIAL_SLOTS: ResultSlot[] = [
  { id: '1', imageUrl: null, placeholder: true },
  { id: '2', imageUrl: null, placeholder: true },
  { id: '3', imageUrl: null, placeholder: true },
]

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

  const handleGenerate = (state: ImageBotFormState) => {
    setGenerating(true)
    const base = `${state.aspect}-${state.style}-${state.model}-${Date.now()}`
    setTimeout(() => {
      setSlots([
        { id: '1', imageUrl: makeMockImageUrl(`${base}-a`, state.aspect), placeholder: false },
        { id: '2', imageUrl: makeMockImageUrl(`${base}-b`, state.aspect), placeholder: false },
        { id: '3', imageUrl: makeMockImageUrl(`${base}-c`, state.aspect), placeholder: false },
      ])
      setGenerating(false)
    }, 800)
  }

  const handleSave = (_slotId: string) => {
    setToast(t('imageBot.saveToast'))
    setTimeout(() => setToast(null), 3000)
    loadAssets()
  }

  const handleEditApply = (slotId: string, _p: { prompt: string; model: ImageModel; refFiles: File[] }) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, imageUrl: makeMockImageUrl(`edit-${slotId}-${Date.now()}`, '1:1'), placeholder: false }
          : s
      )
    )
    setToast(t('imageBot.editAppliedToast'))
    setTimeout(() => setToast(null), 3000)
  }

  const handleRebuildApply = (
    slotId: string,
    p: { prompt: string; model: ImageModel; refFiles: File[]; aspect: AspectRatio | '' }
  ) => {
    const asp = p.aspect || '1:1'
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, imageUrl: makeMockImageUrl(`rebuild-${slotId}-${Date.now()}`, asp), placeholder: false }
          : s
      )
    )
    setToast(t('imageBot.rebuildAppliedToast'))
    setTimeout(() => setToast(null), 3000)
  }

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
        <p className="text-sm text-slate-600 mt-1">{t('')}</p>
      </div>

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
          assets={assets}
          loading={assetsLoading}
          storagePath={storagePath}
        />
      </section>
    </div>
  )
}
