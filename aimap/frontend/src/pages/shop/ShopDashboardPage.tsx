import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import { assetStorageUrl } from '../../api/client'
import { shopsApi, type ShopAsset, type ShopDetail } from '../../api/shops'
import RecentAssetsStrip from '../../components/shop/RecentAssetsStrip'

function productCount(products: unknown): number {
  if (Array.isArray(products)) return products.length
  if (products && typeof products === 'object') return Object.keys(products as object).length
  return 0
}

type ProductItem = {
  name?: string
  price?: string | number
  image_url?: string
  [key: string]: unknown
}

function toProductArray(products: unknown): ProductItem[] {
  if (Array.isArray(products)) return products as ProductItem[]
  return []
}

type EditForm = {
  name: string
  description: string
  industry: string
  address: string
  city: string
  district: string
  country: string
  phone: string
  email: string
  owner_name: string
}

function shopToForm(shop: ShopDetail): EditForm {
  return {
    name: shop.name ?? '',
    description: shop.description ?? '',
    industry: shop.industry ?? '',
    address: shop.address ?? '',
    city: shop.city ?? '',
    district: shop.district ?? '',
    country: shop.country ?? '',
    phone: shop.contact_info?.phone ?? '',
    email: shop.contact_info?.email ?? '',
    owner_name: shop.contact_info?.owner_name ?? '',
  }
}

