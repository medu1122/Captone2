import { apiFetch } from './client'

const ADMIN_PREFIX = '/admin'

function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export interface AdminContainerRow {
  id: string
  shop_id: string
  container_id: string | null
  container_name: string | null
  subdomain: string | null
  status: string
  port: number | null
  deployed_at: string | null
  last_build_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  shop_name: string
  shop_slug: string
  shop_industry: string | null
  user_id: string
  user_name: string
  user_email: string
}

export interface AdminContainerDetail extends AdminContainerRow {
  liveStats?: {
    status: string
    running: boolean
    startedAt: string | null
    finishedAt: string | null
    cpuPercent: number
    memUsageMb: number
  } | null
  logs?: string | null
}

export const adminApi = {
  listContainers: (token: string, params?: { status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))
    const qs = q.toString() ? `?${q.toString()}` : ''
    return apiFetch<{
      containers: AdminContainerRow[]
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(`${ADMIN_PREFIX}/containers${qs}`, { method: 'GET', headers: auth(token) })
  },

  getUserContainers: (token: string, userId: string) =>
    apiFetch<{ containers: AdminContainerRow[] }>(
      `${ADMIN_PREFIX}/users/${userId}/containers`,
      { method: 'GET', headers: auth(token) }
    ),

  getContainerDetail: (token: string, shopId: string, withLogs = false) =>
    apiFetch<AdminContainerDetail>(
      `${ADMIN_PREFIX}/containers/${shopId}${withLogs ? '?logs=true' : ''}`,
      { method: 'GET', headers: auth(token) }
    ),

  forceStopContainer: (token: string, shopId: string) =>
    apiFetch<{ ok: boolean }>(
      `${ADMIN_PREFIX}/containers/${shopId}/stop`,
      { method: 'POST', headers: auth(token) }
    ),
}
