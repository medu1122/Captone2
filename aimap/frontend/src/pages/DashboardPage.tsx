import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '../contexts/LocaleContext'
import { useAuth } from '../contexts/AuthContext'
import { authApi, type AccessLogItem, type ActivityLogItem } from '../api/auth'
import { shopsApi } from '../api/shops'
import type { Locale } from '../i18n/translations'

const liveWebsitesCount: number | null = null

function formatCount(t: (key: string) => string, key: string, count: number | null): string {
  if (count === null) return '—'
  return t(key).replace('{count}', String(count))
}

function formatActivityDetail(details: Record<string, unknown> | null): string {
  if (!details || typeof details !== 'object') return '—'
  const name = details.shop_name
  const slug = details.slug
  if (typeof name === 'string' && typeof slug === 'string') {
    return `${name} (${slug})`
  }
  if (typeof name === 'string') return name
  try {
    return JSON.stringify(details)
  } catch {
    return '—'
  }
}

function formatDateTime(iso: string, locale: Locale): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default function DashboardPage() {
  const { t, locale } = useLocale()
  const { token } = useAuth()
  const [activeShopsCount, setActiveShopsCount] = useState<number | null>(null)
  const [activityItems, setActivityItems] = useState<ActivityLogItem[]>([])
  const [accessItems, setAccessItems] = useState<AccessLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [accessError, setAccessError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setActiveShopsCount(null)
      setActivityItems([])
      setAccessItems([])
      return
    }
    let cancelled = false
    setLoading(true)
    setActivityError(null)
    setAccessError(null)

    Promise.all([
      shopsApi.list(token),
      authApi.getActivity(token, { limit: 30 }),
      authApi.getAccessLog(token, { limit: 30 }),
    ]).then(([shopsRes, actRes, accessRes]) => {
      if (cancelled) return
      setLoading(false)
      if (shopsRes.data?.shops) {
        setActiveShopsCount(shopsRes.data.shops.length)
      } else if (shopsRes.error) {
        setActiveShopsCount(null)
      }
      if (actRes.error) setActivityError(actRes.error)
      else if (actRes.data?.activity) setActivityItems(actRes.data.activity)
      else setActivityItems([])

      if (accessRes.error) setAccessError(accessRes.error)
      else if (accessRes.data?.access) setAccessItems(accessRes.data.access)
      else setAccessItems([])
    })

    return () => {
      cancelled = true
    }
  }, [token])

  const activityRows = useMemo(
    () =>
      activityItems.map((row) => ({
        key: `${row.created_at}-${row.action}-${row.entity_id ?? ''}`,
        action: row.action,
        time: formatDateTime(row.created_at, locale),
        detail: formatActivityDetail(row.details),
      })),
    [activityItems, locale]
  )

  const accessRows = useMemo(
    () =>
      accessItems.map((row, i) => ({
        key: `${row.created_at}-${i}`,
        ip: row.ip_address?.trim() || '—',
        time: formatDateTime(row.created_at, locale),
      })),
    [accessItems, locale]
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg border border-slate-300 flex items-center justify-center bg-slate-50">
              <img src="/icons/shop.png" alt="" className="w-8 h-8" />
            </div>
            <span className="text-sm font-medium text-slate-600">{t('dashboard.activeShops')}</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {loading && token
              ? '…'
              : formatCount(t, 'dashboard.activeShopsCount', activeShopsCount)}
          </p>
        </div>
        <div className="bg-white border border-slate-300 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg border border-slate-300 flex items-center justify-center bg-slate-50">
              <img src="/icons/website.png" alt="" className="w-8 h-8" />
            </div>
            <span className="text-sm font-medium text-slate-600">{t('dashboard.liveWebsites')}</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {formatCount(t, 'dashboard.liveWebsitesCount', liveWebsitesCount)}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-300 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200">
          <img src="/icons/dashboard-stats.png" alt="" className="w-5 h-5" />
          <h2 className="text-lg font-semibold text-slate-900">{t('dashboard.activityLog')}</h2>
        </div>
        {activityError ? (
          <p className="px-6 py-4 text-sm text-red-700">{t('dashboard.activityLoadError')}</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 font-medium text-slate-700">{t('dashboard.activityLogAction')}</th>
                <th className="px-6 py-3 font-medium text-slate-700">{t('dashboard.activityLogTime')}</th>
                <th className="px-6 py-3 font-medium text-slate-700">{t('dashboard.activityLogDetail')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && token ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    …
                  </td>
                </tr>
              ) : activityRows.length === 0 && !activityError ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    {t('dashboard.activityLogEmpty')}
                  </td>
                </tr>
              ) : (
                activityRows.map((row) => (
                  <tr key={row.key} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-900">{row.action}</td>
                    <td className="px-6 py-3 text-slate-600">{row.time}</td>
                    <td className="px-6 py-3 text-slate-600 break-all max-w-md">{row.detail}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-300 rounded-lg overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-900 px-6 py-4 border-b border-slate-200">
          {t('dashboard.accessLog')}
        </h2>
        {accessError ? (
          <p className="px-6 py-3 text-sm text-red-700">{t('dashboard.accessLoadError')}</p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 font-medium text-slate-700">{t('dashboard.accessLogIP')}</th>
                <th className="px-6 py-3 font-medium text-slate-700">{t('dashboard.accessLogTime')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && token ? (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-slate-500">
                    …
                  </td>
                </tr>
              ) : accessRows.length === 0 && !accessError ? (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-slate-500">
                    {t('dashboard.accessLogEmpty')}
                  </td>
                </tr>
              ) : (
                accessRows.map((row) => (
                  <tr key={row.key} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-900 font-mono text-xs">{row.ip}</td>
                    <td className="px-6 py-3 text-slate-600">{row.time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
