import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import { shopsApi, type ShopAsset } from '../../api/shops'
import { assetStorageUrl } from '../../api/client'
import ProductTypePicker from '../../components/shop/ProductTagPicker'

type TagItem = { tag: string; label: string }

type ImageTab = 'url' | 'storage' | 'upload'

type ProductRow = {
  id: string
  name: string
  price: string
  description: string
  image_url: string
  tag: string
  expanded: boolean
  imageTab: ImageTab
  confirmDelete: boolean
  uploading: boolean
  uploadError: string | null
}

function rowsFromProducts(raw: unknown): ProductRow[] {
  const defaults = (p: Record<string, unknown>, i: number, expanded: boolean): ProductRow => ({
    id: String(p.id ?? `item-${i}`),
    name: String(p.name ?? ''),
    price: p.price != null ? String(p.price) : '',
    description: String(p.description ?? ''),
    image_url: String(p.image_url ?? ''),
    tag: Array.isArray(p.tags) && p.tags.length ? String(p.tags[0]) : '',
    expanded,
    imageTab: 'url',
    confirmDelete: false,
    uploading: false,
    uploadError: null,
  })

  if (!Array.isArray(raw) || raw.length === 0) {
    return [defaults({ id: 'new-0' }, 0, true)]
  }
  return raw.map((p: Record<string, unknown>, i: number) => defaults(p, i, false))
}

function ImagePreview({ src }: { src: string }) {
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState(false)

  useEffect(() => {
    setOk(false)
    setErr(false)
    if (!src) return
    const img = new Image()
    img.onload = () => setOk(true)
    img.onerror = () => setErr(true)
    img.src = src
  }, [src])

  if (!src) return null
  if (err) return null
  if (!ok) return (
    <div className="mt-2 h-32 rounded-lg bg-slate-100 flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )
  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
      <img src={src} alt="" className="max-h-48 w-full object-contain" />
    </div>
  )
}

