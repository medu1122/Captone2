import { apiFetch } from './client'

function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export interface FbPageItem {
  pageId: string
  name: string
  followers: number
  category: string | null
  pictureUrl: string | null
  updatedAt: string
}

export interface FbPageDetailResponse {
  pageId: string
  range: string
  kpis: {
    reach: number
    engagementRate: string
    avgReactionsPerPost: number
    avgCommentsPerPost: number
    followersDelta: number
  }
  trendBars: number[]
  engagementMix: { label: string; percent: number }[]
  bestTimes: { day: string; slot: string; value: number }[]
  topPosts: { title: string; metric: string; reason: string }[]
  aiActions: { action: string; expectedImpact?: string }[]
  sources?: { insightsSyncedAt?: string; isPartial?: boolean }
}

export interface FbPostItem {
  postId: string
  title: string
  messagePreview: string
  createdTime: string
  timeLabel: string
  reach: number
  engagementRate: string
  reactions: number
  comments: number
  shares: number
  canEditViaApi: boolean
  permalinkUrl: string
}

export const facebookMarketingApi = {
  getOAuthUrl: (token: string, shopId: string) =>
    apiFetch<{ url: string }>(`/shops/${shopId}/facebook/oauth/url`, {
      method: 'GET',
      headers: auth(token),
    }),

  listPages: (token: string, shopId: string, sync = false) =>
    apiFetch<{ pages: FbPageItem[] }>(`/shops/${shopId}/facebook/pages${sync ? '?sync=true' : ''}`, {
      method: 'GET',
      headers: auth(token),
    }),

  connectPage: (
    token: string,
    shopId: string,
    body: { pageId: string; accessToken: string; pageName?: string }
  ) =>
    apiFetch<{ ok: boolean; pageId: string; name: string | null }>(`/shops/${shopId}/facebook/pages/connect`, {
      method: 'POST',
      headers: auth(token),
      body: body as unknown as Record<string, unknown>,
    }),

  disconnectPage: (token: string, shopId: string, pageId: string) =>
    apiFetch<{ ok: boolean }>(`/shops/${shopId}/facebook/pages/${encodeURIComponent(pageId)}`, {
      method: 'DELETE',
      headers: auth(token),
    }),

  getPageDetail: (token: string, shopId: string, pageId: string, range: '7d' | '30d' = '30d') =>
    apiFetch<FbPageDetailResponse>(
      `/shops/${shopId}/facebook/pages/${encodeURIComponent(pageId)}/detail?range=${range}`,
      {
        method: 'GET',
        headers: auth(token),
      }
    ),

  listPosts: (token: string, shopId: string, pageId: string, limit = 25) =>
    apiFetch<{ posts: FbPostItem[] }>(
      `/shops/${shopId}/facebook/pages/${encodeURIComponent(pageId)}/posts?limit=${limit}`,
      {
        method: 'GET',
        headers: auth(token),
      }
    ),
}
