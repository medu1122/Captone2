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

export const shopsApi = {
  /** Danh sách shop mà user sở hữu – dùng cho ShopListPage */
  list: (token: string) =>
    apiFetch<ListShopsResponse>(SHOPS_PREFIX, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }),
}
