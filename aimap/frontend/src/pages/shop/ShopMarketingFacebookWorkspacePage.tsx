import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useLocale } from '../../contexts/LocaleContext'
import { useAuth } from '../../contexts/AuthContext'
import {
  facebookMarketingApi,
  type FbPageDetailResponse,
  type FbPostDetailResponse,
} from '../../api/facebookMarketing'
import { assetStorageUrl } from '../../api/client'
import {
  loadAndInitFacebookSdk,
  getFacebookLoginStatus,
  facebookLoginWithScopes,
  FB_LOGIN_SCOPES,
  parseXfbml,
} from '../../lib/facebookSdk'
import aiActionsBotIcon from '../../assets/image-bot/ai-actions-bot.png'

type PageRow = { id: string; name: string; followers: number; avatarUrl?: string; category?: string }
type PostRow = {
  id: string
  pageId: string
  title: string
  text: string
  image: string | null
  reach: number
  reactions: number
  comments: number
  shares: number
  time: string
  /** MOCK: true = có thể sửa qua API Pages (bài do app đăng); false = chỉ lưu local / mở FB */
  createdByApp: boolean
}
type PageKpi = { reach: number; engagementRate: string; avgReactions: number; avgComments: number; followersDelta: number }
type BestTimeSlot = { day: string; slot: string; value: number }
type TopPostInsight = { title: string; metric: string; reason: string }
type AiActionItem = { action: string; impact: string }
type PageDetailMock = {
  period: string
  kpis: PageKpi
  trendBars: number[]
  engagementMix: { label: string; value: number; color: string }[]
  bestTimes: BestTimeSlot[]
  topPosts: TopPostInsight[]
  aiActions: AiActionItem[]
}

const MIX_COLORS = ['bg-emerald-500', 'bg-amber-500', 'bg-violet-500']

function mapFbDetailToMock(d: FbPageDetailResponse): PageDetailMock {
  return {
    period: d.range === '7d' ? '7d' : '30d',
    kpis: {
      reach: d.kpis.reach,
      engagementRate: d.kpis.engagementRate,
      avgReactions: d.kpis.avgReactionsPerPost,
      avgComments: d.kpis.avgCommentsPerPost,
      followersDelta: d.kpis.followersDelta,
    },
    trendBars: d.trendBars?.length ? d.trendBars : [40, 42, 41, 43, 42, 44, 43],
    engagementMix: (d.engagementMix || []).map((m, i) => ({
      label: m.label,
      value: m.percent,
      color: MIX_COLORS[i % MIX_COLORS.length],
    })),
    bestTimes: (d.bestTimes || []).map((b) => ({ day: b.day, slot: b.slot, value: b.value })),
    topPosts: (d.topPosts || []).map((t) => ({ title: t.title, metric: t.metric, reason: t.reason })),
    aiActions: (d.aiActions || []).map((a) => ({ action: a.action, impact: a.expectedImpact || '' })),
  }
}

type PostViewExtraMock = {
  sparkline: number[]
  commentSummary: string
  topics: string[]
  botScore: number
  botBullets: string[]
}

function formatReachShort(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return String(n)
}

function engagementRateLabel(p: Pick<PostRow, 'reach' | 'reactions' | 'comments' | 'shares'>): string {
  if (p.reach <= 0) return '0%'
  const engaged = p.reactions + p.comments + p.shares
  return `${((engaged / p.reach) * 100).toFixed(1)}%`
}

const POST_VIEW_EXTRA: Record<string, PostViewExtraMock> = {
  p1: {
    sparkline: [42, 55, 51, 63, 58, 61, 64],
    commentSummary: 'Khách hỏi nhiều về thời gian áp dụng và combo; sentiment chủ yếu tích cực.',
    topics: ['Ưu đãi', 'Combo', 'Thời gian'],
    botScore: 84,
    botBullets: ['Hook rõ ưu đãi ngay đầu caption', 'CTA đặt hàng ở cuối, dễ thấy', 'Nên thêm 1 ảnh sản phẩm để tăng tương tác'],
  },
  p2: {
    sparkline: [30, 38, 35, 44, 40, 42, 41],
    commentSummary: 'Hỏi giá và size; vài góp ý về topping.',
    topics: ['Giá', 'Size'],
    botScore: 72,
    botBullets: ['Caption ngắn, dễ đọc', 'Thiếu CTA rõ ràng hơn', 'Khung giờ đăng hợp buổi trưa'],
  },
  p3: {
    sparkline: [48, 50, 52, 49, 53, 51, 54],
    commentSummary: 'Cảm ơn và hỏi giờ mở cửa cuối tuần.',
    topics: ['Giờ mở cửa'],
    botScore: 78,
    botBullets: ['Thông tin giờ rõ ràng', 'Có thể thêm emoji nhẹ cho thân thiện'],
  },
  p4: {
    sparkline: [22, 28, 26, 30, 29, 31, 30],
    commentSummary: 'Feedback tích cực, một số hỏi địa chỉ chi nhánh.',
    topics: ['Địa điểm', 'Feedback'],
    botScore: 80,
    botBullets: ['Social proof tốt', 'Nên trả lời comment địa chỉ trong 24h'],
  },
  p5: {
    sparkline: [55, 62, 68, 72, 70, 74, 76],
    commentSummary: 'Hype livestream, hỏi link xem và giờ chính xác.',
    topics: ['Livestream', 'Link'],
    botScore: 88,
    botBullets: ['Giờ live rõ, engagement cao', 'Nên ghim link ở comment đầu'],
  },
  p6: {
    sparkline: [35, 40, 38, 42, 41, 43, 42],
    commentSummary: 'Hỏi món mới và giá theo tuần.',
    topics: ['Menu', 'Giá'],
    botScore: 76,
    botBullets: ['Đều đặn theo tuần tốt', 'Có thể thêm CTA “đặt trước”'],
  },
}

