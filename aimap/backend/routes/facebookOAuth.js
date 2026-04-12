/**
 * FACEBOOK OAUTH CALLBACK — KHÔNG CẦN JWT (Meta redirect).
 * Path: GET /api/facebook/oauth/callback
 */
import { Router } from 'express'
import pool from '../db/index.js'
import { verifyToken } from '../middleware/auth.js'
import { logActivity } from '../services/activityLog.js'
import { exchangeCodeForUserAccessToken, exchangeLongLivedUserToken, saveFacebookPagesForShop } from '../services/facebookOAuthService.js'

const router = Router()

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
const REDIRECT_URI = (process.env.FACEBOOK_OAUTH_REDIRECT_URI || '').trim()

function redirectBack(res, shopId, query) {
  const q = new URLSearchParams(query).toString()
  const path = `/shops/${encodeURIComponent(shopId)}/marketing/facebook`
  res.redirect(`${FRONTEND_URL}${path}${q ? `?${q}` : ''}`)
}

async function assertShopOwner(client, shopId, profileId) {
  const r = await client.query('SELECT id FROM shops WHERE id = $1 AND user_id = $2', [shopId, profileId])
  return r.rows.length > 0
}

router.get('/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query

  if (error) {
    console.warn('[facebook oauth] error from Meta:', error, req.query.error_reason)
    try {
      const decoded = typeof state === 'string' ? verifyToken(state) : null
      if (decoded?.shopId) {
        return redirectBack(res, String(decoded.shopId), { fb_error: 'access_denied' })
      }
    } catch {
      /* ignore */
    }
    return res.redirect(`${FRONTEND_URL}/shops?fb_error=access_denied`)
  }

  if (!code || typeof state !== 'string') {
    if (typeof state === 'string') {
      const decoded = verifyToken(state)
      if (decoded?.shopId) {
        return redirectBack(res, String(decoded.shopId), { fb_error: 'missing_params' })
      }
    }
    return res.redirect(`${FRONTEND_URL}/shops?fb_error=missing_params`)
  }

  if (!REDIRECT_URI) {
    console.error('[facebook oauth] FACEBOOK_OAUTH_REDIRECT_URI chưa set')
    const dec = verifyToken(state)
    if (dec?.shopId) return redirectBack(res, String(dec.shopId), { fb_error: 'not_configured' })
    return res.redirect(`${FRONTEND_URL}/shops?fb_error=not_configured`)
  }

  const decoded = verifyToken(state)
  if (!decoded || decoded.purpose !== 'fb_oauth' || !decoded.shopId || !decoded.profileId) {
    const dec = verifyToken(state)
    if (dec?.shopId) return redirectBack(res, String(dec.shopId), { fb_error: 'bad_state' })
    return res.redirect(`${FRONTEND_URL}/shops?fb_error=bad_state`)
  }

  const profileId = decoded.profileId
  const shopId = String(decoded.shopId)

  const client = await pool.connect()
  try {
    const ok = await assertShopOwner(client, shopId, profileId)
    if (!ok) {
      return redirectBack(res, shopId, { fb_error: 'forbidden' })
    }

    let shortToken
    try {
      shortToken = await exchangeCodeForUserAccessToken(String(code), REDIRECT_URI)
    } catch (e) {
      console.error('[facebook oauth] exchange code:', e.message)
      return redirectBack(res, shopId, { fb_error: 'token_exchange', msg: e.message?.slice(0, 120) })
    }

    let userToken = shortToken
    try {
      userToken = await exchangeLongLivedUserToken(shortToken)
    } catch (e) {
      console.warn('[facebook oauth] long-lived fallback short token:', e.message)
      userToken = shortToken
    }

    let saved = 0
    try {
      saved = await saveFacebookPagesForShop(client, shopId, profileId, userToken)
    } catch (e) {
      console.error('[facebook oauth] me/accounts:', e.message)
      return redirectBack(res, shopId, { fb_error: 'accounts', msg: e.message?.slice(0, 120) })
    }

    await logActivity(pool, {
      userId: profileId,
      action: 'facebook_oauth_connect',
      entityType: 'shop',
      entityId: shopId,
      details: { pages: saved },
    })

    return redirectBack(res, shopId, { fb: 'connected', pages: String(saved) })
  } catch (err) {
    console.error('[facebook oauth] callback:', err)
    return redirectBack(res, shopId, { fb_error: 'internal' })
  } finally {
    client.release()
  }
})

export default router
