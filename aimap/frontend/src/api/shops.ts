import { apiFetch } from './client'

const SHOPS_PREFIX = '/shops'

export interface ShopListItem {
  id: string
  name: string
  slug: string
  industry: string | null
  description: string | null
  logo_url: string | null
  cover_url: string | null
  status: string
  created_at: string
}

export interface ListShopsResponse {
  shops: ShopListItem[]
}

export interface ShopDetail {
  id: string
  name: string
  slug: string
  industry: string | null
  products: unknown
  [key: string]: unknown
}

export interface ShopAsset {
  id: string
  type: string | null
  name: string | null
  storage_path_or_url: string | null
  mime_type: string | null
  model_source: string | null
  created_at: string
}

export const shopsApi = {
  list: (token: string) =>
    apiFetch<ListShopsResponse>(SHOPS_PREFIX, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }),

  get: (token: string, shopId: string) =>
    apiFetch<ShopDetail>(`${SHOPS_PREFIX}/${shopId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }),

  listAssets: (token: string, shopId: string) =>
    apiFetch<{ assets: ShopAsset[] }>(`${SHOPS_PREFIX}/${shopId}/assets`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }),
}