export default function ShopProductsPage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()

  const [rows, setRows] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const [allTags, setAllTags] = useState<TagItem[]>([])
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])

  const [galleryAssets, setGalleryAssets] = useState<ShopAsset[]>([])
  const [galleryLoaded, setGalleryLoaded] = useState(false)
  const [galleryLoading, setGalleryLoading] = useState(false)

  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const load = useCallback(() => {
    if (!token || !id) return
    setLoading(true)
    setError(null)
    shopsApi.get(token, id).then(({ data, error: err, status }) => {
      setLoading(false)
      if (err || status === 404 || status === 403) {
        setError(err ?? t('products.loadError'))
        return
      }
      if (data) setRows(rowsFromProducts(data.products))
    })
  }, [token, id, t])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!token || !id) return
    shopsApi.getIndustryTags(token, id).then(({ data }) => {
      if (data) {
        setAllTags(data.allTags ?? [])
        setSuggestedTags(data.tags ?? [])
      }
    })
  }, [token, id])

  const updateRow = (index: number, patch: Partial<ProductRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: '',
        price: '',
        description: '',
        image_url: '',
        tag: '',
        expanded: true,
        imageTab: 'url',
        confirmDelete: false,
        uploading: false,
        uploadError: null,
      },
    ])
  }

  const removeRow = async (index: number) => {
    if (!token || !id) return
    const newRows = rows.filter((_, i) => i !== index)
    setRows(newRows)
    setSaving(true)
    setError(null)
    const payload = newRows.map((r, i) => ({
      id: r.id.startsWith('new-') ? `item-${i}` : r.id,
      name: r.name.trim(),
      price: r.price.trim() || undefined,
      description: r.description.trim() || undefined,
      image_url: r.image_url.trim() || undefined,
      tags: r.tag ? [r.tag] : [],
    }))
    const { error: err, status } = await shopsApi.updateProducts(token, id, payload)
    setSaving(false)
    if (err || status >= 400) {
      setError(err ?? t('products.saveError'))
      return
    }
    setOkMsg(t('products.saved'))
    setTimeout(() => setOkMsg(null), 3000)
  }

  const loadGallery = () => {
    if (!token || !id || galleryLoaded) return
    setGalleryLoading(true)
    shopsApi.listAssets(token, id).then(({ data }) => {
      setGalleryLoading(false)
      setGalleryLoaded(true)
      setGalleryAssets(data?.assets ?? [])
    })
  }

  const handleTabChange = (index: number, tab: ImageTab) => {
    updateRow(index, { imageTab: tab })
    if (tab === 'storage') loadGallery()
  }

  const pickAsset = (index: number, asset: ShopAsset) => {
    const url = assetStorageUrl(asset.storage_path_or_url)
    if (url) updateRow(index, { image_url: url })
  }

  const handleFileUpload = async (index: number, file: File) => {
    if (!token || !id) return
    updateRow(index, { uploading: true, uploadError: null })

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      const { data, error: err } = await shopsApi.saveImage(token, id, {
        image_base64: base64,
        type: 'product',
        name: file.name,
      })
      if (err || !data?.asset) {
        updateRow(index, { uploading: false, uploadError: t('products.uploadError') })
        return
      }
      const url = assetStorageUrl(data.asset.storage_path_or_url) ?? ''
      updateRow(index, { uploading: false, uploadError: null, image_url: url })
      setGalleryLoaded(false)
    }
    reader.onerror = () => {
      updateRow(index, { uploading: false, uploadError: t('products.uploadError') })
    }
    reader.readAsDataURL(file)
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
      tags: r.tag ? [r.tag] : [],
    }))
    const { error: err, status } = await shopsApi.updateProducts(token, id, payload)
    setSaving(false)
    if (err || status >= 400) {
      setError(err ?? t('products.saveError'))
      return
    }
    setOkMsg(t('products.saved'))
    setTimeout(() => setOkMsg(null), 3000)
    load()
  }

  if (!id) return null

  return (
    <div className="max-w-3xl space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('products.title')}</h1>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{t('products.subtitle')}</p>
        </div>
        <Link
          to={`/shops/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors shrink-0 pt-1"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('dashboard.viewDashboard')}
        </Link>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {error}
        </div>
      )}
      {okMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {okMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Product list */}
          {rows.map((row, index) => (
            <div
              key={`${row.id}-${index}`}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              {/* Card header — always visible */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-slate-50 transition-colors"
                onClick={() => updateRow(index, { expanded: !row.expanded, confirmDelete: false })}
              >
                {/* Thumbnail */}
                <div className="shrink-0">
                  {row.image_url ? (
                    <img
                      src={row.image_url}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-slate-400">
                        <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                        <circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M2 13l4-4 3 3 3-3 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Name + type badge */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {row.name || <span className="text-slate-400 font-normal italic">Chưa có tên</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {row.price && (
                      <span className="text-xs text-slate-500">{row.price}</span>
                    )}
                    {row.tag && (
                      <>
                        {row.price && <span className="text-slate-300">·</span>}
                        <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md font-medium">
                          {allTags.find((t) => t.tag === row.tag)?.label ?? row.tag}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Expand chevron */}
                <svg
                  width="16" height="16" viewBox="0 0 16 16" fill="none"
                  className={`text-slate-400 transition-transform shrink-0 ${row.expanded ? 'rotate-180' : ''}`}
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    updateRow(index, { confirmDelete: !row.confirmDelete, expanded: true })
                  }}
                  className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title={t('products.remove')}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M2 4h11M5 4V2.5a.5.5 0 01.5-.5h4a.5.5 0 01.5.5V4M6 7v4M9 7v4M3 4l.8 8a1 1 0 001 .9h5.4a1 1 0 001-.9L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* Delete confirmation banner */}
              {row.confirmDelete && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-red-50 border-t border-red-100">
                  <p className="text-sm text-red-700 font-medium">{t('products.confirmDeleteMsg')}</p>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateRow(index, { confirmDelete: false })}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 font-medium"
                    >
                      {t('products.confirmDeleteNo')}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium"
                    >
                      {t('products.confirmDeleteYes')}
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded edit form */}
              {row.expanded && (
                <div className="border-t border-slate-100 px-4 pb-5 pt-4 space-y-4">
                  {/* Name + Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                        {t('products.fieldName')} <span className="text-red-400 normal-case">*</span>
                      </label>
                      <input
                        value={row.name}
                        onChange={(e) => updateRow(index, { name: e.target.value })}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                        placeholder={t('products.namePlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                        {t('products.fieldPrice')}
                      </label>
                      <input
                        value={row.price}
                        onChange={(e) => updateRow(index, { price: e.target.value })}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                        placeholder="50.000đ"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                      {t('products.fieldDescription')}
                    </label>
                    <textarea
                      value={row.description}
                      onChange={(e) => updateRow(index, { description: e.target.value })}
                      rows={2}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none transition-colors"
                      placeholder={t('products.descriptionPlaceholder')}
                    />
                  </div>

                  {/* Image picker */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                      {t('products.fieldImageUrl')}
                    </label>

                    {/* Tab bar */}
                    <div className="flex gap-0 rounded-lg border border-slate-200 overflow-hidden mb-3 w-fit">
                      {(['url', 'storage', 'upload'] as ImageTab[]).map((tab) => {
                        const labels: Record<ImageTab, string> = {
                          url: t('products.imageTabUrl'),
                          storage: t('products.imageTabStorage'),
                          upload: t('products.imageTabUpload'),
                        }
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => handleTabChange(index, tab)}
                            className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${
                              row.imageTab === tab
                                ? 'bg-slate-800 text-white'
                                : 'bg-white text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {labels[tab]}
                          </button>
                        )
                      })}
                    </div>

                    {/* Tab: URL */}
                    {row.imageTab === 'url' && (
                      <div>
                        <input
                          value={row.image_url}
                          onChange={(e) => updateRow(index, { image_url: e.target.value })}
                          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                          placeholder="https://..."
                        />
                        <ImagePreview src={row.image_url} />
                      </div>
                    )}

                    {/* Tab: Storage */}
                    {row.imageTab === 'storage' && (
                      <div>
                        {galleryLoading ? (
                          <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                          </div>
                        ) : galleryAssets.length === 0 ? (
                          <div className="text-center py-8 text-sm text-slate-400 rounded-xl border-2 border-dashed border-slate-200">
                            {t('products.storageEmpty')}
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-52 overflow-y-auto pr-1">
                            {galleryAssets.map((a) => {
                              const src = assetStorageUrl(a.storage_path_or_url)
                              const selected = row.image_url === src
                              return (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => pickAsset(index, a)}
                                  className={`aspect-square rounded-xl border-2 overflow-hidden bg-slate-100 transition-all ${
                                    selected
                                      ? 'border-blue-500 ring-2 ring-blue-200'
                                      : 'border-transparent hover:border-slate-300'
                                  }`}
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
                        {row.image_url && (
                          <p className="mt-2 text-xs text-slate-500 truncate">
                            <span className="font-medium">Đã chọn:</span> {row.image_url}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Tab: Upload */}
                    {row.imageTab === 'upload' && (
                      <div>
                        <input
                          ref={(el) => { fileRefs.current[index] = el }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(index, file)
                            e.target.value = ''
                          }}
                        />
                        {row.uploading ? (
                          <div className="flex items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50">
                            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                            <span className="text-sm text-blue-600">{t('products.uploading')}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileRefs.current[index]?.click()}
                            className="w-full py-8 rounded-xl border-2 border-dashed border-slate-200 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors group"
                          >
                            <div className="flex flex-col items-center gap-2">
                              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-slate-400 group-hover:text-blue-500 transition-colors">
                                <path d="M14 4v14M7 11l7-7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M4 22h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              </svg>
                              <span className="text-sm text-slate-500 group-hover:text-blue-600 font-medium">
                                Nhấn để chọn ảnh từ thiết bị
                              </span>
                              <span className="text-xs text-slate-400">JPG, PNG, WEBP</span>
                            </div>
                          </button>
                        )}
                        {row.uploadError && (
                          <p className="mt-2 text-xs text-red-600">{row.uploadError}</p>
                        )}
                        {!row.uploading && row.image_url && (
                          <ImagePreview src={row.image_url} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Product type picker */}
                  {allTags.length > 0 && (
                    <div className="relative">
                      <ProductTypePicker
                        value={row.tag}
                        onChange={(tag) => updateRow(index, { tag })}
                        allTags={allTags}
                        suggestedTags={suggestedTags}
                        t={t}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Bottom action bar */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50 hover:bg-slate-700 transition-colors"
            >
              {saving ? t('products.saving') : t('products.saveProducts')}
            </button>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              {t('products.addProduct')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
