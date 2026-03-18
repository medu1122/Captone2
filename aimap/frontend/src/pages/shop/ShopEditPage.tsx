import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import { shopsApi, type ShopAsset } from '../../api/shops'
import { assetStorageUrl } from '../../api/client'

type ProductRow = {
  id: string
  name: string
  price: string
  description: string
  image_url: string
}

function rowsFromProducts(raw: unknown): ProductRow[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ id: 'new-0', name: '', price: '', description: '', image_url: '' }]
  }
  return raw.map((p: Record<string, unknown>, i: number) => ({
    id: String(p.id ?? `item-${i}`),
    name: String(p.name ?? ''),
    price: p.price != null ? String(p.price) : '',
    description: String(p.description ?? ''),
    image_url: String(p.image_url ?? ''),
  }))
}

export default function ShopEditPage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const [rows, setRows] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [galleryRow, setGalleryRow] = useState<number | null>(null)
  const [galleryAssets, setGalleryAssets] = useState<ShopAsset[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)

  const load = useCallback(() => {
    if (!token || !id) return
    setLoading(true)
    setError(null)
    shopsApi.get(token, id).then(({ data, error: err, status }) => {
      setLoading(false)
      if (err || status === 404 || status === 403) {
        setError(err ?? t('shopEdit.loadError'))
        return
      }
      if (data) setRows(rowsFromProducts(data.products))
    })
  }, [token, id, t])

  useEffect(() => {
    load()
  }, [load])

  const openGallery = (rowIndex: number) => {
    if (!token || !id) return
    setGalleryRow(rowIndex)
    setGalleryLoading(true)
    shopsApi.listAssets(token, id).then(({ data }) => {
      setGalleryLoading(false)
      if (data?.assets) setGalleryAssets(data.assets)
      else setGalleryAssets([])
    })
  }

  const pickAsset = (asset: ShopAsset) => {
    if (galleryRow === null) return
    const url = assetStorageUrl(asset.storage_path_or_url)
    if (url) updateRow(galleryRow, { image_url: url })
    setGalleryRow(null)
  }

  const updateRow = (index: number, patch: Partial<ProductRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name: '', price: '', description: '', image_url: '' },
    ])
  }

  const removeRow = (index: number) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const save = async () => {
    if (!token || !id) return
    setSaving(true)
    setError(null)
    setOkMsg(null)
    const payload = rows.map((r, i) => ({
      id: r.id.startsWith('new-') ? `item-${i}` : r.id,
      name: r.name.trim(),
      price: r.price.trim() || undefined,
      description: r.description.trim() || undefined,
      image_url: r.image_url.trim() || undefined,
    }))
    const { error: err, status } = await shopsApi.updateProducts(token, id, payload)
    setSaving(false)
    if (err || status >= 400) {
      setError(err ?? t('shopEdit.saveError'))
      return
    }
    setOkMsg(t('shopEdit.saved'))
    setTimeout(() => setOkMsg(null), 3000)
    load()
  }

  if (!id) return null

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link
          to={`/shops/${id}`}
          className="text-slate-600 hover:text-slate-900 text-sm font-medium flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          {t('shops.backToList')}
        </Link>
      </div>

      <h1 className="text-xl font-semibold text-slate-900">{t('shopEdit.title')}</h1>
      <p className="text-sm text-slate-600">{t('shopEdit.subtitle')}</p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-800 text-sm">{error}</div>
      )}
      {okMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-800 text-sm">
          {okMsg}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-800">{t('shopEdit.productsSection')}</h2>
            <button
              type="button"
              onClick={addRow}
              className="text-sm font-medium text-primary hover:underline"
            >
              {t('shopEdit.addProduct')}
            </button>
          </div>

          <div className="space-y-4">
            {rows.map((row, index) => (
              <div
                key={`${row.id}-${index}`}
                className="border border-slate-200 rounded-lg p-4 bg-white space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">
                    {t('shopEdit.productLabel')} {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    {t('shopEdit.remove')}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {t('shopEdit.fieldName')}
                    </label>
                    <input
                      value={row.name}
                      onChange={(e) => updateRow(index, { name: e.target.value })}
                      className="w-full text-sm border border-slate-300 rounded px-2 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {t('shopEdit.fieldPrice')}
                    </label>
                    <input
                      value={row.price}
                      onChange={(e) => updateRow(index, { price: e.target.value })}
                      className="w-full text-sm border border-slate-300 rounded px-2 py-1.5"
                      placeholder="50.000đ"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('shopEdit.fieldDescription')}
                  </label>
                  <textarea
                    value={row.description}
                    onChange={(e) => updateRow(index, { description: e.target.value })}
                    rows={2}
                    className="w-full text-sm border border-slate-300 rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="block text-xs font-medium text-slate-600">
                      {t('shopEdit.fieldImageUrl')}
                    </label>
                    <button
                      type="button"
                      onClick={() => openGallery(index)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {t('shopEdit.pickFromGallery')}
                    </button>
                  </div>
                  <input
                    value={row.image_url}
                    onChange={(e) => updateRow(index, { image_url: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded px-2 py-1.5"
                    placeholder="https://..."
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? t('shopEdit.saving') : t('shopEdit.saveProducts')}
          </button>
        </div>
      )}

      {galleryRow !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gallery-modal-title"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 id="gallery-modal-title" className="text-sm font-semibold text-slate-900">
                {t('shopEdit.galleryModalTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setGalleryRow(null)}
                className="text-slate-500 hover:text-slate-800 p-1"
                aria-label={t('shopEdit.closeGallery')}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              {galleryLoading ? (
                <p className="text-sm text-slate-500 text-center py-8">…</p>
              ) : galleryAssets.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">{t('storage.empty')}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {galleryAssets.map((a) => {
                    const src = assetStorageUrl(a.storage_path_or_url)
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => pickAsset(a)}
                        className="aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-100 hover:ring-2 ring-primary"
                      >
                        {src ? (
                          <img src={src} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
