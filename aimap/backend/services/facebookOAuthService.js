/**
 * FACEBOOK LOGIN — ĐỔI CODE LẤY USER TOKEN, LONG-LIVED, /me/accounts.
 * Tài liệu: https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
 */
import { graphGet, mapFacebookError } from './facebookGraphService.js'

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || 'v20.0'

function getAppCredentials() {
  const clientId = (process.env.FB_APP_ID || process.env.META_APP_ID || '').trim()
  const clientSecret = (process.env.FB_APP_SECRET || '').trim()
  return { clientId, clientSecret }
}

/** Bước 2–3: code → short-lived user access_token */
export async function exchangeCodeForUserAccessToken(code, redirectUri) {
  const { clientId, clientSecret } = getAppCredentials()
  if (!clientId || !clientSecret) {
    const e = new Error('Chưa cấu hình FB_APP_ID / FB_APP_SECRET')
    e.code = 'OAUTH_NOT_CONFIGURED'
    throw e
  }
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('client_secret', clientSecret)
  url.searchParams.set('code', code)
  const res = await fetch(url.toString())
  const data = await res.json()
  if (data.error) throw mapFacebookError(data.error)
  if (!data.access_token) throw new Error('Graph không trả access_token')
  return data.access_token
}

/** Long-lived user token (~60 ngày) */
export async function exchangeLongLivedUserToken(shortLivedToken) {
  const { clientId, clientSecret } = getAppCredentials()
  if (!clientId || !clientSecret) {
    const e = new Error('Chưa cấu hình FB_APP_ID / FB_APP_SECRET')
    e.code = 'OAUTH_NOT_CONFIGURED'
    throw e
  }
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`)
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('client_secret', clientSecret)
  url.searchParams.set('fb_exchange_token', shortLivedToken)
  const res = await fetch(url.toString())
  const data = await res.json()
  if (data.error) throw mapFacebookError(data.error)
  if (!data.access_token) throw new Error('Graph không trả long-lived token')
  return data.access_token
}

/** Lấy toàn bộ Page user quản lý (phân trang) */
export async function fetchAllManagedPages(userAccessToken) {
  const fields = 'name,id,access_token,tasks'
  const out = []
  let url = `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(userAccessToken)}`
  for (;;) {
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) throw mapFacebookError(data.error)
    for (const row of data.data || []) {
      out.push(row)
    }
    if (data.paging?.next) {
      url = data.paging.next
    } else {
      break
    }
  }
  return out
}

/** Chi tiết Page để lưu DB (fan_count, ảnh, category) — dùng page access_token */
export async function fetchPageProfileForStorage(pageId, pageAccessToken) {
  const data = await graphGet(`/${String(pageId).trim()}`, String(pageAccessToken).trim(), {
    fields: 'name,fan_count,picture{url},category',
  })
  return {
    name: data.name || null,
    fan: data.fan_count ?? null,
    pic: data.picture?.data?.url || data.picture?.url || null,
    cat: typeof data.category === 'string' ? data.category : data.category?.name || null,
  }
}

/** userAccessToken = user token (đã long-lived nếu caller đổi xong) → /me/accounts → upsert facebook_page_tokens. */
export async function saveFacebookPagesForShop(client, shopId, profileId, userAccessToken) {
  const userToken = String(userAccessToken || '').trim()
  if (!userToken) throw new Error('Thiếu user access token')

  const accounts = await fetchAllManagedPages(userToken)
  let saved = 0
  for (const acc of accounts) {
    const pageId = acc.id ? String(acc.id).trim() : ''
    const pageTok = acc.access_token ? String(acc.access_token).trim() : ''
    if (!pageId || !pageTok) continue

    let name = acc.name || null
    let fan = null
    let pic = null
    let cat = null
    try {
      const prof = await fetchPageProfileForStorage(pageId, pageTok)
      name = prof.name || name
      fan = prof.fan
      pic = prof.pic
      cat = prof.cat
    } catch (e) {
      console.warn('[facebook] page profile', pageId, e.message)
    }

    await client.query(
      `INSERT INTO facebook_page_tokens (user_id, shop_id, page_id, page_name, access_token, expires_at, followers_count, picture_url, page_category, updated_at)
       VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $8, NOW())
       ON CONFLICT (user_id, shop_id, page_id) DO UPDATE SET
         page_name = EXCLUDED.page_name,
         access_token = EXCLUDED.access_token,
         expires_at = EXCLUDED.expires_at,
         followers_count = EXCLUDED.followers_count,
         picture_url = EXCLUDED.picture_url,
         page_category = EXCLUDED.page_category,
         updated_at = NOW()`,
      [profileId, shopId, pageId, name, pageTok, fan, pic, cat]
    )
    saved += 1
  }
  return saved
}
