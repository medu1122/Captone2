/**
 * FACEBOOK MARKETING — /api/shops/:id/facebook/...
 * Page token lưu ở facebook_page_tokens; Graph chỉ gọi từ backend.
 */
import { Router } from 'express'
import crypto from 'crypto'
import pool from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { graphGet, graphDelete, graphPostForm } from '../services/facebookGraphService.js'
import {
  aiSummarizeComments,
  aiEvaluatePost,
  aiPageActions,
  aiWriteAssist,
} from '../services/marketingAiBot.js'
import { logActivity } from '../services/activityLog.js'

const router = Router()
const META_APP_ID = process.env.META_APP_ID || ''

async function assertShopOwner(client, shopId, profileId) {
  const r = await client.query('SELECT id, name, industry FROM shops WHERE id = $1 AND user_id = $2', [
    shopId,
    profileId,
  ])
  if (r.rows.length === 0) {
    const any = await client.query('SELECT id FROM shops WHERE id = $1', [shopId])
    if (any.rows.length === 0) return { err: 404, body: { code: 'SHOP_NOT_FOUND', message: 'Shop not found' } }
    return { err: 403, body: { code: 'FORBIDDEN', message: 'Access denied' } }
  }
  return { shop: r.rows[0] }
}

async function getPageTokenRow(client, shopId, profileId, pageId) {
  const r = await client.query(
    `SELECT id, page_id, page_name, access_token, expires_at, picture_url, followers_count, page_category, tasks_json
     FROM facebook_page_tokens
     WHERE shop_id = $1 AND user_id = $2 AND page_id = $3`,
    [shopId, profileId, pageId]
  )
  return r.rows[0] || null
}

/** Chọn page token phù hợp với post id dạng PAGEID_POSTID hoặc fallback 1 page */
async function resolveAccessTokenForPost(client, shopId, profileId, postId) {
  const row = await client.query(
    `SELECT access_token, page_id FROM facebook_page_tokens WHERE shop_id = $1 AND user_id = $2`,
    [shopId, profileId]
  )
  const pid = String(postId)
  let tok = null
  if (pid.includes('_')) {
    const pref = pid.split('_')[0]
    tok = row.rows.find((t) => t.page_id === pref)
  }
  if (!tok && row.rows.length === 1) tok = row.rows[0]
  if (!tok && row.rows.length > 0) tok = row.rows[0]
  return tok?.access_token || null
}

function hashInput(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex')
}

async function getAiCache(client, shopId, kind, inputObj) {
  const inputHash = hashInput(inputObj)
  const r = await client.query(
    `SELECT payload_json FROM marketing_ai_cache
     WHERE shop_id = $1 AND kind = $2 AND input_hash = $3 AND expires_at > NOW()`,
    [shopId, kind, inputHash]
  )
  return r.rows[0]?.payload_json || null
}

async function setAiCache(client, shopId, kind, inputObj, payload, pageId = null, postId = null, ttlHours = 24) {
  const inputHash = hashInput(inputObj)
  await client.query(`DELETE FROM marketing_ai_cache WHERE shop_id = $1 AND kind = $2 AND input_hash = $3`, [
    shopId,
    kind,
    inputHash,
  ])
  await client.query(
    `INSERT INTO marketing_ai_cache (shop_id, page_id, post_id, kind, input_hash, payload_json, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW() + ($7::text || ' hours')::interval)`,
    [shopId, pageId, postId, kind, inputHash, JSON.stringify(payload), String(ttlHours)]
  )
}

function engagementRate(reach, r, c, s) {
  const rr = Number(reach) || 0
  if (rr <= 0) return '0%'
  const e = (Number(r) || 0) + (Number(c) || 0) + (Number(s) || 0)
  return `${((e / rr) * 100).toFixed(1)}%`
}

