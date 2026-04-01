import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import { shopsApi, type ShopAsset } from '../../api/shops'
import { assetStorageUrl } from '../../api/client'

function filename(asset: ShopAsset): string {
  const name = asset.name
  if (name && name.trim()) return name
  const path = asset.storage_path_or_url ?? ''
  return path.split('/').pop() ?? path
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

export default function ShopStoragePage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()

  const [assets, setAssets] = useState<ShopAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadMode, setUploadMode] = useState<'device' | 'url'>('device')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [selectedUrls, setSelectedUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  const load = useCallback(() => {
    if (!token || !id) return
    setLoading(true)
    setError(null)
    shopsApi.listAssets(token, id).then(({ data, error: err }) => {
      setLoading(false)
      if (err) { setError(err); return }
      setAssets(data?.assets ?? [])
    })
  }, [token, id])

  useEffect(() => { load() }, [load])

  if (!id) return null

  const query = search.trim().toLowerCase()
  const filtered = assets
    .filter((a) => !query || filename(a).toLowerCase().includes(query))
    .sort((a, b) => {
      const ta = new Date(a.created_at).getTime()
      const tb = new Date(b.created_at).getTime()
      return tb - ta
    })

  const handleDelete = async (assetId: string) => {
    if (!token || !id) return
    setDeleting(true)
    const { error: err } = await shopsApi.deleteAsset(token, id, assetId)
    setDeleting(false)
    setConfirmDeleteId(null)
    if (err) { setError(err); return }
    load()
  }

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Cannot read file'))
      reader.readAsDataURL(file)
    })

  const resetUploadState = () => {
    setUploadMode('device')
    setSelectedFiles([])
    setUrlInput('')
    setSelectedUrls([])
  }

  const closeUploadModal = () => {
    if (uploading) return
    setShowUploadModal(false)
    resetUploadState()
  }

  const addUrls = () => {
    const urls = urlInput
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean)
    if (!urls.length) return
    setSelectedUrls((prev) => [...prev, ...urls])
    setUrlInput('')
  }

  const handleUpload = async () => {
    if (!token || !id || uploading) return
    setError(null)
    setUploading(true)
    let uploadedCount = 0
    try {
      if (uploadMode === 'device') {
        for (const file of selectedFiles) {
          const imageBase64 = await fileToDataUrl(file)
          const { error: err } = await shopsApi.saveImage(token, id, {
            image_base64: imageBase64,
            type: 'image',
            name: file.name,
          })
          if (err) throw new Error(err)
          uploadedCount += 1
        }
      } else {
        for (const imageUrl of selectedUrls) {
          const { error: err } = await shopsApi.saveImage(token, id, {
            image_url: imageUrl,
            type: 'image',
          })
          if (err) throw new Error(err)
          uploadedCount += 1
        }
      }
      if (uploadedCount > 0) {
        closeUploadModal()
        load()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('storage.title')}</h1>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('storage.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="px-3.5 py-2 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          Upload more image
        </button>
        <Link
          to={`/shops/${id}/image-bot`}
          className="px-3.5 py-2 text-sm font-medium rounded-xl bg-slate-900 text-white hover:bg-slate-800"
        >
          Create image with AI
        </Link>

        {!loading && (
          <span className="text-xs text-slate-400 ml-auto">
            {filtered.length} {t('storage.imageCount')}
          </span>
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-40 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-xl">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Upload image</h2>
              <button
                type="button"
                onClick={closeUploadModal}
                disabled={uploading}
                className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                x
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setUploadMode('device')}
                  className={`px-3.5 py-2 text-xs font-medium transition-colors ${
                    uploadMode === 'device' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Upload from device
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('url')}
                  className={`px-3.5 py-2 text-xs font-medium transition-colors border-l border-slate-200 ${
                    uploadMode === 'url' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Input image link
                </button>
              </div>

              {uploadMode === 'device' ? (
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      if (!files.length) return
                      setSelectedFiles((prev) => [...prev, ...files])
                      e.currentTarget.value = ''
                    }}
                    className="block w-full text-sm text-slate-700 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-slate-200 file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                  />
                  <div className="space-y-2 max-h-44 overflow-auto">
                    {selectedFiles.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                        <span className="text-sm text-slate-700 truncate pr-3">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {selectedFiles.length === 0 && <p className="text-sm text-slate-400">No image selected</p>}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="One image URL per line"
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60"
                  />
                  <button
                    type="button"
                    onClick={addUrls}
                    className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  >
                    Add links
                  </button>
                  <div className="space-y-2 max-h-44 overflow-auto">
                    {selectedUrls.map((url, idx) => (
                      <div key={`${url}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                        <span className="text-sm text-slate-700 truncate pr-3">{url}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedUrls((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {selectedUrls.length === 0 && <p className="text-sm text-slate-400">No link added</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeUploadModal}
                disabled={uploading}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={
                  uploading ||
                  (uploadMode === 'device' ? selectedFiles.length === 0 : selectedUrls.length === 0)
                }
                className="px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <svg className="w-12 h-12 text-slate-200" fill="none" viewBox="0 0 48 48" stroke="currentColor" strokeWidth={1.2}>
            <rect x="6" y="8" width="36" height="32" rx="4" />
            <circle cx="17" cy="20" r="3.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 34l10-10 7 7 6-6 13 10" />
          </svg>
          <p className="text-sm text-slate-400">{t('storage.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((asset) => {
            const src = assetStorageUrl(asset.storage_path_or_url)
            const name = filename(asset)
            const isConfirming = confirmDeleteId === asset.id

            return (
              <div
                key={asset.id}
                className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Image */}
                {src ? (
                  <img src={src} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 32 32" stroke="currentColor" strokeWidth={1.3}>
                      <rect x="4" y="4" width="24" height="24" rx="3" />
                      <circle cx="11.5" cy="11.5" r="2.5" />
                      <path d="M4 22l7-7 5 5 4-4 8 8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}

                {/* Hover overlay with info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                  <p className="text-white text-xs font-medium truncate leading-tight">{name}</p>
                  <p className="text-white/60 text-[10px] mt-0.5">{formatDate(asset.created_at)}</p>
                </div>

                {/* Delete button */}
                {!isConfirming && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(asset.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                    title={t('storage.delete')}
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M5.5 6.5v4M8.5 6.5v4M3 4l.8 7.5a1 1 0 001 .9h4.4a1 1 0 001-.9L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}

                {/* Delete confirm */}
                {isConfirming && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 p-3">
                    <p className="text-white text-xs font-semibold text-center">{t('storage.confirmDelete')}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deleting}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors disabled:opacity-50"
                      >
                        {t('shopDetail.cancelEdit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(asset.id)}
                        disabled={deleting}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {deleting ? '…' : t('storage.delete')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
