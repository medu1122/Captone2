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
  summary?: string
  restorable?: boolean
}

export type WebsiteEntryRow = {
  id: string
  name: string
  link: string
  previewUrl: string
  status: string
  createdAt: string | null
  launchedAt: string | null
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
  template?: string
  tone?: string
  selectedAssetIds?: string[]
}

type WebsiteOverviewResponse = {
  overview: WebsiteOverview
  history: WebsiteHistoryItem[]
}

type WebsiteEntryResponse = {
  sites: WebsiteEntryRow[]
}

export type WebsiteTone = 'balanced' | 'friendly' | 'luxury' | 'energetic'
export type WebsiteTemplate = 'catalog' | 'story' | 'minimal'
export type WebsiteDeviceMode = 'desktop' | 'tablet' | 'mobile'

export type WebsiteTheme = {
  primary: string
  accent: string
  background: string
  surface: string
}

export type WebsiteSectionField = {
  key: string
  label: string
  value: string
}

export type WebsiteSection = {
  id: string
  type: string
  name: string
  editableFields?: string[]
  props: Record<string, unknown>
}

export type WebsiteVersion = {
  id: string
  title: string
  source: string
  summary: string
  createdAt: string
}

export type WebsiteConfig = {
  template: WebsiteTemplate
  theme: WebsiteTheme
  settings: {
    tone: WebsiteTone
    viewport?: WebsiteDeviceMode
    seoTitle?: string
    seoDescription?: string
    objective?: string
  }
  selectedAssetIds: string[]
  sections: WebsiteSection[]
  meta?: {
    lastIdea?: string
    lastPrompt?: string
    updatedAt?: string
    versions?: WebsiteVersion[]
  }
}

export type WebsiteBuilderState = {
  site: {
    id: string
    shop_id: string
    slug: string
    status: string
    updated_at?: string | null
  }
  config: WebsiteConfig
  sections: Array<{
    id: string
    type: string
    name: string
    editableFields?: string[]
  }>
  assets: Array<{
    id: string
    type: string | null
    name: string | null
    storage_path_or_url: string | null
    mime_type?: string | null
    model_source?: string | null
    created_at?: string
  }>
  theme: WebsiteTheme
  selectedTemplate: WebsiteTemplate
  draftPreviewUrl: string
  publicUrl: string
  previewUrl: string
  deploy: {
    status: string
    subdomain?: string | null
    deployed_at?: string | null
    updated_at?: string | null
    error_message?: string | null
  } | null
  shop: {
    id: string
    name: string
    industry?: string | null
    description?: string | null
    slug: string
  }
  versions: WebsiteVersion[]
}

export type PromptPreviewBody = {
  prompt: string
  scope: 'all' | 'selected'
  sectionId?: string | null
  creativity: 'safe' | 'balanced' | 'creative'
}

type PromptPreviewResponse = {
  summary: string
  affectedSections?: string[]
  draftConfig?: WebsiteConfig
  draftPreviewUrl?: string
}

type PromptApplyResponse = {
  ok: boolean
  message?: string
  previewUrl?: string
  affectedSections?: string[]
  config?: WebsiteConfig
}

export const shopWebsiteApi = {
  getEntry: (token: string, shopId: string) =>
    apiFetch<WebsiteEntryResponse>(`${SHOPS_PREFIX}/${shopId}/website/entry`, {
      method: 'GET',
      headers: auth(token),
    }),

  getOverview: (token: string, shopId: string) =>
    apiFetch<WebsiteOverviewResponse>(`${SHOPS_PREFIX}/${shopId}/website/overview`, {
      method: 'GET',
      headers: auth(token),
    }),

  getBuilderState: (token: string, shopId: string) =>
    apiFetch<WebsiteBuilderState>(`${SHOPS_PREFIX}/${shopId}/website/builder-state`, {
      method: 'GET',
      headers: auth(token),
    }),

  createFromIdea: (
    token: string,
    shopId: string,
    body: {
      idea: string
      template: WebsiteTemplate
      tone: WebsiteTone
      palette: Partial<WebsiteTheme>
      selectedAssetIds: string[]
    }
  ) =>
    apiFetch<{
      ok: boolean
      site: WebsiteBuilderState['site']
      config: WebsiteConfig
      sections: WebsiteBuilderState['sections']
      summary: string
    }>(`${SHOPS_PREFIX}/${shopId}/website/create-from-idea`, {
      method: 'POST',
      headers: auth(token),
      body: body as unknown as Record<string, unknown>,
    }),

  updateSection: (
    token: string,
    shopId: string,
    sectionId: string,
    body: {
      props?: Record<string, unknown>
      theme?: Partial<WebsiteTheme>
      settings?: Partial<WebsiteConfig['settings']>
      selectedAssetIds?: string[]
      moveDirection?: 'up' | 'down'
    }
  ) =>
    apiFetch<{
      ok: boolean
      site: WebsiteBuilderState['site']
      config: WebsiteConfig
      sections: WebsiteBuilderState['sections']
      summary: string
    }>(`${SHOPS_PREFIX}/${shopId}/website/sections/${encodeURIComponent(sectionId)}/update`, {
      method: 'POST',
      headers: auth(token),
      body: body as unknown as Record<string, unknown>,
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

  rebuild: (
    token: string,
    shopId: string,
    body: {
      idea?: string
      prompt?: string
      template: WebsiteTemplate
      tone: WebsiteTone
      palette: Partial<WebsiteTheme>
      selectedAssetIds: string[]
    }
  ) =>
    apiFetch<{
      ok: boolean
      site: WebsiteBuilderState['site']
      config: WebsiteConfig
      sections: WebsiteBuilderState['sections']
      summary: string
    }>(`${SHOPS_PREFIX}/${shopId}/website/rebuild`, {
      method: 'POST',
      headers: auth(token),
      body: body as unknown as Record<string, unknown>,
    }),

  listVersions: (token: string, shopId: string) =>
    apiFetch<{ versions: WebsiteVersion[] }>(`${SHOPS_PREFIX}/${shopId}/website/versions`, {
      method: 'GET',
      headers: auth(token),
    }),

  restoreVersion: (token: string, shopId: string, versionId: string) =>
    apiFetch<{
      ok: boolean
      site: WebsiteBuilderState['site']
      config: WebsiteConfig
      sections: WebsiteBuilderState['sections']
      summary: string
    }>(`${SHOPS_PREFIX}/${shopId}/website/versions/${encodeURIComponent(versionId)}/restore`, {
      method: 'POST',
      headers: auth(token),
    }),

  getDeployStatus: (token: string, shopId: string) =>
    apiFetch<{
      deployment: WebsiteBuilderState['deploy']
      liveStats: {
        running: boolean
        status?: string
        startedAt?: string
        cpuPercent?: number
        memUsageMb?: number
      } | null
      publicUrl: string
      previewUrl: string
    }>(`${SHOPS_PREFIX}/${shopId}/website/deploy/status`, {
      method: 'GET',
      headers: auth(token),
    }),

  deploy: (token: string, shopId: string) =>
    apiFetch<{
      ok: boolean
      deployment: WebsiteBuilderState['deploy']
      publicUrl: string
      previewUrl: string
    }>(`${SHOPS_PREFIX}/${shopId}/website/deploy`, {
      method: 'POST',
      headers: auth(token),
    }),
}