// — GET .../facebook/pages
router.get('/:id/facebook/pages', requireAuth, async (req, res) => {
  const { id: shopId } = req.params
  const profileId = req.auth.profileId
  const sync = req.query.sync === 'true'
  const client = await pool.connect()
  try {
    const own = await assertShopOwner(client, shopId, profileId)
    if (own.err) return res.status(own.err).json(own.body)

    const rows = await client.query(
      `SELECT page_id, page_name, followers_count, page_category, picture_url, updated_at
       FROM facebook_page_tokens WHERE shop_id = $1 ORDER BY updated_at DESC`,
      [shopId]
    )

    if (sync && rows.rows.length > 0) {
      for (const row of rows.rows) {
        const tok = await getPageTokenRow(client, shopId, profileId, row.page_id)
        if (!tok?.access_token) continue
        try {
          const data = await graphGet(`/${row.page_id}`, tok.access_token, {
            fields: 'name,fan_count,picture{url},category',
          })
          await client.query(
            `UPDATE facebook_page_tokens SET page_name = COALESCE($2, page_name), followers_count = $3,
             picture_url = $4, page_category = $5, updated_at = NOW()
             WHERE shop_id = $1 AND page_id = $6`,
            [
              shopId,
              data.name,
              data.fan_count ?? null,
              data.picture?.data?.url || data.picture?.url || null,
              typeof data.category === 'string' ? data.category : data.category?.name || null,
              row.page_id,
            ]
          )
        } catch (e) {
          console.warn('[facebook] sync page', row.page_id, e.message)
        }
      }
      const again = await client.query(
        `SELECT page_id, page_name, followers_count, page_category, picture_url, updated_at
         FROM facebook_page_tokens WHERE shop_id = $1 ORDER BY updated_at DESC`,
        [shopId]
      )
      return res.json({
        pages: again.rows.map((p) => ({
          pageId: p.page_id,
          name: p.page_name,
          followers: p.followers_count ?? 0,
          category: p.page_category,
          pictureUrl: p.picture_url,
          updatedAt: p.updated_at,
        })),
      })
    }

    res.json({
      pages: rows.rows.map((p) => ({
        pageId: p.page_id,
        name: p.page_name,
        followers: p.followers_count ?? 0,
        category: p.page_category,
        pictureUrl: p.picture_url,
        updatedAt: p.updated_at,
      })),
    })
  } catch (err) {
    console.error('GET facebook/pages:', err)
    res.status(500).json({ code: 'INTERNAL', message: 'Failed to list pages' })
  } finally {
    client.release()
  }
})

/**
 * POST .../facebook/pages/connect — lưu Page access token (OAuth flow sẽ gọi sau; hiện dùng để test / nhập từ Meta).
 * Body: { pageId, pageName?, accessToken, expiresAt? ISO }
 */
router.post('/:id/facebook/pages/connect', requireAuth, async (req, res) => {
  const { id: shopId } = req.params
  const profileId = req.auth.profileId
  const { pageId, pageName, accessToken, expiresAt } = req.body || {}
  if (!pageId || String(pageId).trim() === '' || !accessToken || String(accessToken).trim() === '') {
    return res.status(400).json({ code: 'VALIDATION', message: 'pageId và accessToken là bắt buộc' })
  }
  const client = await pool.connect()
  try {
    const own = await assertShopOwner(client, shopId, profileId)
    if (own.err) return res.status(own.err).json(own.body)

    let fan = null
    let pic = null
    let cat = null
    let name = pageName || null
    try {
      const data = await graphGet(`/${String(pageId).trim()}`, String(accessToken).trim(), {
        fields: 'name,fan_count,picture{url},category',
      })
      name = data.name || name
      fan = data.fan_count ?? null
      pic = data.picture?.data?.url || data.picture?.url || null
      cat = typeof data.category === 'string' ? data.category : data.category?.name || null
    } catch (e) {
      console.warn('[facebook] connect verify Graph:', e.code || e.message)
      return res.status(400).json({
        code: e.code || 'FB_GRAPH_ERROR',
        message: e.message || 'Token không hợp lệ hoặc không truy cập được Page',
      })
    }

    await client.query(
      `INSERT INTO facebook_page_tokens (user_id, shop_id, page_id, page_name, access_token, expires_at, followers_count, picture_url, page_category, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (user_id, shop_id, page_id) DO UPDATE SET
         page_name = EXCLUDED.page_name,
         access_token = EXCLUDED.access_token,
         expires_at = EXCLUDED.expires_at,
         followers_count = EXCLUDED.followers_count,
         picture_url = EXCLUDED.picture_url,
         page_category = EXCLUDED.page_category,
         updated_at = NOW()`,
      [
        profileId,
        shopId,
        String(pageId).trim(),
        name,
        String(accessToken).trim(),
        expiresAt ? new Date(expiresAt) : null,
        fan,
        pic,
        cat,
      ]
    )

    await logActivity(pool, {
      userId: profileId,
      action: 'facebook_page_connect',
      entityType: 'shop',
      entityId: shopId,
      details: { pageId: String(pageId).trim() },
    })

    res.status(201).json({ ok: true, pageId: String(pageId).trim(), name })
  } catch (err) {
    console.error('POST facebook/pages/connect:', err)
    res.status(500).json({ code: 'INTERNAL', message: err.message })
  } finally {
    client.release()
  }
})

