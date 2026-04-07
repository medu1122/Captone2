import { apiFetch } from './client'

const SHOPS_PREFIX = '/shops'

function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export type WebsiteHistoryItem = {
  id: string
  type: 'prompt' | 'deploy' | 'system'
  title: string
  createdAt: string
}

export type WebsiteOverview = {
  siteId: string | null
  slug: string
  status: 'draft' | 'preview_ready' | 'deployed' | 'building' | 'error'
  versionCount: number
  publicUrl: string
  previewUrl: string
  updatedAt: string | null
  promptCount: number | null
  promptSuccessRate: number | null
  creditsUsed: number | null
  lastPrompt: string | null
  viewsToday: number | null
  views7d: number | null
  mobileDesktopRatio: string | null
  coreWebVitals: string | null
}

type WebsiteOverviewResponse = {
  overview: WebsiteOverview
  history: WebsiteHistoryItem[]
}

type PromptPreviewBody = {
  prompt: string
  scope: 'all' | 'selected'
  sectionId?: string | null
  creativity: 'safe' | 'balanced' | 'creative'
}

type PromptPreviewResponse = {
  summary: string
  previewUrl?: string
}

type PromptApplyResponse = {
  ok: boolean
  message?: string
  previewUrl?: string
}

export const shopWebsiteApi = {
  getOverview: (token: string, shopId: string) =>
    apiFetch<WebsiteOverviewResponse>(`${SHOPS_PREFIX}/${shopId}/website/overview`, {
      method: 'GET',
      headers: auth(token),
    }),

  previewPrompt: (token: string, shopId: string, body: PromptPreviewBody) =>
    apiFetch<PromptPreviewResponse>(`${SHOPS_PREFIX}/${shopId}/website/prompt/preview`, {
      method: 'POST',
      headers: auth(token),
      body: body as unknown as Record<string, unknown>,
    }),

  applyPrompt: (token: string, shopId: string, body: PromptPreviewBody) =>
    apiFetch<PromptApplyResponse>(`${SHOPS_PREFIX}/${shopId}/website/prompt/apply`, {
      method: 'POST',
      headers: auth(token),
      body: body as unknown as Record<string, unknown>,
    }),
}

