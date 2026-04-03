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