// — GET .../facebook/pages/:pageId/detail
router.get('/:id/facebook/pages/:pageId/detail', requireAuth, async (req, res) => {
  const { id: shopId, pageId } = req.params
  const profileId = req.auth.profileId
  const range = req.query.range === '7d' ? '7d' : '30d'
  const client = await pool.connect()
  try {
    const own = await assertShopOwner(client, shopId, profileId)
    if (own.err) return res.status(own.err).json(own.body)

    const tok = await getPageTokenRow(client, shopId, profileId, pageId)
    if (!tok) return res.status(404).json({ code: 'PAGE_NOT_FOUND', message: 'Chưa kết nối Page này' })

    let isPartial = false
    let kpis = {
      reach: 0,
      engagementRate: '0%',
      avgReactionsPerPost: 0,
      avgCommentsPerPost: 0,
      followersDelta: 0,
    }
    let trendBars = [40, 45, 42, 48, 50, 52, 48]
    let engagementMix = [
      { label: 'reactions', percent: 56 },
      { label: 'comments', percent: 27 },
      { label: 'shares', percent: 17 },
    ]
    let bestTimes = []
    let topPosts = []
    let insightsSyncedAt = new Date().toISOString()

    try {
      const preset = range === '7d' ? 'last_7d' : 'last_30d'
      const ins = await graphGet(`/${pageId}/insights`, tok.access_token, {
        metric: 'page_impressions,page_post_engagements',
        period: 'day',
        date_preset: preset,
      })
      const data = ins.data || []
      let impSum = 0
      let engSum = 0
      const bars = []
      for (const m of data) {
        if (m.name === 'page_impressions' && m.values?.length) {
          for (const v of m.values) {
            impSum += Number(v.value) || 0
            bars.push(Number(v.value) || 0)
          }
        }
        if (m.name === 'page_post_engagements' && m.values?.length) {
          for (const v of m.values) engSum += Number(v.value) || 0
        }
      }
      if (bars.length) {
        const mx = Math.max(...bars, 1)
        trendBars = bars.slice(-7).map((v) => Math.round((v / mx) * 100))
      }
      kpis.reach = Math.round(impSum)
      const er = kpis.reach > 0 ? ((engSum / kpis.reach) * 100).toFixed(1) : '0'
      kpis.engagementRate = `${er}%`
      insightsSyncedAt = new Date().toISOString()
    } catch (e) {
      console.warn('[facebook] page insights:', e.code, e.message)
      isPartial = true
      if (e.code === 'FB_PERMISSION_MISSING' || e.code === 'FB_TOKEN_EXPIRED') {
        return res.status(e.code === 'FB_TOKEN_EXPIRED' ? 401 : 403).json({ code: e.code, message: e.message })
      }
    }

    const kpiForAi = { range, kpis, pageName: tok.page_name }
    let aiActions = []
    const cached = await getAiCache(client, shopId, 'page_detail_actions', kpiForAi)
    if (cached?.actions) {
      aiActions = cached.actions
    } else {
      const ai = await aiPageActions(kpiForAi)
      aiActions = ai.actions || []
      if (ai.actions?.length) await setAiCache(client, shopId, 'page_detail_actions', kpiForAi, { actions: ai.actions }, pageId, null, 24)
    }

    res.json({
      pageId,
      range: range === '7d' ? '7d' : '30d',
      kpis,
      trendBars,
      engagementMix,
      bestTimes,
      topPosts,
      aiActions: aiActions.map((a) => ({ action: a.action, expectedImpact: a.expectedImpact || '' })),
      sources: { insightsSyncedAt, isPartial },
    })
  } catch (err) {
    console.error('GET facebook page detail:', err)
    res.status(500).json({ code: 'INTERNAL', message: err.message })
  } finally {
    client.release()
  }
})

