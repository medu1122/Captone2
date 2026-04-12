/**
 * FACEBOOK ENV — Ưu tiên FACEBOOK_*; fallback FB_*, META_* (cũ).
 */

export function getFacebookAppId() {
  return (process.env.FACEBOOK_APP_ID || process.env.FB_APP_ID || process.env.META_APP_ID || '').trim()
}

export function getFacebookAppSecret() {
  return (process.env.FACEBOOK_APP_SECRET || process.env.FB_APP_SECRET || '').trim()
}

/** Scope mặc định đồ án; override bằng FACEBOOK_OAUTH_SCOPES. Thiếu read_insights → insights Graph có thể 403. */
const DEFAULT_OAUTH_SCOPES =
  'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts'

export function getFacebookOAuthScopes() {
  return (process.env.FACEBOOK_OAUTH_SCOPES || process.env.FB_OAUTH_SCOPES || DEFAULT_OAUTH_SCOPES).replace(/\s/g, '')
}
