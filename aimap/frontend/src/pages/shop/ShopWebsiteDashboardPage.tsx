import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLocale } from '../../contexts/LocaleContext'
import { shopsApi } from '../../api/shops'
import { shopWebsiteApi, type WebsiteHistoryItem, type WebsiteOverview } from '../../api/shopWebsite'

type ActivityType = 'all' | 'prompt' | 'deploy'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
}

const MOCK_DAILY_VIEWS = [
  { day: 'Mon', value: 46 },
  { day: 'Tue', value: 58 },
  { day: 'Wed', value: 73 },
  { day: 'Thu', value: 69 },
  { day: 'Fri', value: 91 },
  { day: 'Sat', value: 104 },
  { day: 'Sun', value: 88 },
]

const MOCK_DEVICE_SPLIT = [
  { label: 'Mobile', value: 68 },
  { label: 'Desktop', value: 24 },
  { label: 'Tablet', value: 8 },
]

const MOCK_VITALS = [
  { label: 'LCP', value: '2.1s' },
  { label: 'CLS', value: '0.04' },
  { label: 'INP', value: '158ms' },
]

function statusBadgeClass(status: string | undefined): string {
  if (status === 'deployed') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (status === 'building') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (status === 'preview_ready') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (status === 'error') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function BarChart({ data }: { data: Array<{ day: string; value: number }> }) {
  const max = Math.max(...data.map((item) => item.value), 1)
  return (
    <div className="flex h-56 items-end gap-3">
      {data.map((item) => (
        <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
          <div className="text-xs font-medium text-slate-500">{item.value}</div>
          <div className="flex h-40 w-full items-end rounded-2xl bg-slate-100 p-2">
            <div
              className="w-full rounded-xl bg-slate-900"
              style={{ height: `${Math.max(12, (item.value / max) * 100)}%` }}
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

  const [loading, setLoading] = useState(true)
  const [activityFilter, setActivityFilter] = useState<ActivityType>('all')
  const [overview, setOverview] = useState<WebsiteOverview | null>(null)
  const [history, setHistory] = useState<WebsiteHistoryItem[]>([])
  const [copyDone, setCopyDone] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'a1',
      role: 'assistant',
      text: 'AI frontend-only: lượt xem tăng dần vào cuối tuần, traffic mobile đang áp đảo nên nên ưu tiên CTA ngắn và hero gọn hơn.',
    },
  ])

  if (!id) return <p className="text-sm text-slate-500">{t('website.common.missingShopId')}</p>
  if (!token) return null

  const filteredEvents = useMemo(() => {
    if (activityFilter === 'all') return history
    return history.filter((item) => item.type === activityFilter)
  }, [activityFilter, history])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
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
        setHistory(websiteRes.data.history || [])
        setLoading(false)
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
        previewUrl: `https://preview.captone2.site/sites/${id}`,
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
      setHistory([])
      setLoading(false)
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

  const copyUrl = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopyDone(true)
      setTimeout(() => setCopyDone(false), 1200)
    } catch (error) {
      console.error('Copy failed', error)
    }
  }

  const sendChat = () => {
    const trimmed = chatInput.trim()
    if (!trimmed) return
    const views7d = usageSummary.views7d
    const reply = trimmed.toLowerCase().includes('mobile')
      ? 'AI frontend-only: mobile đang chiếm phần lớn traffic, nên ưu tiên CTA 1 dòng và giảm chiều cao hero.'
      : trimmed.toLowerCase().includes('view') || trimmed.toLowerCase().includes('lượt xem')
        ? `AI frontend-only: tổng lượt xem 7 ngày đang là ${views7d}, cao nhất vào cuối tuần. Có thể ưu tiên cập nhật banner hoặc khuyến mãi cho Sat/Sun.`
        : 'AI frontend-only: dựa trên chart hiện tại, website đang có xu hướng tăng traffic; nên tối ưu phần đầu trang và nội dung dễ đọc trên mobile.'

    setChatMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: trimmed },
      { id: `a-${Date.now() + 1}`, role: 'assistant', text: reply },
    ])
    setChatInput('')
  }

  const mainUrl = overview?.publicUrl || ''
  const previewUrl = overview?.previewUrl || ''

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(overview?.status)}`}>
                {overview?.status || 'draft'}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                Website dashboard
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Website dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Dashboard này chỉ hiện sau khi đã tạo website. Mục tiêu của nó là cho user thấy usage details, xu hướng truy cập mock và
              lịch sử thay đổi, thay vì nhồi quá nhiều panel phụ.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to={`/shops/${id}/website/builder`}
                className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Mở website edit
              </Link>
              <button
                type="button"
                onClick={() => void copyUrl(mainUrl || previewUrl)}
                disabled={!mainUrl && !previewUrl}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {copyDone ? t('website.common.copied') : 'Copy link'}
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Tên website</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{overview?.slug || '-'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Public URL</p>
                <p className="mt-1 break-all text-sm font-semibold text-slate-900">{mainUrl || t('website.common.notDeployed')}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Preview URL</p>
                <p className="mt-1 break-all text-sm font-semibold text-slate-900">{previewUrl || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Chi tiết sử dụng</h2>
            <p className="mt-1 text-sm text-slate-600">Frontend mock only. Các số liệu này được tách lên đầu và thể hiện bằng chart để dễ nhìn hơn.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            frontend-only
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_360px]">
          <div className="rounded-3xl border border-slate-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Lượt xem theo ngày</p>
                <p className="mt-1 text-xs text-slate-500">Mô phỏng 7 ngày gần nhất</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Hôm nay</p>
                <p className="text-xl font-bold text-slate-950">{usageSummary.viewsToday}</p>
              </div>
            </div>
            <div className="mt-4">
              <BarChart data={MOCK_DAILY_VIEWS} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-950">Tổng quan nhanh</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Lượt xem hôm nay</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{usageSummary.viewsToday}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Lượt xem 7 ngày</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{usageSummary.views7d}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-950">Tỷ lệ thiết bị</p>
              <div className="mt-4 space-y-3">
                {MOCK_DEVICE_SPLIT.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                      <span>{item.label}</span>
                      <span>{item.value}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div className="h-3 rounded-full bg-slate-900" style={{ width: deviceBarWidth(item.value) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-950">Core Web Vitals</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {MOCK_VITALS.map((item) => (
                  <div key={item.label} className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="mt-1 text-lg font-bold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">AI đánh giá dựa trên biểu đồ</p>
              <p className="mt-1 text-xs text-slate-500">Khung chat này chỉ chạy frontend mock, dùng chính dữ liệu usage phía trên.</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === 'assistant'
                    ? 'bg-slate-950 text-white'
                    : 'bg-slate-100 text-slate-800'
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
              placeholder="Hỏi AI về lượt xem, mobile, hoặc chất lượng truy cập..."
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={sendChat}
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Gửi
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Lịch sử website</h2>
              <p className="mt-1 text-sm text-slate-600">Chỉ giữ lịch sử thay đổi và deploy, bỏ nhóm hành động nhanh không cần thiết.</p>
            </div>
            <select
              value={activityFilter}
              onChange={(event) => setActivityFilter(event.target.value as ActivityType)}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              <option value="all">{t('website.dashboard.filterAll')}</option>
              <option value="prompt">{t('website.dashboard.filterPrompt')}</option>
              <option value="deploy">{t('website.dashboard.filterDeploy')}</option>
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                Đang tải lịch sử website...
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                {t('website.dashboard.noHistory')}
              </div>
            ) : (
              filteredEvents.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      item.type === 'deploy'
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : item.type === 'prompt'
                          ? 'border-violet-200 bg-violet-50 text-violet-700'
                          : 'border-slate-200 bg-slate-100 text-slate-700'
                    }`}>
                      {item.type}
                    </span>
                    <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.createdAt}</p>
                  {item.summary ? <p className="mt-3 text-sm leading-6 text-slate-600">{item.summary}</p> : null}
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-slate-950">Đi tiếp từ đây</h2>
            <div className="mt-4 space-y-3">
              <Link
                to={`/shops/${id}/website/builder`}
                className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
              >
                <p className="text-sm font-semibold text-slate-950">Website edit</p>
                <p className="mt-1 text-sm text-slate-600">Đi sang trang edit để tương tác bằng preview và prompt.</p>
              </Link>
              <Link
                to={`/shops/${id}/website`}
                className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
              >
                <p className="text-sm font-semibold text-slate-950">Về trang trung gian</p>
                <p className="mt-1 text-sm text-slate-600">Xem lại bảng website, link, trạng thái, ngày tạo và ngày chạy.</p>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