// — GET .../facebook/pages/:pageId/posts
router.get('/:id/facebook/pages/:pageId/posts', requireAuth, async (req, res) => {
  const { id: shopId, pageId } = req.params
  const profileId = req.auth.profileId
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '25', 10)))
  const client = await pool.connect()
  try {
    const own = await assertShopOwner(client, shopId, profileId)
    if (own.err) return res.status(own.err).json(own.body)

    const tok = await getPageTokenRow(client, shopId, profileId, pageId)
    if (!tok) return res.status(404).json({ code: 'PAGE_NOT_FOUND', message: 'Chưa kết nối Page' })

    const fields = [
      'id',
      'message',
      'created_time',
      'permalink_url',
      'shares',
      'reactions.summary(true)',
      'comments.summary(true)',
      'from',
      'application',
    ].join(',')

    let feed
    try {
      feed = await graphGet(`/${pageId}/feed`, tok.access_token, { fields, limit })
    } catch (e) {
      if (e.code === 'FB_TOKEN_EXPIRED') return res.status(401).json({ code: e.code, message: e.message })
      if (e.code === 'FB_PERMISSION_MISSING') return res.status(403).json({ code: e.code, message: e.message })
      throw e
    }

    const posts = (feed.data || []).map((p) => {
      const reactions = p.reactions?.summary?.total_count ?? p.reactions?.total_count ?? 0
      const comments = p.comments?.summary?.total_count ?? p.comments?.total_count ?? 0
      const shares = p.shares?.count ?? p.shares ?? 0
      const reach = 0
      const er = engagementRate(reach, reactions, comments, shares)
      const title = (p.message || '').split('\n')[0].slice(0, 80) || '(Không tiêu đề)'
      const appId = p.application?.id
      const canEdit = META_APP_ID && appId && String(appId) === String(META_APP_ID)
      return {
        postId: p.id,
        title,
        messagePreview: (p.message || '').slice(0, 160),
        createdTime: p.created_time,
        timeLabel: p.created_time || '',
        reach,
        engagementRate: er,
        reactions,
        comments,
        shares,
        canEditViaApi: !!canEdit,
        canDeleteViaApi: true,
        permalinkUrl: p.permalink_url || `https://www.facebook.com/${p.id}`,
      }
    })

    res.json({ posts, paging: feed.paging || { nextCursor: null } })
  } catch (err) {
    console.error('GET facebook posts:', err)
    res.status(500).json({ code: 'INTERNAL', message: err.message })
  } finally {
    client.release()
  }
})

