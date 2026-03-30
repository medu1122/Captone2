import { useCallback, useEffect, useMemo, useState } from 'react'
import { creditsApi, type CreditTxRow, type PaymentMethod } from '../api/credits'
import { authApi } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../contexts/LocaleContext'

export default function CreditsTopUpPage() {
  const { t } = useLocale()
  const { token, setUser } = useAuth()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [bankName, setBankName] = useState<string | null>(null)
  const [accountNo, setAccountNo] = useState<string | null>(null)
  const [minVnd, setMinVnd] = useState(10_000)
  const [rate, setRate] = useState(1000)
  const [amountVnd, setAmountVnd] = useState(50_000)
  const [methodId, setMethodId] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMethods, setLoadingMethods] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [transferContent, setTransferContent] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [amountMoney, setAmountMoney] = useState<number | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [historyRows, setHistoryRows] = useState<CreditTxRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const activeMethodId = useMemo(() => {
    if (methodId) return methodId
    if (methods[0]?.id) return methods[0].id
    return ''
  }, [methodId, methods])

  useEffect(() => {
    if (!token) {
      setLoadingMethods(false)
      return
    }
    creditsApi.methods(token).then(({ data, error: err }) => {
      setLoadingMethods(false)
      if (err || !data) {
        setError(err ?? 'Payment method unavailable')
        return
      }
      setMethods(data.methods ?? [])
      setRate(data.creditVndRate ?? 1000)
      if (data.minAmountVnd) setMinVnd(data.minAmountVnd)
      if (data.methods?.[0]) {
        setMethodId(data.methods[0].id)
        setBankName(data.methods[0].bankName ?? null)
        setAccountNo(data.methods[0].accountNo ?? null)
      }
    })
  }, [token])

  const loadHistory = useCallback(async () => {
    if (!token) {
      setHistoryLoading(false)
      return
    }
    setHistoryLoading(true)
    const { data, error: err } = await creditsApi.history(token, { limit: 50 })
    setHistoryLoading(false)
    if (err) {
      setHistoryError(err)
      return
    }
    setHistoryError(null)
    setHistoryRows(data?.transactions ?? [])
  }, [token])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const pollPayment = useCallback(
    async (pid: string) => {
      if (!token) return
      const { data } = await creditsApi.getPayment(token, pid)
      const st = data?.payment?.status
      setStatus(st ?? null)
      if (st === 'success') {
        const me = await authApi.me(token)
        if (me.data?.success && me.data.user) setUser(me.data.user)
        loadHistory()
      }
    },
    [token, setUser, loadHistory]
  )

  useEffect(() => {
    if (!paymentId || !token || status === 'success' || status === 'expired' || status === 'failed') return
    const tmr = setInterval(() => {
      pollPayment(paymentId)
    }, 3000)
    return () => clearInterval(tmr)
  }, [paymentId, token, status, pollPayment])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (!activeMethodId) {
      setError('Payment method unavailable')
      return
    }
    setError(null)
    setLoading(true)
    const { data, error: err } = await creditsApi.topupIntent(token, amountVnd, activeMethodId)
    setLoading(false)
    if (err || !data?.payment) {
      setError(err ?? 'Failed')
      return
    }
    setPaymentId(data.payment.id)
    setTransferContent(data.payment.transferContent)
    setAmountMoney(data.payment.amountMoney)
    setQrUrl(data.payment.qrImageUrl ?? null)
    setStatus(data.payment.status)
    setRate(data.creditVndRate ?? 1000)
  }

  const previewCredits = Math.max(0, Math.floor(amountVnd / rate))

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 max-w-5xl mx-auto items-start">
      <div className="flex-1 min-w-0 space-y-6 w-full">
        <h2 className="text-lg font-semibold text-slate-900">{t('credits.paymentTitle')}</h2>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-300 rounded-xl p-6 space-y-4 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('credits.amountVnd')}</label>
            <input
              type="number"
              min={minVnd}
              step={1000}
              value={amountVnd}
              onChange={(e) => setAmountVnd(Math.max(minVnd, parseInt(e.target.value, 10) || minVnd))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
            <p className="text-xs text-slate-500 mt-1">
              {t('credits.estimatedCredits')}: <strong>{previewCredits}</strong> ({rate} VND / {t('credits.creditUnit')})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('credits.methodLabel')}</label>
            <select
              value={methodId}
              onChange={(e) => {
                const nextId = e.target.value
                setMethodId(nextId)
                const selected = methods.find((m) => m.id === nextId)
                setBankName(selected?.bankName ?? null)
                setAccountNo(selected?.accountNo ?? null)
              }}
              disabled={loadingMethods || methods.length === 0}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || loadingMethods}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-4 rounded-lg disabled:opacity-50"
          >
            {loading ? '…' : t('credits.createPayment')}
          </button>
        </form>

        {paymentId && transferContent && amountMoney != null && (
          <div className="bg-white border border-slate-300 rounded-xl p-6 space-y-4 shadow-sm">
            <p className="text-sm text-slate-600">
              {t('credits.vndAmount')}: <strong>{amountMoney.toLocaleString()} đ</strong>
            </p>
            {bankName && accountNo && (
              <p className="text-sm text-slate-600">
                {t('credits.bankAccount')}: <strong>{bankName}</strong> — <strong>{accountNo}</strong>
              </p>
            )}
            <p className="text-sm text-slate-600">
              {t('credits.transferContent')}:{' '}
              <code className="bg-slate-100 px-2 py-1 rounded text-slate-900 select-all">{transferContent}</code>
            </p>
            {qrUrl && (
              <div className="flex justify-center">
                <img src={qrUrl} alt="VietQR" className="max-w-[280px] w-full rounded-lg border border-slate-200" />
              </div>
            )}
            <p className="text-sm">
              {t('credits.status')}: <strong>{status}</strong>
            </p>
            {status === 'success' && <p className="text-sm text-emerald-700">{t('credits.successRefresh')}</p>}
          </div>
        )}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">{t('credits.historyTitle')}</h3>
          {historyLoading ? (
            <div className="bg-white border border-slate-300 rounded-lg p-4 text-slate-600">…</div>
          ) : historyError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{historyError}</div>
          ) : (
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
                  {historyRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                        {t('credits.historyEmpty')}
                      </td>
                    </tr>
                  ) : (
                    historyRows.map((r) => (
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
          )}
        </div>
      </div>

      <div className="hidden lg:block w-full max-w-sm shrink-0">
        <img
          src="/vietqr-banner.svg"
          alt=""
          className="rounded-xl border border-slate-200 shadow-sm w-full object-cover"
        />
      </div>
    </div>
  )
}
