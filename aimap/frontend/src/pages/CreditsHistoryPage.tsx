import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { creditsApi, type CreditTxRow } from '../api/credits'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../contexts/LocaleContext'

export default function CreditsHistoryPage() {
  const { t } = useLocale()
  const { token } = useAuth()
  const [rows, setRows] = useState<CreditTxRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let cancelled = false
    creditsApi.history(token, { limit: 50 }).then(({ data, error: err }) => {
      if (cancelled) return
      setLoading(false)
      if (err) setError(err)
      else setRows(data?.transactions ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-600">…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">{t('credits.historyTitle')}</h2>
        <Link to="/credits" className="text-sm text-primary font-medium hover:underline">
          {t('credits.backPayment')}
        </Link>
      </div>
      <div className="bg-white border border-slate-300 rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 font-medium text-slate-700">{t('credits.colTime')}</th>
              <th className="px-4 py-3 font-medium text-slate-700">{t('credits.colAmount')}</th>
              <th className="px-4 py-3 font-medium text-slate-700">{t('credits.colType')}</th>
              <th className="px-4 py-3 font-medium text-slate-700">{t('credits.colRef')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  {t('credits.historyEmpty')}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className={`px-4 py-2 font-mono ${r.amount >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                    {r.amount > 0 ? '+' : ''}
                    {r.amount}
                  </td>
                  <td className="px-4 py-2 text-slate-800">{r.type}</td>
                  <td className="px-4 py-2 text-slate-600 text-xs break-all max-w-xs">
                    {r.reference_type ?? '—'} {r.reference_id ?? ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
