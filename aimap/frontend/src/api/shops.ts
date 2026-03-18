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

export interface ImagePromptItem {
  id: string
  name: string
  type: string
  tags: unknown
  preview?: string
}

export interface IndustryTagItem {
  tag: string
  label: string
}

export interface IndustryTagsResponse {
  industry: string
  tags: string[]
  allTags: IndustryTagItem[]
}

export interface SiteDeployment {
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
}

export interface GenerateImagesBody {
  prompt_template_id?: string
  aspect?: string
  image_style?: string
  style?: string
  shop_only?: boolean
  product_indices?: number[]
  selectedProductKeys?: string[]
  user_prompt?: string
  model?: string
  variant_count?: number
}

export interface GenerateImagesResponse {
  image_urls: string[]
  image_data_urls: string[]
  model_source: string
  prompt_template_id: string
  final_prompt: string
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export const shopsApi = {
  list: (token: string) =>
    apiFetch<ListShopsResponse>(SHOPS_PREFIX, {
      method: 'GET',
      headers: auth(token),
    }),

  get: (token: string, shopId: string) =>
    apiFetch<ShopDetail>(`${SHOPS_PREFIX}/${shopId}`, {
      method: 'GET',
      headers: auth(token),
    }),

  listAssets: (token: string, shopId: string) =>
    apiFetch<{ assets: ShopAsset[] }>(`${SHOPS_PREFIX}/${shopId}/assets`, {
      method: 'GET',
      headers: auth(token),
    }),

  deleteAsset: (token: string, shopId: string, assetId: string) =>
    apiFetch<{ ok: boolean }>(`${SHOPS_PREFIX}/${shopId}/assets/${encodeURIComponent(assetId)}`, {
      method: 'DELETE',
      headers: auth(token),
    }),

  listImagePrompts: (token: string, shopId: string, useCase?: string) => {
    const q = useCase ? `?use_case=${encodeURIComponent(useCase)}` : ''
    return apiFetch<{ prompts: ImagePromptItem[] }>(`${SHOPS_PREFIX}/${shopId}/image-prompts${q}`, {
      method: 'GET',
      headers: auth(token),
    })
  },

  generateImages: (token: string, shopId: string, body: GenerateImagesBody) =>
    apiFetch<GenerateImagesResponse>(`${SHOPS_PREFIX}/${shopId}/images/generate`, {
      method: 'POST',
      headers: auth(token),
      body: body as unknown as Record<string, unknown>,
    }),

  saveImage: (
    token: string,
    shopId: string,
    body: {
      image_url?: string
      image_base64?: string
      prompt_template_id?: string | null
      user_prompt?: string
      model_source?: string
      type?: string
      name?: string
    }
  ) =>
    apiFetch<{ asset: ShopAsset }>(`${SHOPS_PREFIX}/${shopId}/images/save`, {
      method: 'POST',
      headers: auth(token),
      body: body as unknown as Record<string, unknown>,
    }),

  editImage: (
    token: string,
    shopId: string,
    body: {
      edit_prompt: string
      model?: string
      aspect?: string
      base_prompt?: string
    }
  ) =>
    apiFetch<{ image_urls: string[]; image_data_urls: string[]; model_source: string }>(
      `${SHOPS_PREFIX}/${shopId}/images/edit`,
      {
        method: 'POST',
        headers: auth(token),
        body: body as unknown as Record<string, unknown>,
      }
    ),

  rebuildImage: (
    token: string,
    shopId: string,
    body: Record<string, unknown>
  ) =>
    apiFetch<GenerateImagesResponse>(`${SHOPS_PREFIX}/${shopId}/images/rebuild`, {
      method: 'POST',
      headers: auth(token),
      body,
    }),

  updateProducts: (token: string, shopId: string, products: unknown[]) =>
    apiFetch<{ products: unknown }>(`${SHOPS_PREFIX}/${shopId}/products`, {
      method: 'PUT',
      headers: auth(token),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: products as any,
    }),

  getIndustryTags: (token: string, shopId: string) =>
    apiFetch<IndustryTagsResponse>(`${SHOPS_PREFIX}/${shopId}/industry-tags`, {
      method: 'GET',
      headers: auth(token),
    }),

  deployShop: (token: string, shopId: string) =>
    apiFetch<{ deployment: SiteDeployment }>(`${SHOPS_PREFIX}/${shopId}/deploy`, {
      method: 'POST',
      headers: auth(token),
    }),

  getShopContainer: (token: string, shopId: string) =>
    apiFetch<{ deployment: SiteDeployment | null }>(`${SHOPS_PREFIX}/${shopId}/container`, {
      method: 'GET',
      headers: auth(token),
    }),

  stopShopContainer: (token: string, shopId: string) =>
    apiFetch<{ ok: boolean }>(`${SHOPS_PREFIX}/${shopId}/container/stop`, {
      method: 'POST',
      headers: auth(token),
    }),

  deleteShopContainer: (token: string, shopId: string) =>
    apiFetch<{ ok: boolean }>(`${SHOPS_PREFIX}/${shopId}/container`, {
      method: 'DELETE',
      headers: auth(token),
    }),
}