// — GET .../facebook/posts/:postId/detail
router.get('/:id/facebook/posts/:postId/detail', requireAuth, async (req, res) => {
  const { id: shopId, postId } = req.params
  const profileId = req.auth.profileId
  const client = await pool.connect()
  try {
    const own = await assertShopOwner(client, shopId, profileId)
    if (own.err) return res.status(own.err).json(own.body)

    const row = await client.query(
      `SELECT t.access_token, t.page_id
       FROM facebook_page_tokens t
       WHERE t.shop_id = $1 AND t.user_id = $2`,
      [shopId, profileId]
    )
    const pid = String(postId)
    let tokenRow = null
    if (pid.includes('_')) {
      const pref = pid.split('_')[0]
      tokenRow = row.rows.find((r) => r.page_id === pref)
    }
    if (!tokenRow && row.rows.length === 1) tokenRow = row.rows[0]
    if (!tokenRow && row.rows.length > 0) tokenRow = row.rows[0]
    if (!tokenRow) return res.status(404).json({ code: 'PAGE_NOT_FOUND', message: 'Không tìm thấy token Page cho bài này' })

    const { access_token: accessToken, page_id: pageId } = tokenRow

    const fields = 'id,message,created_time,permalink_url,application,from'
    let post
    try {
      post = await graphGet(`/${postId}`, accessToken, { fields })
    } catch (e) {
      if (e.code === 'FB_TOKEN_EXPIRED') return res.status(401).json({ code: e.code, message: e.message })
      return res.status(404).json({ code: 'POST_NOT_FOUND', message: e.message })
    }

    let reach = 0
    let engaged = 0
    let isPartial = false
    let sparkline = []
    try {
      const ins = await graphGet(`/${postId}/insights`, accessToken, {
        metric: 'post_impressions,post_engaged_users',
      })
      for (const m of ins.data || []) {
        if (m.name === 'post_impressions') {
          reach = Number(m.values?.[0]?.value) || 0
        }
        if (m.name === 'post_engaged_users') {
          engaged = Number(m.values?.[0]?.value) || 0
        }
      }
    } catch {
      isPartial = true
    }

    try {
      const snap = await client.query(
        `SELECT snapshot_date, value FROM facebook_post_insight_snapshots
         WHERE shop_id = $1 AND post_id = $2 AND metric_key = $3 ORDER BY snapshot_date ASC LIMIT 14`,
        [shopId, postId, 'post_impressions']
      )
      if (snap.rows.length) {
        const vals = snap.rows.map((r) => Number(r.value) || 0)
        const mx = Math.max(...vals, 1)
        sparkline = vals.map((v) => Math.round((v / mx) * 100))
      }
    } catch {
      /* optional */
    }

    const engagementRateStr = reach > 0 ? `${((engaged / reach) * 100).toFixed(1)}%` : '0%'

    let commentsSample = []
    try {
      const cm = await graphGet(`/${postId}/comments`, accessToken, {
        limit: 40,
        order: 'reverse_chronological',
        fields: 'from,message,created_time',
      })
      commentsSample = cm.data || []
    } catch {
      isPartial = true
    }

    const commentsText = commentsSample
      .map((c) => `${c.from?.name || 'User'}: ${c.message || ''}`)
      .join('\n')
      .slice(0, 12000)

    const cacheKey = { postId, comments: hashInput(commentsText) }
    let commentAi = await getAiCache(client, shopId, 'post_comment_summary', cacheKey)
    if (!commentAi || !commentAi.summary) {
      commentAi = await aiSummarizeComments(commentsText)
      await setAiCache(client, shopId, 'post_comment_summary', cacheKey, commentAi, pageId, postId, 12)
    }

    const evalKey = { postId, msg: hashInput(post.message || '') }
    let botEvaluation = await getAiCache(client, shopId, 'post_bot_review', evalKey)
    if (!botEvaluation || typeof botEvaluation.score !== 'number') {
      botEvaluation = await aiEvaluatePost(post.message || '')
      await setAiCache(client, shopId, 'post_bot_review', evalKey, botEvaluation, pageId, postId, 24)
    }

    const appId = post.application?.id
    const canEdit = META_APP_ID && appId && String(appId) === String(META_APP_ID)

    res.json({
      postId: post.id,
      pageId,
      message: post.message || '',
      permalinkUrl: post.permalink_url || '',
      createdTime: post.created_time,
      insights: {
        reach,
        engaged,
        engagementRate: engagementRateStr,
      },
      sparkline: sparkline.length ? sparkline : [40, 42, 45, 44, 48, 50, 48],
      commentAi: {
        summary: commentAi.summary || '',
        topics: commentAi.topics || [],
        sentiment: commentAi.sentiment || 'neutral',
      },
      botEvaluation: {
        score: botEvaluation.score ?? 0,
        bullets: botEvaluation.bullets || [],
      },
      capabilities: {
        canEditViaApi: !!canEdit,
        canDeleteViaApi: true,
        reasons: canEdit ? [] : ['POST_NOT_FROM_THIS_APP'],
      },
      cachedAt: new Date().toISOString(),
      isPartial,
    })
  } catch (err) {
    console.error('GET post detail:', err)
    res.status(500).json({ code: 'INTERNAL', message: err.message })
  } finally {
    client.release()
  }
})

