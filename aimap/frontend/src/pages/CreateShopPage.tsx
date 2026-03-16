import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLocale } from '../contexts/LocaleContext'

// Form payload matches DB: shops + contact_info (database_design.md)
export interface CreateShopForm {
  name: string
  slug: string
  industry: string
  description: string
  address: string
  city: string
  district: string
  country: string
  postalCode: string
  contactPhone: string
  contactEmail: string
  ownerName: string
}

const initialForm: CreateShopForm = {
  name: '',
  slug: '',
  industry: '',
  description: '',
  address: '',
  city: '',
  district: '',
  country: 'Vietnam',
  postalCode: '',
  contactPhone: '',
  contactEmail: '',
  ownerName: '',
}

export default function CreateShopPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateShopForm>(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof CreateShopForm>(key: K, value: CreateShopForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    // TODO: POST /shops with form; then navigate to /shops or /shops/[id]
    await new Promise((r) => setTimeout(r, 500))
    setSaving(false)
    navigate('/shops', { replace: true })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/shops"
          className="text-slate-600 hover:text-slate-900 text-sm font-medium flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          {t('shops.backToList')}
        </Link>
      </div>

      <div className="bg-white border border-slate-300 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('shops.createShop')}</h2>

        {error && (
          <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Thông tin cửa hàng */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">{t('shops.sectionStoreInfo')}</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('shops.fieldName')}</label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('shops.fieldSlug')}</label>
                <input
                  type="text"
                  required
                  placeholder="my-shop"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.slug}
                  onChange={(e) => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                />
                <p className="text-xs text-slate-500 mt-1">my-shop.aimap.app</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('shops.fieldIndustry')}</label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.industry}
                  onChange={(e) => update('industry', e.target.value)}
                >
                  <option value="">—</option>
                  <option value="Đồ uống">Đồ uống</option>
                  <option value="Đồ ăn">Đồ ăn</option>
                  <option value="Thời trang">Thời trang</option>
                  <option value="Mỹ phẩm">Mỹ phẩm</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('shops.fieldDescription')}</label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('shops.fieldAddress')}</label>
                <textarea
                  required
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('shops.fieldCity')}</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('shops.fieldDistrict')}</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={form.district}
                    onChange={(e) => update('district', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('shops.fieldPostalCode')}</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={form.postalCode}
                    onChange={(e) => update('postalCode', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('shops.fieldCountry')}</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.country}
                  onChange={(e) => update('country', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Liên hệ & Chủ shop (contact_info) */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">{t('shops.sectionContact')}</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('shops.fieldContactPhone')}</label>
                <input
                  type="tel"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.contactPhone}
                  onChange={(e) => update('contactPhone', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('shops.fieldContactEmail')}</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.contactEmail}
                  onChange={(e) => update('contactEmail', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('shops.fieldOwnerName')}</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={form.ownerName}
                  onChange={(e) => update('ownerName', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              to="/shops"
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
            >
              {t('profile.cancelButton')}
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
            >
              {saving ? '...' : t('shops.submitCreate')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
