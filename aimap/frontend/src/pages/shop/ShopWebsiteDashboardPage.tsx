import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../contexts/LocaleContext'
import { websiteRuntimePreviewUrl } from '../../api/client'
import { shopsApi } from '../../api/shops'
import { shopWebsiteApi, type WebsiteOverview } from '../../api/shopWebsite'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
}

const MOCK_DAILY_VIEWS = [
  { day: 'Mon', value: 46, color: '#2563eb' },
  { day: 'Tue', value: 58, color: '#7c3aed' },
  { day: 'Wed', value: 73, color: '#ec4899' },
  { day: 'Thu', value: 69, color: '#f97316' },
  { day: 'Fri', value: 91, color: '#eab308' },
  { day: 'Sat', value: 104, color: '#10b981' },
  { day: 'Sun', value: 88, color: '#06b6d4' },
]

const MOCK_DEVICE_SPLIT = [
  { label: 'Mobile', value: 68, color: '#2563eb' },
  { label: 'Desktop', value: 24, color: '#8b5cf6' },
  { label: 'Tablet', value: 8, color: '#f97316' },
]

const MOCK_VITALS = [
  { label: 'LCP', value: '2.1s', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'CLS', value: '0.04', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  { label: 'INP', value: '158ms', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
]

function statusBadgeClass(status: string | undefined): string {
  if (status === 'deployed') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (status === 'building') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (status === 'preview_ready') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (status === 'error') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function BarChart() {
  const max = Math.max(...MOCK_DAILY_VIEWS.map((item) => item.value), 1)
  return (
    <div className="flex h-56 items-end gap-3">
      {MOCK_DAILY_VIEWS.map((item) => (
        <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
          <div className="text-xs font-medium text-slate-500">{item.value}</div>
          <div className="flex h-40 w-full items-end bg-slate-100 p-2">
            <div
              className="w-full"
              style={{
                height: `${Math.max(12, (item.value / max) * 100)}%`,
                background: `linear-gradient(180deg, ${item.color}, #0f172a)`,
              }}
            />
          </div>
          <div className="text-xs text-slate-500">{item.day}</div>
        </div>
      ))}
    </div>
  )
}

function deviceBarWidth(value: number): string {
  return `${Math.max(10, value)}%`
}

export default function ShopWebsiteDashboardPage() {
  const { t } = useLocale()
  const { token } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [overview, setOverview] = useState<WebsiteOverview | null>(null)
  const [deploying, setDeploying] = useState(false)
  const [deployMessage, setDeployMessage] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'a1',
      role: 'assistant',
      text: 'Traffic đang tăng mạnh vào cuối tuần và Mobile vẫn là nguồn truy cập chính. Nếu muốn đo chính xác ngoài mock, sau này cần gắn tracking thật hoặc collect analytics từ backend/runtime.',
    },
  ])

  if (!id) return <p className="text-sm text-slate-500">{t('website.common.missingShopId')}</p>
  if (!token) return null

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const entryRes = await shopWebsiteApi.getEntry(token, id)
      if (cancelled) return
      if (!entryRes.data?.sites?.length) {
        navigate(`/shops/${id}/website`, { replace: true })
        return
      }

      const [shopRes, containerRes, websiteRes] = await Promise.all([
        shopsApi.get(token, id),
        shopsApi.getShopContainer(token, id),
        shopWebsiteApi.getOverview(token, id),
      ])

      if (cancelled) return

      if (websiteRes.data?.overview) {
        setOverview(websiteRes.data.overview)
        return
      }

      const shop = shopRes.data
      const deploy = containerRes.data?.deployment
      const slug = String(shop?.slug || `shop-${id}`)
      const subdomain = deploy?.subdomain || `${slug}.captone2.site`
      setOverview({
        siteId: null,
        slug,
        status: deploy?.status === 'running' ? 'deployed' : deploy?.status === 'building' ? 'building' : 'draft',
        versionCount: 1,
        publicUrl: `https://${subdomain}`,
        previewUrl: websiteRuntimePreviewUrl(id),
        updatedAt: deploy?.updated_at || null,
        promptCount: null,
        promptSuccessRate: null,
        creditsUsed: null,
        lastPrompt: null,
        viewsToday: MOCK_DAILY_VIEWS[MOCK_DAILY_VIEWS.length - 1]?.value ?? 0,
        views7d: MOCK_DAILY_VIEWS.reduce((sum, item) => sum + item.value, 0),
        mobileDesktopRatio: '68 / 24',
        coreWebVitals: 'Good',
      })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id, navigate, token])

  const usageSummary = useMemo(() => {
    const viewsToday = MOCK_DAILY_VIEWS[MOCK_DAILY_VIEWS.length - 1]?.value ?? 0
    const views7d = MOCK_DAILY_VIEWS.reduce((sum, item) => sum + item.value, 0)
    return { viewsToday, views7d }
  }, [])

  const sendChat = () => {
    const trimmed = chatInput.trim()
    if (!trimmed) return

    const reply = trimmed.toLowerCase().includes('core') || trimmed.toLowerCase().includes('vitals')
      ? 'Core Web Vitals đang là dữ liệu mock frontend. Nếu chỉ có frontend tĩnh thì không thể tự đếm chính xác lâu dài nếu chưa gắn đo thực tế.'
      : trimmed.toLowerCase().includes('mobile')
        ? 'Mobile đang chiếm đa số, nên nên ưu tiên phần đầu trang ngắn, CTA rõ và ảnh nhẹ hơn.'
        : `Tổng lượt xem 7 ngày mock hiện là ${usageSummary.views7d}. Muốn số thật thì phải có tracking script hoặc backend analytics.`

    setChatMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: trimmed },
      { id: `a-${Date.now() + 1}`, role: 'assistant', text: reply },
    ])
    setChatInput('')
  }

  const handleDeploy = async () => {
    setDeployMessage(null)
    setDeploying(true)
    const res = await shopWebsiteApi.deploy(token, id)
    setDeploying(false)
    if (res.data?.ok) {
      const websiteRes = await shopWebsiteApi.getOverview(token, id)
      if (websiteRes.data?.overview) setOverview(websiteRes.data.overview)
      setDeployMessage(t('website.builder.deploySuccess'))
      return
    }
    setDeployMessage(res.error || t('website.builder.deployError'))
  }

  const mainUrl = overview?.publicUrl || ''
  const apiRuntimePreview = websiteRuntimePreviewUrl(id)
  const previewUrl = overview?.previewUrl || apiRuntimePreview

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <section className="overflow-hidden rounded-none border border-slate-200 bg-white">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-none border px-3 py-1 text-xs font-semibold ${statusBadgeClass(overview?.status)}`}>
                {overview?.status || 'draft'}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Website của shop</h1>
            <p className="mt-2 text-sm text-slate-600">Một shop — một website.</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                to={`/shops/${id}/website/builder`}
                className="rounded-none bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Website edit
              </Link>
              <button
                type="button"
                onClick={() => void handleDeploy()}
                disabled={deploying}
                className="rounded-none border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
              >
                {deploying ? t('website.builder.deploying') : t('website.builder.deploy')}
              </button>
              {deployMessage ? <span className="text-sm text-slate-600">{deployMessage}</span> : null}
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-3">
              <div className="rounded-none border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Public URL</p>
                {mainUrl ? (
                  <a href={mainUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm font-semibold text-blue-600 underline">
                    {mainUrl}
                  </a>
                ) : (
                  <p className="mt-1 break-all text-sm font-semibold text-slate-900">{t('website.common.notDeployed')}</p>
                )}
              </div>
              <div className="rounded-none border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Preview URL</p>
                <a href={previewUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm font-semibold text-blue-600 underline">
                  {previewUrl}
                </a>
                {overview?.previewUrl && overview.previewUrl !== apiRuntimePreview ? (
                  <p className="mt-2 text-xs text-slate-500">
                    API runtime:{' '}
                    <a href={apiRuntimePreview} target="_blank" rel="noreferrer" className="font-medium text-blue-600 underline">
                      {apiRuntimePreview}
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-none border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-950">Chi tiết sử dụng</h2>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_360px]">
          <div className="rounded-none border border-slate-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-950">Lượt xem theo ngày</p>
              <div className="text-right">
                <p className="text-xs text-slate-500">Hôm nay</p>
                <p className="text-xl font-bold text-slate-950">{usageSummary.viewsToday}</p>
              </div>
            </div>
            <div className="mt-4">
              <BarChart />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-none border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-950">Tổng quan nhanh</p>
              <div className="mt-4 grid gap-3">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 text-white">
                  <p className="text-xs">Lượt xem hôm nay</p>
                  <p className="mt-1 text-2xl font-bold">{usageSummary.viewsToday}</p>
                </div>
                <div className="bg-gradient-to-r from-fuchsia-500 to-orange-400 p-4 text-white">
                  <p className="text-xs">Lượt xem 7 ngày</p>
                  <p className="mt-1 text-2xl font-bold">{usageSummary.views7d}</p>
                </div>
              </div>
            </div>

            <div className="rounded-none border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-950">Tỷ lệ thiết bị</p>
              <div className="mt-4 space-y-3">
                {MOCK_DEVICE_SPLIT.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                      <span>{item.label}</span>
                      <span>{item.value}%</span>
                    </div>
                    <div className="h-3 bg-slate-100">
                      <div className="h-3" style={{ width: deviceBarWidth(item.value), backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-none border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-950">Core Web Vitals</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {MOCK_VITALS.map((item) => (
                  <div key={item.label} className={`border p-4 text-center ${item.tone}`}>
                    <p className="text-xs">{item.label}</p>
                    <p className="mt-1 text-lg font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-none border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-950">AI đánh giá dựa trên biểu đồ</p>

          <div className="mt-4 space-y-3">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`rounded-none px-4 py-3 text-sm leading-6 ${
                  message.role === 'assistant' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <input
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Nhập câu hỏi về traffic hoặc chất lượng truy cập..."
              className="flex-1 rounded-none border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={sendChat}
              className="rounded-none bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Gửi
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