export default function ShopDashboardPage() {
  const { t } = useLocale()
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()

  const [assets, setAssets] = useState<ShopAsset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(true)
  const [shop, setShop] = useState<ShopDetail | null>(null)

  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [savingInfo, setSavingInfo] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const storagePath = id ? `/shops/${id}/storage` : '/shops'
  const imageBotPath = id ? `/shops/${id}/image-bot` : '/shops'
  const productsPath = id ? `/shops/${id}/products` : '/shops'

  const load = useCallback(() => {
    if (!token || !id) return
    setAssetsLoading(true)
    shopsApi.listAssets(token, id).then(({ data }) => {
      setAssetsLoading(false)
      if (data?.assets) setAssets(data.assets)
    })
    shopsApi.get(token, id).then(({ data }) => {
      if (data) setShop(data)
    })
  }, [token, id])

  useEffect(() => {
    load()
  }, [load])

  function startEdit() {
    if (!shop) return
    setEditForm(shopToForm(shop))
    setEditing(true)
    setSaveMsg(null)
  }

  function cancelEdit() {
    setEditing(false)
    setEditForm(null)
    setSaveMsg(null)
  }

  async function saveEdit() {
    if (!token || !id || !editForm) return
    setSavingInfo(true)
    setSaveMsg(null)
    const body: Record<string, unknown> = {
      name: editForm.name,
      description: editForm.description || null,
      industry: editForm.industry || null,
      address: editForm.address || null,
      city: editForm.city || null,
      district: editForm.district || null,
      country: editForm.country || null,
      contact_info: {
        phone: editForm.phone || undefined,
        email: editForm.email || undefined,
        owner_name: editForm.owner_name || undefined,
      },
    }
    const { data, error } = await shopsApi.patch(token, id, body)
    setSavingInfo(false)
    if (data) {
      setShop(data)
      setEditing(false)
      setEditForm(null)
      setSaveMsg({ ok: true, text: t('shopDetail.saveInfoSuccess') })
      setTimeout(() => setSaveMsg(null), 3000)
    } else {
      setSaveMsg({ ok: false, text: error ?? t('shopDetail.saveInfoError') })
    }
  }

  function setField(key: keyof EditForm, value: string) {
    setEditForm(prev => prev ? { ...prev, [key]: value } : prev)
  }

  if (!id) return null

  const products = shop ? toProductArray(shop.products) : []
  const contentCount = shop ? productCount(shop.products) : null

  return (
    <div className="space-y-6">
      <p className="text-slate-600 text-sm">{t('shopDetail.dashboardIntro')}</p>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-none p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('shopDetail.stats.products')}</span>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            {contentCount === null ? '…' : contentCount}
          </p>
          <Link to={productsPath} className="text-xs text-primary font-medium mt-2 inline-block hover:underline">
            {t('shopDetail.nav.products')} →
          </Link>
        </div>
        <div className="bg-white border border-slate-200 rounded-none p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('shopDetail.stats.images')}</span>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            {assetsLoading ? '…' : assets.length}
          </p>
          <Link to={imageBotPath} className="text-xs text-primary font-medium mt-2 inline-block hover:underline">
            {t('storage.openImageBot')} →
          </Link>
        </div>
        <div className="bg-white border border-slate-200 rounded-none p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('shopDetail.stats.content')}</span>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            {contentCount === null ? '…' : contentCount}
          </p>
          <button
            type="button"
            onClick={startEdit}
            className="text-xs text-primary font-medium mt-2 inline-block hover:underline text-left"
          >
            {t('shops.edit')} →
          </button>
        </div>
        <div className="bg-white border border-slate-200 rounded-none p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('shopDetail.stats.siteStatus')}</span>
          <p className="text-3xl font-bold text-slate-900 mt-1">{t('website.siteDraft')}</p>
          <Link to={`/shops/${id}/website`} className="text-xs text-primary font-medium mt-2 inline-block hover:underline">
            {t('website.ctaBuilder')} →
          </Link>
        </div>
      </div>

      {/* Shop info panel */}
      <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">{t('shopDetail.shopInfo')}</h2>
          {!editing && (
            <button
              onClick={startEdit}
              className="text-sm font-medium text-primary hover:text-primary/80 border border-primary/30 rounded-none px-3 py-1.5 transition-colors"
            >
              {t('shopDetail.editShopInfo')}
            </button>
          )}
        </div>

        {!editing ? (
          /* Read-only view */
          <div className="px-6 py-5 space-y-4">
            {shop ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xl font-bold text-slate-900">{shop.name}</span>
                  {shop.industry && (
                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-none px-2.5 py-0.5 font-medium">
                      {shop.industry}
                    </span>
                  )}
                  <span className={`text-xs rounded-none px-2.5 py-0.5 font-medium border ${
                    shop.status === 'active'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {shop.status}
                  </span>
                </div>

                {shop.description && (
                  <p className="text-sm text-slate-600 leading-relaxed">{shop.description}</p>
                )}

                {(shop.address || shop.city || shop.country) && (
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>
                      {[shop.address, shop.district, shop.city, shop.country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}

                {(shop.contact_info?.phone || shop.contact_info?.email || shop.contact_info?.owner_name) && (
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    {shop.contact_info?.owner_name && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {shop.contact_info.owner_name}
                      </span>
                    )}
                    {shop.contact_info?.phone && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {shop.contact_info.phone}
                      </span>
                    )}
                    {shop.contact_info?.email && (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {shop.contact_info.email}
                      </span>
                    )}
                  </div>
                )}

                {shop.slug && (
                  <div className="text-xs text-slate-400 font-mono bg-slate-50 inline-block px-2 py-1 rounded-none">
                    {shop.slug}.captone2.site
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-400 animate-pulse">…</div>
            )}
          </div>
        ) : (
          /* Edit form */
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('shops.fieldName')}</label>
                <input
                  type="text"
                  value={editForm?.name ?? ''}
                  onChange={e => setField('name', e.target.value)}
                  className="w-full border border-slate-300 rounded-none px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('shops.fieldIndustry')}</label>
                <input
                  type="text"
                  value={editForm?.industry ?? ''}
                  onChange={e => setField('industry', e.target.value)}
                  className="w-full border border-slate-300 rounded-none px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('shops.fieldDescription')}</label>
              <textarea
                rows={3}
                value={editForm?.description ?? ''}
                onChange={e => setField('description', e.target.value)}
                className="w-full border border-slate-300 rounded-none px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('shops.fieldAddress')}</label>
                <input
                  type="text"
                  value={editForm?.address ?? ''}
                  onChange={e => setField('address', e.target.value)}
                  className="w-full border border-slate-300 rounded-none px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('shops.fieldDistrict')}</label>
                <input
                  type="text"
                  value={editForm?.district ?? ''}
                  onChange={e => setField('district', e.target.value)}
                  className="w-full border border-slate-300 rounded-none px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('shops.fieldCity')}</label>
                <input
                  type="text"
                  value={editForm?.city ?? ''}
                  onChange={e => setField('city', e.target.value)}
                  className="w-full border border-slate-300 rounded-none px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('shops.fieldCountry')}</label>
                <input
                  type="text"
                  value={editForm?.country ?? ''}
                  onChange={e => setField('country', e.target.value)}
                  className="w-full border border-slate-300 rounded-none px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('shops.fieldOwnerName')}</label>
                <input
                  type="text"
                  value={editForm?.owner_name ?? ''}
                  onChange={e => setField('owner_name', e.target.value)}
                  className="w-full border border-slate-300 rounded-none px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('shops.fieldContactPhone')}</label>
                <input
                  type="text"
                  value={editForm?.phone ?? ''}
                  onChange={e => setField('phone', e.target.value)}
                  className="w-full border border-slate-300 rounded-none px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('shops.fieldContactEmail')}</label>
                <input
                  type="email"
                  value={editForm?.email ?? ''}
                  onChange={e => setField('email', e.target.value)}
                  className="w-full border border-slate-300 rounded-none px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={saveEdit}
                disabled={savingInfo}
                className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-none hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {savingInfo ? t('shopDetail.savingInfo') : t('shopDetail.saveShopInfo')}
              </button>
              <button
                onClick={cancelEdit}
                disabled={savingInfo}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-none border border-slate-300 hover:border-slate-400 transition-colors disabled:opacity-50"
              >
                {t('shopDetail.cancelEdit')}
              </button>
            </div>
          </div>
        )}

        {saveMsg && (
          <div className={`mx-6 mb-4 px-4 py-2.5 rounded-none text-sm font-medium ${
            saveMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {saveMsg.text}
          </div>
        )}
      </div>

      {/* Products mini-list */}
      <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">{t('shopDetail.currentProducts')}</h2>
          <Link to={productsPath} className="text-sm font-medium text-primary hover:underline">
            {t('shopDetail.nav.products')} →
          </Link>
        </div>
        <div className="px-6 py-4">
          {products.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-slate-400">{t('shopDetail.noProducts')}</p>
              <Link to={productsPath} className="text-sm text-primary font-medium hover:underline">
                {t('shopDetail.nav.products')} →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.slice(0, 6).map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-none border border-slate-100 hover:border-slate-200 transition-colors">
                  {p.image_url ? (
                    <img
                      src={assetStorageUrl(p.image_url)}
                      alt={p.name ?? ''}
                      className="w-12 h-12 rounded-none object-cover flex-shrink-0 bg-slate-100"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-none bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.name || t('products.unnamedProduct')}</p>
                    {p.price != null && (
                      <p className="text-xs text-slate-500 mt-0.5">{p.price}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {products.length > 6 && (
            <div className="mt-3 text-center">
              <Link to={productsPath} className="text-sm text-primary font-medium hover:underline">
                + {t('shopDetail.nav.products')} →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent assets */}
      <div className="bg-white border border-slate-200 rounded-none shadow-sm p-6">
        <RecentAssetsStrip
          t={t}
          assets={assets}
          max={6}
          titleKey="dashboard.recentAssets"
          storagePath={storagePath}
          loading={assetsLoading}
        />
      </div>
    </div>
  )
}
