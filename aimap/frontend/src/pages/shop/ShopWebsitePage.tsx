import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../contexts/LocaleContext'
import { shopsApi, type ShopAsset } from '../../api/shops'
import { assetStorageUrl } from '../../api/client'
import {
  shopWebsiteApi,
  type WebsiteEntryRow,
  type WebsiteTemplate,
  type WebsiteTheme,
  type WebsiteTone,
} from '../../api/shopWebsite'

const DEFAULT_PALETTES: Record<WebsiteTone, WebsiteTheme> = {
  balanced: { primary: '#0f172a', accent: '#2563eb', background: '#f8fafc', surface: '#ffffff' },
  friendly: { primary: '#14532d', accent: '#16a34a', background: '#f6fef9', surface: '#ffffff' },
  luxury: { primary: '#3f2f1d', accent: '#c28f2c', background: '#fdf8f1', surface: '#fffdf8' },
  energetic: { primary: '#7c2d12', accent: '#ea580c', background: '#fff7ed', surface: '#ffffff' },
}

function statusClass(status: string): string {
  if (status === 'running' || status === 'deployed') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (status === 'building') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (status === 'preview_ready') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (status === 'error') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

export default function ShopWebsitePage() {
  const { t } = useLocale()
  const { token } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [sites, setSites] = useState<WebsiteEntryRow[]>([])
  const [assets, setAssets] = useState<ShopAsset[]>([])
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [idea, setIdea] = useState('')
  const [promptNote, setPromptNote] = useState('')
  const [template, setTemplate] = useState<WebsiteTemplate>('catalog')
  const [tone, setTone] = useState<WebsiteTone>('balanced')
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])

  if (!id) return <p className="text-sm text-slate-500">{t('website.common.missingShopId')}</p>
  if (!token) return null

  const hasSite = sites.length > 0

  const load = async () => {
    setLoading(true)
    const [entryRes, assetsRes] = await Promise.all([
      shopWebsiteApi.getEntry(token, id),
      shopsApi.listAssets(token, id),
    ])
    setSites(entryRes.data?.sites || [])
    setAssets(assetsRes.data?.assets || [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [id, token])

  const selectedAssetsPreview = useMemo(
    () => assets.filter((asset) => selectedAssetIds.includes(asset.id)),
    [assets, selectedAssetIds]
  )

  const handleCreate = async () => {
    const mergedIdea = [idea.trim(), promptNote.trim()].filter(Boolean).join('\n\n')
    if (!mergedIdea) {
      setMessage('Hãy nhập mong muốn hoặc prompt khởi tạo trước khi tạo website.')
      return
    }

    setCreating(true)
    const res = await shopWebsiteApi.createFromIdea(token, id, {
      idea: mergedIdea,
      template,
      tone,
      palette: DEFAULT_PALETTES[tone],
      selectedAssetIds,
    })
    setCreating(false)
    if (res.data?.ok) {
      setMessage('Đã tạo website draft. Đang chuyển sang dashboard website...')
      await load()
      navigate(`/shops/${id}/website/dashboard`)
      return
    }
    setMessage(res.error || 'Không thể tạo website lúc này.')
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.3fr)_360px]">
          <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              Website entry
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Quản lý website của shop từ một trang trung gian</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Khi bấm vào mục Website, user sẽ đi qua trang này trước. Nếu chưa có website thì nhập mong muốn, prompt khởi tạo và bấm
              tạo ngay. Nếu đã có website thì xem danh sách dạng bảng và mở chi tiết.
            </p>
          </div>
          <div className="p-6">
            <p className="text-sm font-semibold text-slate-900">Trạng thái hiện tại</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Số website</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{sites.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Assets khả dụng</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{assets.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Hướng flow</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {hasSite ? 'Xem bảng rồi vào chi tiết' : 'Chưa có web, hiển thị form tạo ngay tại đây'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!hasSite ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-950">Tạo website đầu tiên</h2>
            <p className="mt-1 text-sm text-slate-600">
              Form này chỉ xuất hiện khi shop chưa có website. User nhập mong muốn, prompt ban đầu và chọn assets trước khi bấm tạo.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Mong muốn cho website</label>
                <textarea
                  value={idea}
                  onChange={(event) => setIdea(event.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Ví dụ: website sạch, hiện đại, tập trung giới thiệu shop, sản phẩm nổi bật và thông tin liên hệ."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Prompt khởi tạo</label>
                <textarea
                  value={promptNote}
                  onChange={(event) => setPromptNote(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Ví dụ: tạo hero ngắn gọn, CTA rõ, ưu tiên ảnh sản phẩm thật, tone thân thiện."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Template</label>
                  <select
                    value={template}
                    onChange={(event) => setTemplate(event.target.value as WebsiteTemplate)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  >
                    <option value="catalog">Catalog</option>
                    <option value="story">Story</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Tone</label>
                  <select
                    value={tone}
                    onChange={(event) => setTone(event.target.value as WebsiteTone)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  >
                    <option value="balanced">Balanced</option>
                    <option value="friendly">Friendly</option>
                    <option value="luxury">Luxury</option>
                    <option value="energetic">Energetic</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">Chọn ảnh từ storage</label>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
                    {selectedAssetIds.length} ảnh
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {assets.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      Shop chưa có ảnh trong storage.
                    </div>
                  ) : (
                    assets.slice(0, 6).map((asset) => {
                      const active = selectedAssetIds.includes(asset.id)
                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => setSelectedAssetIds((prev) => (
                            prev.includes(asset.id)
                              ? prev.filter((item) => item !== asset.id)
                              : [...prev, asset.id]
                          ))}
                          className={`overflow-hidden rounded-2xl border text-left transition ${
                            active ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200'
                          }`}
                        >
                          <div className="h-28 bg-slate-100">
                            {asset.storage_path_or_url ? (
                              <img
                                src={assetStorageUrl(asset.storage_path_or_url)}
                                alt={asset.name || ''}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="p-3">
                            <p className="truncate text-xs font-semibold text-slate-800">{asset.name || asset.type || 'Asset'}</p>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={creating || loading}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {creating ? 'Đang tạo...' : 'Tạo ngay'}
                </button>
                {message ? <p className="self-center text-sm text-slate-600">{message}</p> : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Preview dữ liệu đầu vào</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{idea || 'Chưa có mô tả mong muốn.'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Prompt ban đầu</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{promptNote || 'Chưa có prompt khởi tạo.'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Ảnh đã chọn</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedAssetsPreview.length === 0 ? (
                    <span className="text-sm text-slate-500">Chưa chọn ảnh.</span>
                  ) : (
                    selectedAssetsPreview.map((asset) => (
                      <span key={asset.id} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
                        {asset.name || asset.type || asset.id}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Danh sách website</h2>
            <p className="mt-1 text-sm text-slate-600">Trang trung gian này chỉ cần hiển thị dạng bảng, đủ thông tin cơ bản và nút xem chi tiết.</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Tải lại
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm text-slate-600">
                <th className="px-4 py-3 font-medium">Tên</th>
                <th className="px-4 py-3 font-medium">Link</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Ngày tạo</th>
                <th className="px-4 py-3 font-medium">Ngày chạy</th>
                <th className="px-4 py-3 font-medium">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>Đang tải dữ liệu website...</td>
                </tr>
              ) : sites.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                    Chưa có website nào. Hãy dùng form phía trên để tạo website đầu tiên.
                  </td>
                </tr>
              ) : (
                sites.map((site) => (
                  <tr key={site.id} className="text-sm text-slate-700">
                    <td className="px-4 py-4 font-semibold text-slate-950">{site.name}</td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p className="max-w-[260px] truncate">{site.link}</p>
                        <p className="max-w-[260px] truncate text-xs text-slate-500">{site.previewUrl}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(site.status)}`}>
                        {site.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">{site.createdAt || '-'}</td>
                    <td className="px-4 py-4">{site.launchedAt || '-'}</td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/shops/${id}/website/dashboard`}
                        className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Xem chi tiết
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