router.patch('/:id/facebook/posts/:postId', requireAuth, async (req, res) => {
  const { id: shopId, postId } = req.params
  const profileId = req.auth.profileId
  const message = req.body?.message
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ code: 'VALIDATION', message: 'message là bắt buộc' })
  }
  const client = await pool.connect()
  try {
    const own = await assertShopOwner(client, shopId, profileId)
    if (own.err) return res.status(own.err).json(own.body)

    const accessToken = await resolveAccessTokenForPost(client, shopId, profileId, postId)
    if (!accessToken) return res.status(404).json({ code: 'PAGE_NOT_FOUND', message: 'Chưa kết nối Page' })

    let post
    try {
      post = await graphGet(`/${postId}`, accessToken, { fields: 'application' })
    } catch (e) {
      return res.status(400).json({ code: e.code || 'FB_GRAPH_ERROR', message: e.message })
    }
    const appId = post.application?.id
    if (!META_APP_ID || !appId || String(appId) !== String(META_APP_ID)) {
      return res.status(409).json({ code: 'POST_NOT_EDITABLE_APP_ONLY', message: 'Chỉ sửa được bài do app đăng' })
    }

    await graphPostForm(`/${postId}`, accessToken, { message })
    await logActivity(pool, {
      userId: profileId,
      action: 'facebook_post_update',
      entityType: 'shop',
      entityId: shopId,
      details: { postId },
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('PATCH post:', err)
    const code = err.code || 'INTERNAL'
    const status = code === 'FB_PERMISSION_MISSING' ? 403 : code === 'FB_TOKEN_EXPIRED' ? 401 : 500
    res.status(status).json({ code, message: err.message })
  } finally {
    client.release()
  }
})

router.delete('/:id/facebook/posts/:postId', requireAuth, async (req, res) => {
  const { id: shopId, postId } = req.params
  const profileId = req.auth.profileId
  const client = await pool.connect()
  try {
    const own = await assertShopOwner(client, shopId, profileId)
    if (own.err) return res.status(own.err).json(own.body)

    const accessToken = await resolveAccessTokenForPost(client, shopId, profileId, postId)
    if (!accessToken) return res.status(404).json({ code: 'PAGE_NOT_FOUND', message: 'Chưa kết nối Page' })

    await graphDelete(`/${postId}`, accessToken)
    await logActivity(pool, {
      userId: profileId,
      action: 'facebook_post_delete',
      entityType: 'shop',
      entityId: shopId,
      details: { postId },
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE post:', err)
    res.status(500).json({ code: err.code || 'INTERNAL', message: err.message })
  } finally {
    client.release()
  }
})

router.post('/:id/facebook/assist', requireAuth, async (req, res) => {
  const { id: shopId } = req.params
  const profileId = req.auth.profileId
  const { draftMessage = '', instruction = '', locale = 'vi' } = req.body || {}
  const client = await pool.connect()
  try {
    const own = await assertShopOwner(client, shopId, profileId)
    if (own.err) return res.status(own.err).json(own.body)

    const out = await aiWriteAssist(String(draftMessage), String(instruction || 'Viết rõ, có CTA'), locale)
    res.json({ suggestedMessage: out.suggestedMessage, skipped: out.skipped, error: out.error })
  } catch (err) {
    console.error('POST assist:', err)
    res.status(500).json({ code: 'INTERNAL', message: err.message })
  } finally {
    client.release()
  }
})

export default router
