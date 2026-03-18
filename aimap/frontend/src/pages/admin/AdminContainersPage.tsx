import { useCallback, useEffect, useState } from 'react'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import { adminApi, type AdminContainerRow, type AdminContainerDetail } from '../../api/admin'

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  stopped: 'bg-slate-100 text-slate-600 border-slate-200',
  building: 'bg-blue-100 text-blue-700 border-blue-200',
  error: 'bg-red-100 text-red-700 border-red-200',
  draft: 'bg-slate-50 text-slate-400 border-slate-200',
}

const STATUS_FILTERS = ['', 'running', 'stopped', 'building', 'error', 'draft']

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] || STATUS_COLORS.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />}
      {status}
    </span>
  )
}

export default function AdminContainersPage() {
  const { t } = useLocale()
  const { token } = useAuth()

  const [containers, setContainers] = useState<AdminContainerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [detail, setDetail] = useState<AdminContainerDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [stopping, setStopping] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    const { data, error: err } = await adminApi.listContainers(token, {
      status: statusFilter || undefined,
      page,
      limit: 20,
    })
    setLoading(false)
    if (err) { setError(err); return }
    setContainers(data?.containers ?? [])
    setTotalPages(data?.pagination?.totalPages ?? 1)
    setTotal(data?.pagination?.total ?? 0)
  }, [token, statusFilter, page])

  useEffect(() => { load() }, [load])

  const openDetail = async (shopId: string, withLogs = false) => {
    if (!token) return
    setDetailLoading(true)
    const { data } = await adminApi.getContainerDetail(token, shopId, withLogs)
    setDetailLoading(false)
    if (data) setDetail(data as AdminContainerDetail)
  }

  const forceStop = async (shopId: string) => {
    if (!token) return
    setStopping(shopId)
    const { error: err } = await adminApi.forceStopContainer(token, shopId)
    setStopping(null)
    if (err) { setActionMsg('Error: ' + err); return }
    setActionMsg('Container stopped.')
    setTimeout(() => setActionMsg(null), 3000)
    load()
    if (detail?.shop_id === shopId) openDetail(shopId)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{t('admin.containers')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('admin.containersSubtitle')}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-800 text-sm">{error}</div>
      )}
      {actionMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-800 text-sm">
          {actionMsg}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s || 'all'}
              type="button"
              onClick={() => { setStatusFilter(s); setPage(1) }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {s || t('admin.containerFilter') + ' (All)'}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500">{total} total</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">{t('admin.containerShop')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">{t('admin.containerUser')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">{t('admin.containerStatus')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">{t('admin.containerPort')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">{t('admin.containerDeployed')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">…</td></tr>
              ) : containers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">{t('admin.containerEmpty')}</td></tr>
              ) : (
                containers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => openDetail(c.shop_id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{c.shop_name}</p>
                      <p className="text-xs text-slate-500">{c.shop_slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{c.user_name}</p>
                      <p className="text-xs text-slate-400">{c.user_email}</p>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">{c.port ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {c.deployed_at ? new Date(c.deployed_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {c.status === 'running' && (
                        <button
                          type="button"
                          disabled={stopping === c.shop_id}
                          onClick={() => forceStop(c.shop_id)}
                          className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {stopping === c.shop_id ? '…' : t('admin.containerStop')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40"
          >
            ←
          </button>
          <span className="text-sm text-slate-600 self-center">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}

      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {detail?.shop_name ?? '…'} — Container detail
              </h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              {detailLoading ? (
                <p className="text-slate-500 text-sm text-center py-8">…</p>
              ) : detail ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    {[
                      ['Shop', detail.shop_name],
                      ['Slug', detail.shop_slug],
                      ['Industry', detail.shop_industry ?? '—'],
                      ['User', detail.user_name],
                      ['Email', detail.user_email],
                      ['Status', detail.status],
                      ['Container', detail.container_name ?? '—'],
                      ['Port', detail.port ? String(detail.port) : '—'],
                      ['Subdomain', detail.subdomain ?? '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-slate-500 font-medium">{label}</p>
                        <p className="text-slate-900 truncate">{value}</p>
                      </div>
                    ))}
                  </div>

                  {detail.liveStats && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Live status</p>
                        <p className="font-medium">{detail.liveStats.running ? 'Running' : 'Stopped'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">CPU%</p>
                        <p className="font-medium tabular-nums">{detail.liveStats.cpuPercent}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Mem (MB)</p>
                        <p className="font-medium tabular-nums">{detail.liveStats.memUsageMb} MB</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Started</p>
                        <p className="font-medium text-xs">
                          {detail.liveStats.startedAt
                            ? new Date(detail.liveStats.startedAt).toLocaleString()
                            : '—'}
                        </p>
                      </div>
                    </div>
                  )}

                  {detail.error_message && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800 text-xs">
                      <span className="font-medium">Error:</span> {detail.error_message}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {detail.status === 'running' && (
                      <button
                        type="button"
                        disabled={stopping === detail.shop_id}
                        onClick={() => forceStop(detail.shop_id)}
                        className="px-3 py-1.5 rounded-lg border border-red-300 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {stopping === detail.shop_id ? '…' : t('admin.containerStop')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openDetail(detail.shop_id, true)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Refresh + fetch logs
                    </button>
                  </div>

                  {detail.logs != null && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Container logs (last 100 lines)</p>
                      <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-3 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
                        {detail.logs || '(no output)'}
                      </pre>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