function getPostViewExtra(postId: string): PostViewExtraMock {
  return (
    POST_VIEW_EXTRA[postId] || {
      sparkline: [40, 42, 41, 43, 42, 44, 43],
      commentSummary: 'Tóm tắt comment (mock).',
      topics: ['Chung'],
      botScore: 70,
      botBullets: ['Kiểm tra caption', 'Thử CTA rõ hơn'],
    }
  )
}

function PostViewModalBody({
  post,
  detail,
  loading,
  t,
}: {
  post: PostRow
  detail: FbPostDetailResponse | null
  loading: boolean
  t: (key: string) => string
}) {
  const vx = getPostViewExtra(post.id)
  const isReal = !!detail && !loading

  const sparkline = isReal ? detail.sparkline : vx.sparkline
  const commentSummary = isReal ? detail.commentAi.summary : vx.commentSummary
  const topics = isReal ? detail.commentAi.topics : vx.topics
  const botScore = isReal ? detail.botEvaluation.score : vx.botScore
  const botBullets = isReal ? detail.botEvaluation.bullets : vx.botBullets
  const reach = isReal ? detail.insights.reach : post.reach
  const engagedCount = isReal ? detail.insights.engaged : post.reactions + post.comments + post.shares
  const erLabel = isReal ? detail.insights.engagementRate : engagementRateLabel(post)
  const permalinkUrl = isReal ? detail.permalinkUrl : `https://www.facebook.com/${post.id}`
  const messageText = isReal ? detail.message : post.text

  if (loading) {
    return <p className="text-sm text-slate-500 py-8 text-center">{t('marketing.detailLoading')}</p>
  }

  return (
    <div className="space-y-4">
      {!isReal && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-none px-2 py-1">{t('marketing.mockDataBadge')}</p>
      )}
      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{messageText}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-none border border-slate-200 p-2"><p className="text-[11px] text-slate-500">{t('marketing.kpiReach')}</p><p className="text-sm font-semibold text-slate-900">{formatReachShort(reach)}</p></div>
        <div className="rounded-none border border-slate-200 p-2"><p className="text-[11px] text-slate-500">{t('marketing.postEngaged')}</p><p className="text-sm font-semibold text-slate-900">{engagedCount}</p></div>
        <div className="rounded-none border border-slate-200 p-2"><p className="text-[11px] text-slate-500">{t('marketing.kpiEngagementRate')}</p><p className="text-sm font-semibold text-slate-900">{erLabel}</p></div>
        <div className="rounded-none border border-slate-200 p-2"><p className="text-[11px] text-slate-500">{t('marketing.postReactions')}</p><p className="text-sm font-semibold text-slate-900">{post.reactions}</p></div>
      </div>
      <div className="rounded-none border border-slate-200 p-3">
        <p className="text-xs font-medium text-slate-700 mb-2">{t('marketing.postSparklineTitle')}</p>
        <div className="h-16 flex items-end gap-1">
          {sparkline.map((h, i) => (
            <div key={i} className="flex-1 min-w-0 rounded-none bg-slate-700/80" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="rounded-none border border-slate-200 p-3">
        <div className="flex items-center gap-2 mb-1">
          <img src={aiActionsBotIcon} alt="" className="h-5 w-5 object-contain" />
          <p className="text-xs font-medium text-slate-700">{t('marketing.commentAiTitle')}</p>
        </div>
        <p className="text-sm text-slate-600">{commentSummary || '—'}</p>
        {topics.length > 0 && <p className="text-xs text-slate-500 mt-2">{t('marketing.commentTopics')}: {topics.join(', ')}</p>}
      </div>
      <div className="rounded-none border border-slate-200 p-3">
        <div className="flex items-center gap-2 mb-1">
          <img src={aiActionsBotIcon} alt="" className="h-5 w-5 object-contain" />
          <p className="text-xs font-medium text-slate-700">{t('marketing.botEvalTitle')}</p>
          <span className="text-xs font-semibold text-slate-800">{botScore}/100</span>
        </div>
        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
          {botBullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </div>
      <a href={permalinkUrl} target="_blank" rel="noreferrer" className="inline-block text-sm text-primary hover:underline">{t('marketing.openOnFacebook')}</a>
    </div>
  )
}

function CenterModal({
  open,
  title,
  onClose,
  children,
  size = 'md',
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: 'md' | 'lg'
}) {
  if (!open) return null
  const maxW = size === 'lg' ? 'max-w-4xl' : 'max-w-3xl'
  return (
    <div className="fixed inset-0 z-50 bg-black/45 p-4 flex items-center justify-center">
      <div className={`w-full ${maxW} bg-white border border-slate-200 rounded-none shadow-xl max-h-[90vh] flex flex-col`}>
        <div className="shrink-0 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <button type="button" onClick={onClose} className="text-sm text-slate-600 hover:text-slate-900">Close</button>
        </div>
        <div className="p-4 overflow-y-auto min-h-0">{children}</div>
      </div>
    </div>
  )
}

function Avatar({ page }: { page: PageRow | null }) {
  if (!page) return <div className="h-10 w-10 rounded-none bg-slate-300" />
  if (page.avatarUrl) return <img src={page.avatarUrl} alt={page.name} className="h-10 w-10 rounded-none object-cover" />
  const initial = page.name.trim().charAt(0).toUpperCase() || 'F'
  return <div className="h-10 w-10 rounded-none bg-blue-600 text-white text-sm font-bold flex items-center justify-center">{initial}</div>
}

function InfoDot({
  tip,
  active,
  onToggle,
  onHover,
}: {
  tip: string
  active: boolean
  onToggle: () => void
  onHover: (isHover: boolean) => void
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onClick={onToggle}
        className="inline-flex h-4 w-4 items-center justify-center rounded-none border border-slate-300 text-[10px] text-slate-600 hover:bg-slate-100"
      >
        i
      </button>
      <div
        className={`pointer-events-none absolute right-0 top-5 w-56 rounded-none border border-slate-200 bg-white p-2 text-[11px] text-slate-600 shadow-lg transition-all ${active ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}
      >
        {tip}
      </div>
    </div>
  )
}

function shortTimeLabel(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString()
}

export default function ShopMarketingFacebookWorkspacePage() {
  const { t, locale } = useLocale()
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [pages, setPages] = useState<PageRow[]>([])
  const [pagesLoading, setPagesLoading] = useState(false)
  const [pagesError, setPagesError] = useState<string | null>(null)
  const [selectedPageId, setSelectedPageId] = useState('')
  const [writeText, setWriteText] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [postsLoading, setPostsLoading] = useState(false)

  const [openConnect, setOpenConnect] = useState(false)
  const [openPageDetail, setOpenPageDetail] = useState(false)
  const [detailPage, setDetailPage] = useState<PageRow | null>(null)
  const [openDashboard, setOpenDashboard] = useState(false)
  const [openAiAssist, setOpenAiAssist] = useState(false)
  const [openImagePicker, setOpenImagePicker] = useState(false)
  const [openPostView, setOpenPostView] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [activePost, setActivePost] = useState<PostRow | null>(null)
  const [newPageName, setNewPageName] = useState('')
  const [newPageId, setNewPageId] = useState('')
  const [aiGuide, setAiGuide] = useState('')
  const [openHelpKey, setOpenHelpKey] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [manualLoading, setManualLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailApi, setDetailApi] = useState<PageDetailMock | null>(null)
  const [newAccessToken, setNewAccessToken] = useState('')
  const [postDetail, setPostDetail] = useState<FbPostDetailResponse | null>(null)
  const [postDetailLoading, setPostDetailLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const [publishLoading, setPublishLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [shopAssets, setShopAssets] = useState<{ id: string; url: string; name?: string }[]>([])
  const [fbSdkReady, setFbSdkReady] = useState(false)
  const fbXfbmlRef = useRef<HTMLDivElement>(null)

  const viteFbAppId = (import.meta.env.VITE_FB_APP_ID as string | undefined)?.trim()
  const viteFbLoginConfigId = (import.meta.env.VITE_FB_LOGIN_CONFIG_ID as string | undefined)?.trim()
  const viteGraphVersion = import.meta.env.VITE_FACEBOOK_GRAPH_VERSION || 'v20.0'

  const selectedPage = pages.find((item) => item.id === selectedPageId) || null
  const postsByPage = useMemo(() => posts.filter((item) => item.pageId === selectedPageId), [posts, selectedPageId])
  const detailData = detailApi

  const loadPages = useCallback(
    async (sync = false) => {
      if (!token || !id) return
      setPagesLoading(true)
      setPagesError(null)
      const { data, error, status } = await facebookMarketingApi.listPages(token, id, sync)
      setPagesLoading(false)
      if (error || !data?.pages) {
        setPagesError(error || `HTTP ${status}`)
        return
      }
      const mapped: PageRow[] = data.pages.map((p) => ({
        id: p.pageId,
        name: p.name,
        followers: p.followers ?? 0,
        avatarUrl: p.pictureUrl || undefined,
        category: p.category || undefined,
      }))
      setPages(mapped)
      setSelectedPageId((prev) => {
        if (prev && mapped.some((x) => x.id === prev)) return prev
        return mapped[0]?.id || ''
      })
    },
    [token, id]
  )

  const loadPosts = useCallback(async () => {
    if (!token || !id || !selectedPageId) {
      setPosts([])
      return
    }
    setPostsLoading(true)
    const { data, error } = await facebookMarketingApi.listPosts(token, id, selectedPageId)
    setPostsLoading(false)
    if (error || !data?.posts) {
      setPosts([])
      return
    }
    setPosts(
      data.posts.map((p) => ({
        id: p.postId,
        pageId: selectedPageId,
        title: p.title,
        text: p.messagePreview || '',
        image: null,
        reach: p.reach,
        reactions: p.reactions,
        comments: p.comments,
        shares: p.shares,
        time: shortTimeLabel(p.createdTime || p.timeLabel),
        createdByApp: p.canEditViaApi,
      }))
    )
  }, [token, id, selectedPageId])

  useEffect(() => {
    void loadPages(false)
  }, [loadPages])

  useEffect(() => {
    const fb = searchParams.get('fb')
    const fbErr = searchParams.get('fb_error')
    const n = searchParams.get('pages')
    if (!fb && !fbErr) return
    if (fb === 'connected') {
      setBanner(t('marketing.fbBannerConnected').replace('{{count}}', String(n || '0')))
      void loadPages(false)
    } else if (fbErr === 'access_denied') {
      setBanner(t('marketing.fbBannerDenied'))
    } else if (fbErr) {
      setBanner(t('marketing.fbBannerError'))
    }
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams, loadPages, t])

  useEffect(() => {
    void loadPosts()
  }, [loadPosts])

  const loadShopAssets = useCallback(async () => {
    if (!token || !id) return
    const { data } = await fetch(`/api/shops/${id}/assets`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json().then((d: unknown) => ({ data: d as { assets?: { id: string; storage_path_or_url: string; name?: string }[] } })))
    const list = (data?.assets || []).map((a) => ({
      id: a.id,
      url: assetStorageUrl(a.storage_path_or_url),
      name: a.name,
    }))
    setShopAssets(list)
  }, [token, id])

  useEffect(() => {
    if (openImagePicker) void loadShopAssets()
  }, [openImagePicker, loadShopAssets])

  useEffect(() => {
    if (!viteFbAppId || !id || !token) {
      setFbSdkReady(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        await loadAndInitFacebookSdk(
          viteFbAppId,
          viteGraphVersion,
          locale === 'vi' ? 'vi_VN' : 'en_US'
        )
        if (!cancelled) {
          setFbSdkReady(true)
          void getFacebookLoginStatus().catch(() => null)
        }
      } catch {
        if (!cancelled) setFbSdkReady(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [viteFbAppId, viteGraphVersion, locale, id, token])

  useEffect(() => {
    if (!fbSdkReady || !viteFbAppId || !fbXfbmlRef.current) return
    const safeConfig = viteFbLoginConfigId?.replace(/"/g, '') || ''
    const scope = FB_LOGIN_SCOPES.replace(/"/g, '')
    const attrs = safeConfig
      ? `config_id="${safeConfig}"`
      : `scope="${scope}"`
    fbXfbmlRef.current.innerHTML = `<fb:login-button size="large" button_type="login_with" ${attrs} onlogin="window.__aimapAfterFbLogin&&window.__aimapAfterFbLogin()"></fb:login-button>`
    parseXfbml(fbXfbmlRef.current)
  }, [fbSdkReady, viteFbAppId, viteFbLoginConfigId])

  useEffect(() => {
    window.__aimapAfterFbLogin = () => {
      void (async () => {
        if (!token || !id) return
        try {
          const s = await getFacebookLoginStatus()
          if (s.status !== 'connected' || !s.authResponse?.accessToken) return
          const { data, error } = await facebookMarketingApi.connectWithJsUserToken(token, id, s.authResponse.accessToken)
          if (error || !data?.ok) {
            setBanner(error || t('marketing.fbBannerError'))
            return
          }
          setBanner(t('marketing.fbBannerConnected').replace('{{count}}', String(data.pages ?? 0)))
          void loadPages(false)
        } catch {
          setBanner(t('marketing.fbBannerError'))
        }
      })()
    }
    return () => {
      delete window.__aimapAfterFbLogin
    }
  }, [token, id, loadPages, t])

  const startFacebookOAuth = async () => {
    if (!token || !id) return
    setOauthLoading(true)
    const { data, error, status } = await facebookMarketingApi.getOAuthUrl(token, id)
    setOauthLoading(false)
    if (error || !data?.url) {
      setBanner(error || (status === 503 ? t('marketing.oauthNotConfigured') : t('marketing.fbBannerError')))
      return
    }
    window.location.href = data.url
  }

  const connectFacebookSdk = async () => {
    if (!token || !id || !viteFbAppId) return
    setOauthLoading(true)
    try {
      await loadAndInitFacebookSdk(
        viteFbAppId,
        viteGraphVersion,
        locale === 'vi' ? 'vi_VN' : 'en_US'
      )
      let r = await getFacebookLoginStatus()
      if (r.status !== 'connected' || !r.authResponse?.accessToken) {
        r = await facebookLoginWithScopes(FB_LOGIN_SCOPES)
      }
      if (r.status !== 'connected' || !r.authResponse?.accessToken) {
        setBanner(t('marketing.fbLoginCancelled'))
        return
      }
      const { data, error } = await facebookMarketingApi.connectWithJsUserToken(token, id, r.authResponse.accessToken)
      if (error || !data?.ok) {
        setBanner(error || t('marketing.fbBannerError'))
        return
      }
      setBanner(t('marketing.fbBannerConnected').replace('{{count}}', String(data.pages ?? 0)))
      void loadPages(false)
    } catch (e) {
      setBanner(e instanceof Error ? e.message : t('marketing.fbBannerError'))
    } finally {
      setOauthLoading(false)
    }
  }

  const connectManual = async () => {
    if (!token || !id || !newPageName.trim() || !newPageId.trim() || !newAccessToken.trim()) return
    setManualLoading(true)
    const { error } = await facebookMarketingApi.connectPage(token, id, {
      pageId: newPageId.trim(),
      accessToken: newAccessToken.trim(),
      pageName: newPageName.trim(),
    })
    setManualLoading(false)
    if (error) {
      setBanner(error)
      return
    }
    setNewPageName('')
    setNewPageId('')
    setNewAccessToken('')
    setOpenConnect(false)
    void loadPages(false)
  }

  const disconnectPage = async (pageId: string) => {
    if (!token || !id) return
    const { error } = await facebookMarketingApi.disconnectPage(token, id, pageId)
    if (error) {
      setBanner(error)
      return
    }
    void loadPages(false)
  }

  const openPageDetailFetch = async (item: PageRow) => {
    setDetailPage(item)
    setOpenPageDetail(true)
    setDetailApi(null)
    if (!token || !id) return
    setDetailLoading(true)
    const { data, error } = await facebookMarketingApi.getPageDetail(token, id, item.id)
    setDetailLoading(false)
    if (data && !error) setDetailApi(mapFbDetailToMock(data))
  }

  const openPostViewFetch = async (item: PostRow) => {
    setActivePost(item)
    setPostDetail(null)
    setOpenPostView(true)
    if (!token || !id) return
    setPostDetailLoading(true)
    const { data, error } = await facebookMarketingApi.getPostDetail(token, id, item.id)
    setPostDetailLoading(false)
    if (data && !error) setPostDetail(data)
  }

  const applyAi = async () => {
    if (!token || !id) return
    setAiLoading(true)
    setAiSuggestion(null)
    const { data, error } = await facebookMarketingApi.aiAssist(token, id, {
      draftMessage: writeText,
      instruction: aiGuide.trim() || 'Viết rõ ràng, ngắn gọn, có CTA.',
      locale: 'vi',
    })
    setAiLoading(false)
    if (error || !data?.suggestedMessage) {
      setBanner(error || t('marketing.aiAssistError'))
      return
    }
    setAiSuggestion(data.suggestedMessage)
  }

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return
    setWriteText(aiSuggestion)
    setAiSuggestion(null)
    setAiGuide('')
    setOpenAiAssist(false)
  }

  const publishPost = async () => {
    if (!previewText.trim() || !selectedPageId || !token || !id) return
    setPublishLoading(true)
    const imageUrl = previewImage && /^https?:\/\//i.test(previewImage) ? previewImage : undefined
    const { data, error } = await facebookMarketingApi.publishPost(token, id, selectedPageId, {
      message: previewText.trim(),
      imageUrl,
    })
    setPublishLoading(false)
    if (error || !data?.ok) {
      setBanner(error || t('marketing.publishError'))
      return
    }
    setBanner(t('marketing.publishSuccess'))
    setPreviewText('')
    setPreviewImage(null)
    setWriteText('')
    void loadPosts()
  }

  const editActivePost = async () => {
    if (!activePost || !token || !id) return
    setEditLoading(true)
    const { error } = await facebookMarketingApi.updatePost(token, id, activePost.id, activePost.text)
    setEditLoading(false)
    if (error) {
      setBanner(error)
      return
    }
    setPosts((prev) => prev.map((item) => (item.id === activePost.id ? activePost : item)))
    setOpenEdit(false)
  }

  const deleteActivePost = async () => {
    if (!activePost || !token || !id) return
    setDeleteLoading(true)
    const { error } = await facebookMarketingApi.deletePost(token, id, activePost.id)
    setDeleteLoading(false)
    if (error) {
      setBanner(error)
      return
    }
    setPosts((prev) => prev.filter((item) => item.id !== activePost.id))
    setOpenDelete(false)
  }

  if (!id) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('marketing.facebookWorkspaceTitle')}</h1>
        <Link to={`/shops/${id}/marketing`} className="text-sm text-primary hover:underline">{t('marketing.backToPlatforms')}</Link>
      </div>

      {banner && (
        <div className="rounded-none border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 flex items-center justify-between gap-2">
          <span>{banner}</span>
          <button type="button" className="text-xs text-slate-600 hover:text-slate-900" onClick={() => setBanner(null)}>
            ×
          </button>
        </div>
      )}

      <section className="rounded-none border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{t('marketing.facebookPages')}</p>
            <p className="text-xs text-slate-500">
              {pagesLoading ? '…' : `${pages.length} pages`}
              {pagesError ? ` · ${pagesError}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pagesLoading}
              onClick={() => void loadPages(true)}
              className="px-3 py-1.5 text-sm rounded-none border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              {t('marketing.syncPages')}
            </button>
            {viteFbAppId ? (
              <>
                <button
                  type="button"
                  onClick={() => void connectFacebookSdk()}
                  disabled={oauthLoading || !fbSdkReady}
                  className="px-3 py-1.5 text-sm rounded-none bg-[#1877f2] text-white hover:bg-[#166fe5] disabled:opacity-50"
                  title={!fbSdkReady ? t('marketing.fbSdkLoading') : undefined}
                >
                  {oauthLoading ? '…' : t('marketing.connectFacebookSdk')}
                </button>
                <button
                  type="button"
                  onClick={() => void startFacebookOAuth()}
                  disabled={oauthLoading}
                  className="px-3 py-1.5 text-sm rounded-none border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  {t('marketing.connectFacebookRedirect')}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void startFacebookOAuth()}
                disabled={oauthLoading}
                className="px-3 py-1.5 text-sm rounded-none bg-[#1877f2] text-white hover:bg-[#166fe5] disabled:opacity-50"
              >
                {oauthLoading ? '…' : t('marketing.connectFacebookOAuth')}
              </button>
            )}
            <button type="button" onClick={() => setOpenConnect(true)} className="px-3 py-1.5 text-sm rounded-none border border-slate-200 bg-white hover:bg-slate-50">
              {t('marketing.connectPageManual')}
            </button>
            <button type="button" onClick={() => setOpenDashboard(true)} className="px-3 py-1.5 text-sm rounded-none bg-slate-900 text-white hover:bg-slate-800">
              {t('marketing.viewPageDashboard')}
            </button>
          </div>
        </div>
        {viteFbAppId && fbSdkReady && (
          <div className="mb-3 px-1">
            <p className="text-xs text-slate-500 mb-1">{t('marketing.fbLoginButtonTitle')}</p>
            <div ref={fbXfbmlRef} className="min-h-[44px]" />
          </div>
        )}
        <div className="max-h-[12.5rem] overflow-y-auto rounded-none border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_0_0_rgb(226_232_240)]">
              <tr className="text-slate-600">
                <th className="text-left px-3 py-2">{t('marketing.pageName')}</th>
                <th className="text-left px-3 py-2">{t('marketing.pageId')}</th>
                <th className="text-left px-3 py-2">{t('marketing.followers')}</th>
                <th className="text-left px-3 py-2">{t('marketing.pageDetailColumn')}</th>
                <th className="text-left px-3 py-2">{t('marketing.pagePickColumn')}</th>
                <th className="text-left px-3 py-2">{t('marketing.disconnectPage')}</th>
              </tr>
            </thead>
            <tbody>
              {pages.length === 0 && !pagesLoading && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-xs text-slate-500">
                    {t('marketing.noPagesConnected')}
                  </td>
                </tr>
              )}
              {pages.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{item.name}</td>
                  <td className="px-3 py-2 text-slate-500">{item.id}</td>
                  <td className="px-3 py-2 text-slate-700">{item.followers}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void openPageDetailFetch(item)}
                      className="px-2 py-1 text-xs rounded-none border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    >
                      {t('marketing.pageDetailBtn')}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPageId(item.id)}
                      className={`px-2 py-1 text-xs rounded-none border ${selectedPageId === item.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
                    >
                      {selectedPageId === item.id ? t('marketing.pageSelected') : t('marketing.pageSelect')}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void disconnectPage(item.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      {t('marketing.disconnectPage')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_60px_minmax(0,1fr)] gap-4 items-stretch">
        <div className="rounded-none border border-slate-200 bg-white p-4 max-h-[420px] min-h-0 overflow-hidden flex flex-col">
          <div className="shrink-0 flex items-center justify-between mb-2"><p className="text-sm font-semibold text-slate-900">{t('marketing.writeContent')}</p><button type="button" onClick={() => setOpenAiAssist(true)} className="px-3 py-1.5 text-xs rounded-none border border-slate-200 bg-white hover:bg-slate-50">{t('marketing.aiAssist')}</button></div>
          <textarea value={writeText} onChange={(e) => setWriteText(e.target.value)} placeholder={t('marketing.writePlaceholder')} rows={8} className="w-full flex-1 min-h-0 max-h-full rounded-none border border-slate-200 px-3 py-3 text-sm resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="hidden lg:flex items-center justify-center"><button type="button" onClick={() => setPreviewText(writeText)} title={t('marketing.sendToOverview')} className="h-11 w-11 rounded-none bg-slate-900 text-white text-lg hover:bg-slate-800">→</button></div>
        <div className="rounded-none border border-slate-200 bg-white p-4 min-h-[420px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-2"><p className="text-sm font-semibold text-slate-900">{t('marketing.overviewPost')}</p><button type="button" onClick={() => setPreviewText(writeText)} className="lg:hidden px-3 py-1.5 text-xs rounded-none bg-slate-900 text-white">{t('marketing.sendToOverview')}</button></div>
          <div className="rounded-none border border-slate-300 bg-white min-h-0 h-full overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between"><div className="flex items-center gap-2"><Avatar page={selectedPage} /><div><p className="text-sm font-semibold text-slate-800">{selectedPage?.name || 'Facebook Page'}</p><p className="text-[11px] text-slate-500">Right now · Public</p></div></div><p className="text-slate-500">•••</p></div>
            <div className="px-3 py-2 max-h-40 overflow-auto"><p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-5">{previewText || t('marketing.overviewEmpty')}</p></div>
            <div className="px-3 pb-2">{previewImage ? <img src={previewImage} alt="preview" className="w-full h-44 object-cover rounded-none border border-slate-200" /> : <button type="button" onClick={() => setOpenImagePicker(true)} className="w-full h-44 rounded-none border-2 border-dashed border-slate-300 text-3xl text-slate-500 hover:bg-slate-100">+</button>}</div>
            <div className="px-3 py-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between"><span>0 reactions</span><span>0 comments · 0 shares</span></div>
            <div className="grid grid-cols-3 border-t border-slate-100"><button type="button" className="py-2 text-xs text-slate-600 hover:bg-slate-50">Like</button><button type="button" className="py-2 text-xs text-slate-600 border-x border-slate-100 hover:bg-slate-50">Comment</button><button type="button" className="py-2 text-xs text-slate-600 hover:bg-slate-50">Share</button></div>
            <div className="px-3 py-2 border-t border-slate-100 flex justify-end gap-2">
              {previewImage && <button type="button" onClick={() => setPreviewImage(null)} className="px-3 py-1.5 text-xs rounded-none border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">✕ Ảnh</button>}
              <button
                type="button"
                disabled={publishLoading || !previewText.trim() || !selectedPageId}
                onClick={() => void publishPost()}
                className="px-3 py-1.5 text-xs rounded-none bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {publishLoading ? '…' : t('marketing.publishPost')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-none border border-slate-200 bg-white p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-900">{t('marketing.managerPosts')}</p>
          <div className="flex items-center gap-2">
            {postsLoading && <span className="text-xs text-slate-500">…</span>}
            <select
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
              className="text-sm rounded-none border border-slate-200 px-3 py-1.5"
            >
              {pages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="max-h-[12.5rem] overflow-y-auto rounded-none border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-[1]">
              <tr className="text-slate-600">
                <th className="text-left p-2">{t('marketing.postTitle')}</th>
                <th className="text-left p-2">{t('marketing.postEngagementCol')}</th>
                <th className="text-left p-2">{t('marketing.postTimeCol')}</th>
                <th className="text-left p-2">{t('marketing.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {postsByPage.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="p-2 text-slate-700 max-w-[10rem] truncate" title={item.title}>{item.title}</td>
                  <td className="p-2 text-slate-600 text-xs">
                    {formatReachShort(item.reach)} {t('marketing.reachShort')} · ER {engagementRateLabel(item)}
                  </td>
                  <td className="p-2 text-slate-600 whitespace-nowrap">{item.time}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <button
                        type="button"
                        onClick={() => void openPostViewFetch(item)}
                        className="text-xs text-slate-700 hover:underline"
                      >
                        {t('marketing.postViewAction')}
                      </button>
                      <button type="button" onClick={() => { setActivePost(item); setOpenEdit(true) }} className="text-xs text-slate-700 hover:underline">{t('marketing.editPost')}</button>
                      <button type="button" onClick={() => { setActivePost(item); setOpenDelete(true) }} className="text-xs text-red-600 hover:underline">{t('storage.delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {postsByPage.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-3 text-xs text-slate-400">{t('marketing.noPosts')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CenterModal
        open={openPageDetail}
        title={detailPage ? `${detailPage.name} · ${detailPage.id}` : ''}
        onClose={() => {
          setOpenPageDetail(false)
          setDetailPage(null)
          setDetailApi(null)
        }}
        size="lg"
      >
        {detailLoading && <p className="text-sm text-slate-600">{t('marketing.detailLoading')}</p>}
        {detailPage && !detailLoading && !detailData && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-none px-2 py-2">{t('marketing.detailEmpty')}</p>
        )}
        {detailPage && detailData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar page={detailPage} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{detailPage.name}</p>
                  <p className="text-xs text-slate-500">{detailPage.category || 'Business'} · {detailData.period}</p>
                </div>
              </div>
              <span className="rounded-none border border-slate-200 px-2 py-1 text-xs text-slate-600">{detailData.period}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="rounded-none border border-slate-200 p-2"><p className="text-[11px] text-slate-500">{t('marketing.kpiReach')}</p><p className="text-sm font-semibold text-slate-900">{detailData.kpis.reach}</p></div>
              <div className="rounded-none border border-slate-200 p-2"><p className="text-[11px] text-slate-500">{t('marketing.kpiEngagementRate')}</p><p className="text-sm font-semibold text-slate-900">{detailData.kpis.engagementRate}</p></div>
              <div className="rounded-none border border-slate-200 p-2"><p className="text-[11px] text-slate-500">{t('marketing.kpiAvgReactions')}</p><p className="text-sm font-semibold text-slate-900">{detailData.kpis.avgReactions}</p></div>
              <div className="rounded-none border border-slate-200 p-2"><p className="text-[11px] text-slate-500">{t('marketing.kpiAvgComments')}</p><p className="text-sm font-semibold text-slate-900">{detailData.kpis.avgComments}</p></div>
              <div className="rounded-none border border-slate-200 p-2"><p className="text-[11px] text-slate-500">{t('marketing.kpiFollowersDelta')}</p><p className="text-sm font-semibold text-emerald-600">+{detailData.kpis.followersDelta}</p></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-none border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-700">{t('marketing.chartReachMock')}</p>
                  <InfoDot
                    tip={t('marketing.chartReachTip')}
                    active={openHelpKey === 'reach'}
                    onToggle={() => setOpenHelpKey((prev) => (prev === 'reach' ? null : 'reach'))}
                    onHover={(hover) => setOpenHelpKey(hover ? 'reach' : null)}
                  />
                </div>
                <div className="h-28 flex items-end gap-1.5">
                  {detailData.trendBars.map((h, i) => (
                    <div key={i} className="flex-1 min-w-0 rounded-none bg-blue-500/85" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="rounded-none border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-700">{t('marketing.chartMixMock')}</p>
                  <InfoDot
                    tip={t('marketing.chartMixTip')}
                    active={openHelpKey === 'mix'}
                    onToggle={() => setOpenHelpKey((prev) => (prev === 'mix' ? null : 'mix'))}
                    onHover={(hover) => setOpenHelpKey(hover ? 'mix' : null)}
                  />
                </div>
                <div className="space-y-2 pt-1">
                  {detailData.engagementMix.map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500"><span>{item.label}</span><span>{item.value}%</span></div>
                      <div className="h-2.5 rounded-none bg-slate-100 overflow-hidden"><div className={`h-full rounded-none ${item.color}`} style={{ width: `${item.value}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-center">
                  <div className="h-20 w-20 rounded-none border-4 border-slate-200" style={{ background: 'conic-gradient(rgb(16 185 129) 0% 40%, rgb(245 158 11) 40% 72%, rgb(139 92 246) 72% 100%)' }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-none border border-slate-200 p-3">
                <p className="mb-2 text-xs font-medium text-slate-700">{t('marketing.bestTimesTitle')}</p>
                <div className="space-y-2">
                  {detailData.bestTimes.map((item) => (
                    <div key={`${item.day}-${item.slot}`} className="rounded-none border border-slate-100 px-2 py-1.5">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-600"><span>{item.day}</span><span>{item.slot}</span></div>
                      <div className="h-2 rounded-none bg-slate-100"><div className="h-2 rounded-none bg-blue-500" style={{ width: `${item.value}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-none border border-slate-200 p-3">
                <p className="mb-2 text-xs font-medium text-slate-700">{t('marketing.topPostsTitle')}</p>
                <div className="space-y-2">
                  {detailData.topPosts.map((item) => (
                    <div key={item.title} className="rounded-none border border-slate-100 p-2">
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.metric} · {item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-none border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <img src={aiActionsBotIcon} alt="" className="h-6 w-6 object-contain" />
                <p className="text-xs font-medium text-slate-700">{t('marketing.aiActionTitle')}</p>
              </div>
              <div className="space-y-1.5">
                {detailData.aiActions.map((item) => (
                  <p key={item.action} className="text-sm text-slate-700">
                    - {item.action}. {item.impact}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </CenterModal>
      <CenterModal open={openConnect} title={t('marketing.connectPageManual')} onClose={() => setOpenConnect(false)}>
        <div className="space-y-3">
          <input
            value={newPageName}
            onChange={(e) => setNewPageName(e.target.value)}
            placeholder={t('marketing.pageName')}
            className="w-full rounded-none border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={newPageId}
            onChange={(e) => setNewPageId(e.target.value)}
            placeholder={t('marketing.pageId')}
            className="w-full rounded-none border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={newAccessToken}
            onChange={(e) => setNewAccessToken(e.target.value)}
            placeholder={t('marketing.pageAccessToken')}
            className="w-full rounded-none border border-slate-200 px-3 py-2 text-sm font-mono text-xs"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={manualLoading}
              onClick={() => void connectManual()}
              className="px-3 py-2 text-sm rounded-none bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {manualLoading ? '…' : t('marketing.addPage')}
            </button>
          </div>
        </div>
      </CenterModal>
      <CenterModal open={openDashboard} title={t('marketing.pageDashboard')} onClose={() => setOpenDashboard(false)}>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-none border border-slate-200 p-3">
            <p className="text-xs text-slate-500">{t('marketing.followers')}</p>
            <p className="text-lg font-semibold text-slate-900">{selectedPage?.followers ?? 0}</p>
          </div>
          <div className="rounded-none border border-slate-200 p-3">
            <p className="text-xs text-slate-500">{t('marketing.engagement')}</p>
            <p className="text-lg font-semibold text-slate-900">{detailApi?.kpis.engagementRate ?? '—'}</p>
          </div>
          <div className="rounded-none border border-slate-200 p-3">
            <p className="text-xs text-slate-500">{t('marketing.overall')}</p>
            <p className="text-lg font-semibold text-slate-900">
              {(detailApi?.kpis.followersDelta ?? 0) > 0 ? '+' + detailApi?.kpis.followersDelta : '—'}
            </p>
          </div>
        </div>
      </CenterModal>
      <CenterModal open={openAiAssist} title={t('marketing.aiAssist')} onClose={() => { setOpenAiAssist(false); setAiSuggestion(null) }}>
        <div className="space-y-3">
          <textarea value={aiGuide} onChange={(e) => setAiGuide(e.target.value)} rows={3} placeholder={t('marketing.aiPromptPlaceholder')} className="w-full rounded-none border border-slate-200 px-3 py-2 text-sm" />
          {aiSuggestion && (
            <div className="rounded-none border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500 mb-1">{t('marketing.aiSuggestion')}</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{aiSuggestion}</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={aiLoading} onClick={() => void applyAi()} className="px-3 py-2 text-sm rounded-none border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">{aiLoading ? '…' : t('marketing.generateAi')}</button>
            {aiSuggestion && <button type="button" onClick={applyAiSuggestion} className="px-3 py-2 text-sm rounded-none bg-slate-900 text-white hover:bg-slate-800">{t('marketing.applyAi')}</button>}
          </div>
        </div>
      </CenterModal>
      <CenterModal open={openImagePicker} title={t('marketing.pickImage')} onClose={() => setOpenImagePicker(false)}>
        {shopAssets.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {shopAssets.map((a) => (
              <button key={a.id} type="button" onClick={() => { setPreviewImage(a.url); setOpenImagePicker(false) }} className="rounded-none overflow-hidden border border-slate-200 hover:border-slate-400">
                <img src={a.url} alt={a.name || ''} className="h-16 w-full object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-4 text-center">{t('marketing.noAssets')}</p>
        )}
        <div className="mt-3 flex justify-end"><Link to={`/shops/${id}/image-bot`} className="text-sm text-primary hover:underline">{t('marketing.useImageBot')}</Link></div>
      </CenterModal>
      <CenterModal
        open={openPostView}
        title={activePost ? `${t('marketing.postViewTitle')} · ${activePost.title}` : t('marketing.postViewTitle')}
        onClose={() => { setOpenPostView(false); setActivePost(null); setPostDetail(null) }}
        size="lg"
      >
        {activePost ? <PostViewModalBody post={activePost} detail={postDetail} loading={postDetailLoading} t={t} /> : null}
      </CenterModal>
      <CenterModal open={openEdit} title={t('marketing.editPost')} onClose={() => setOpenEdit(false)}>
        <div className="space-y-3">
          {activePost && !activePost.createdByApp && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-none px-2 py-2">{t('marketing.editPostApiNote')}</p>
          )}
          <div>
            <p className="text-xs text-slate-500 mb-1">{t('marketing.postBody')}</p>
            <textarea value={activePost?.text || ''} onChange={(e) => setActivePost((prev) => (prev ? { ...prev, text: e.target.value } : prev))} rows={7} className="w-full rounded-none border border-slate-200 px-3 py-2 text-sm resize-y min-h-[8rem]" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpenEdit(false)} className="px-3 py-2 text-sm rounded-none border border-slate-200 bg-white">{t('shopDetail.cancelEdit')}</button>
            <button type="button" disabled={editLoading} onClick={() => void editActivePost()} className="px-3 py-2 text-sm rounded-none bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">{editLoading ? '…' : t('marketing.save')}</button>
          </div>
        </div>
      </CenterModal>
      <CenterModal open={openDelete} title={t('marketing.deletePost')} onClose={() => setOpenDelete(false)}>
        <p className="text-sm text-slate-700 mb-3">{t('marketing.deleteConfirm')}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setOpenDelete(false)} className="px-3 py-2 text-sm rounded-none border border-slate-200 bg-white">{t('shopDetail.cancelEdit')}</button>
          <button type="button" disabled={deleteLoading} onClick={() => void deleteActivePost()} className="px-3 py-2 text-sm rounded-none bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">{deleteLoading ? '…' : t('storage.delete')}</button>
        </div>
      </CenterModal>
    </div>
  )
}

