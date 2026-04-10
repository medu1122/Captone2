import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../contexts/LocaleContext'
import { shopsApi, type ShopAsset } from '../../api/shops'
import { assetStorageUrl, websiteRuntimePreviewUrl } from '../../api/client'
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

function formatDateShort(value: string | null): string {
  if (!value) return '-'
  return value.slice(0, 10)
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
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [idea, setIdea] = useState('')
  const [promptNote, setPromptNote] = useState('')
  const [template, setTemplate] = useState<WebsiteTemplate>('catalog')
  const [tone, setTone] = useState<WebsiteTone>('balanced')
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])

  if (!id) return <p className="text-sm text-slate-500">{t('website.common.missingShopId')}</p>
  if (!token) return null

  const load = async () => {
    setLoading(true)
    const [entryRes, assetsRes] = await Promise.all([
      shopWebsiteApi.getEntry(token, id),
      shopsApi.listAssets(token, id),
    ])
    setSites(entryRes.data?.sites || [])
    setAssets(assetsRes.data?.assets || [])
    setShowCreateForm(!(entryRes.data?.sites?.length))
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
      setMessage(t('website.page.messageIdeaRequired'))
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
      setMessage(t('website.page.messageCreated'))
      await load()
      navigate(`/shops/${id}/website/dashboard`)
      return
    }
    setMessage(res.error || t('website.page.messageCreateFailed'))
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      {showCreateForm ? (
        <section className="rounded-none border border-slate-200 bg-white p-6">
          <h2 className="mb-2 text-xl font-semibold text-slate-950">{t('website.page.createTitle')}</h2>
          <p className="mb-5 text-sm text-slate-600">{t('website.page.createHint')}</p>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('website.page.ideaLabel')}</label>
                <textarea
                  value={idea}
                  onChange={(event) => setIdea(event.target.value)}
                  rows={5}
                  className="w-full resize-none rounded-none border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={t('website.page.ideaPlaceholder')}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('website.page.promptLabel')}</label>
                <textarea
                  value={promptNote}
                  onChange={(event) => setPromptNote(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-none border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={t('website.page.promptPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('website.builder.templateLabel')}</label>
                  <select
                    value={template}
                    onChange={(event) => setTemplate(event.target.value as WebsiteTemplate)}
                    className="w-full rounded-none border border-slate-200 px-4 py-3 text-sm"
                  >
                    <option value="catalog">{t('website.builder.template.catalog')}</option>
                    <option value="story">{t('website.builder.template.story')}</option>
                    <option value="minimal">{t('website.builder.template.minimal')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">{t('website.builder.toneLabel')}</label>
                  <select
                    value={tone}
                    onChange={(event) => setTone(event.target.value as WebsiteTone)}
                    className="w-full rounded-none border border-slate-200 px-4 py-3 text-sm"
                  >
                    <option value="balanced">{t('website.builder.tone.balanced')}</option>
                    <option value="friendly">{t('website.builder.tone.friendly')}</option>
                    <option value="luxury">{t('website.builder.tone.luxury')}</option>
                    <option value="energetic">{t('website.builder.tone.energetic')}</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">{t('website.page.pickStorageAssets')}</label>
                  <span className="rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
                    {selectedAssetIds.length} {t('website.page.imagesCountUnit')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                  {assets.length === 0 ? (
                    <div className="col-span-full rounded-none border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      {t('website.page.noStorageAssets')}
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
                          className={`overflow-hidden rounded-none border text-left transition ${
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
                            <p className="truncate text-xs font-semibold text-slate-800">{asset.name || asset.type || t('website.page.assetFallback')}</p>
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
                  className="rounded-none bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {creating ? t('website.page.creating') : t('website.page.createNow')}
                </button>
                {message ? <p className="self-center text-sm text-slate-600">{message}</p> : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-none border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{t('website.page.inputPreview')}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{idea || t('website.page.noIdeaYet')}</p>
              </div>
              <div className="rounded-none border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{t('website.page.initialPrompt')}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{promptNote || t('website.page.noInitialPrompt')}</p>
              </div>
              <div className="rounded-none border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{t('website.page.selectedImages')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedAssetsPreview.length === 0 ? (
                    <span className="text-sm text-slate-500">{t('website.page.noImageSelected')}</span>
                  ) : (
                    selectedAssetsPreview.map((asset) => (
                      <span key={asset.id} className="rounded-none border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
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

      <section className="rounded-none border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-950">{t('website.page.shopWebsiteTitle')}</h2>
        <p className="mt-2 text-sm text-slate-600">{t('website.page.shopWebsiteHint')}</p>

        <div className="mt-5 overflow-hidden rounded-none border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm text-slate-600">
                <th className="px-4 py-3 font-medium">{t('website.page.tableName')}</th>
                <th className="px-4 py-3 font-medium">{t('website.page.tableLink')}</th>
                <th className="px-4 py-3 font-medium">{t('website.page.tableStatus')}</th>
                <th className="px-4 py-3 font-medium">{t('website.page.tableCreatedAt')}</th>
                <th className="px-4 py-3 font-medium">{t('website.page.tableLaunchedAt')}</th>
                <th className="px-4 py-3 font-medium">{t('website.page.tableDetails')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>{t('website.page.loadingTable')}</td>
                </tr>
              ) : sites.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                    {t('website.page.noWebsiteYet')}
                  </td>
                </tr>
              ) : (
                sites.slice(0, 1).map((site) => {
                  const runtimePreview = websiteRuntimePreviewUrl(id)
                  const previewHref = site.previewUrl || runtimePreview
                  return (
                  <tr key={site.id} className="text-sm text-slate-700">
                    <td className="px-4 py-4 font-semibold text-slate-950">{site.name}</td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {site.link ? (
                          <a href={site.link} target="_blank" rel="noreferrer" className="block max-w-[260px] truncate text-blue-600 underline">
                            {site.link}
                          </a>
                        ) : null}
                        <a href={previewHref} target="_blank" rel="noreferrer" className="block max-w-[320px] truncate text-xs text-blue-600 underline">
                          {previewHref}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-none border px-2.5 py-1 text-xs font-semibold ${statusClass(site.status)}`}>
                        {site.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">{formatDateShort(site.createdAt)}</td>
                    <td className="px-4 py-4">{formatDateShort(site.launchedAt)}</td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/shops/${id}/website/dashboard`}
                        className="inline-flex rounded-none border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {t('website.page.viewDetails')}
                      </Link>
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
