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

export interface FbPostDetailResponse {
  postId: string
  pageId: string
  message: string
  permalinkUrl: string
  createdTime: string
  insights: { reach: number; engaged: number; engagementRate: string }
  sparkline: number[]
  commentAi: { summary: string; topics: string[]; sentiment: string }
  botEvaluation: { score: number; bullets: string[] }
  capabilities: { canEditViaApi: boolean; canDeleteViaApi: boolean; reasons: string[] }
  isPartial: boolean
}

export interface FbAssistResponse {
  suggestedMessage?: string
  skipped: boolean
  error?: string
  cached: boolean
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

  getPostDetail: (token: string, shopId: string, postId: string) =>
    apiFetch<FbPostDetailResponse>(
      `/shops/${shopId}/facebook/posts/${encodeURIComponent(postId)}/detail`,
      { method: 'GET', headers: auth(token) }
    ),

  updatePost: (token: string, shopId: string, postId: string, message: string) =>
    apiFetch<{ ok: boolean }>(
      `/shops/${shopId}/facebook/posts/${encodeURIComponent(postId)}`,
      {
        method: 'PATCH',
        headers: auth(token),
        body: { message } as unknown as Record<string, unknown>,
      }
    ),

  deletePost: (token: string, shopId: string, postId: string) =>
    apiFetch<{ ok: boolean }>(
      `/shops/${shopId}/facebook/posts/${encodeURIComponent(postId)}`,
      { method: 'DELETE', headers: auth(token) }
    ),

  aiAssist: (
    token: string,
    shopId: string,
    body: { draftMessage: string; instruction: string; locale?: string }
  ) =>
    apiFetch<FbAssistResponse>(
      `/shops/${shopId}/facebook/assist`,
      {
        method: 'POST',
        headers: auth(token),
        body: body as unknown as Record<string, unknown>,
      }
    ),

  publishPost: (
    token: string,
    shopId: string,
    pageId: string,
    body: { message: string; imageUrl?: string }
  ) =>
    apiFetch<{ ok: boolean; postId?: string }>(
      `/shops/${shopId}/facebook/pages/${encodeURIComponent(pageId)}/posts`,
      {
        method: 'POST',
        headers: auth(token),
        body: body as unknown as Record<string, unknown>,
      }
    ),
}
