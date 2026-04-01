/**
 * GỌI META GRAPH API TỪ BACKEND (PAGE ACCESS TOKEN).
 * Không gọi từ frontend.
 */
const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || 'v20.0'
const BASE = `https://graph.facebook.com/${GRAPH_VERSION}`

function buildError(code, message, raw) {
  const e = new Error(message)
  e.code = code
  e.raw = raw
  return e
}

export function mapFacebookError(err) {
  if (!err || typeof err !== 'object') return buildError('FB_UNKNOWN', 'Facebook API error', err)
  const code = err.code
  const sub = err.error_subcode
  const msg = err.message || 'Facebook API error'
  if (code === 190 || /OAuthException|token/i.test(msg)) return buildError('FB_TOKEN_EXPIRED', msg, err)
  if (code === 4 || code === 17 || code === 32) return buildError('FB_RATE_LIMIT', msg, err)
  if (code === 10 || code === 200 || /permission/i.test(msg)) return buildError('FB_PERMISSION_MISSING', msg, err)
  return buildError('FB_GRAPH_ERROR', msg, err)
}

export async function graphGet(path, accessToken, params = {}) {
  const url = new URL(`${BASE}${path.startsWith('/') ? path : `/${path}`}`)
  url.searchParams.set('access_token', accessToken)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  }
  const res = await fetch(url.toString(), { method: 'GET' })
  const data = await res.json()
  if (data.error) throw mapFacebookError(data.error)
  return data
}

export async function graphDelete(path, accessToken) {
  const url = new URL(`${BASE}${path.startsWith('/') ? path : `/${path}`}`)
  url.searchParams.set('access_token', accessToken)
  const res = await fetch(url.toString(), { method: 'DELETE' })
  const data = await res.json()
  if (data.error) throw mapFacebookError(data.error)
  return data
}

/** Update Page post message — POST /{post-id} với form body message */
export async function graphPostForm(path, accessToken, bodyParams) {
  const url = new URL(`${BASE}${path.startsWith('/') ? path : `/${path}`}`)
  url.searchParams.set('access_token', accessToken)
  for (const [k, v] of Object.entries(bodyParams)) {
    url.searchParams.set(k, String(v))
  }
  const res = await fetch(url.toString(), { method: 'POST' })
  const data = await res.json()
  if (data.error) throw mapFacebookError(data.error)
  return data
}

export { GRAPH_VERSION, BASE }
