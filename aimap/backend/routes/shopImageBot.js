/**
 * Image bot + products PUT — mounted at /api/shops after main shops router.
 */
import { Router } from 'express'
import pool from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { logActivity } from '../services/activityLog.js'
import { buildImagePrompt } from '../services/imagePromptBuilder.js'
import { generateImageVariants } from '../services/imageGeneration.js'
import { saveShopAssetFile, fetchImageToBuffer, parseDataUrl } from '../services/assetStorage.js'
import { agentDbgFile } from '../utils/agentDbgFile.js'

const router = Router()

async function shopOwnedBy(client, shopId, profileId) {
  const r = await client.query('SELECT * FROM shops WHERE id = $1', [shopId])
  if (!r.rows.length) return { err: 404, msg: 'Shop not found' }
  if (r.rows[0].user_id !== profileId) return { err: 403, msg: 'Access denied' }
  return { shop: r.rows[0] }
}

function apiModel(bodyModel) {
  const m = String(bodyModel || '').toLowerCase()
  if (m === 'gemini' || m === 'google') return 'google'
  return 'openai'
}

function parseProductsJson(shop) {
  const p = shop.products
  if (Array.isArray(p)) return p
  if (p && typeof p === 'object') return Object.values(p)
  return []
}

router.get('/:id/image-prompts', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  const useCase = req.query.use_case
  const client = await pool.connect()
  try {
    const o = await shopOwnedBy(client, id, profileId)
    if (o.err) return res.status(o.err).json({ error: o.msg })
    const { shop } = o
    let tagList = []
    try {
      const map = await client.query(
        'SELECT tags FROM industry_tag_mappings WHERE TRIM(industry) = TRIM($1) LIMIT 1',
        [String(shop.industry || '')]
      )
      const tags = map.rows[0]?.tags
      if (Array.isArray(tags)) tagList = tags.map(String)
    } catch (_) {}
    let sql =
      'SELECT id, name, type, tags, LEFT(content, 240) AS preview FROM prompt_templates WHERE category = $1 AND is_active = true'
    const params = ['image']
    if (useCase) {
      params.push(String(useCase))
      sql += ` AND type = $${params.length}`
    }
    sql += ' ORDER BY sort_order NULLS LAST, name'
    let all
    try {
      all = await client.query(sql, params)
    } catch (e) {
      if (e.code === '42P01') return res.json({ prompts: [] })
      throw e
    }
    let rows = all.rows
    if (tagList.length) {
      const filtered = rows.filter((row) => {
        const arr = Array.isArray(row.tags) ? row.tags.map(String) : []
        return tagList.some((t) => arr.includes(t))
      })
      if (filtered.length) rows = filtered
    }
    res.json({
      prompts: rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        tags: row.tags,
        preview: row.preview,
      })),
    })
  } catch (err) {
    console.error('image-prompts error:', err)
    res.status(500).json({ error: 'Failed to list image prompts' })
  } finally {
    client.release()
  }
})

router.post('/:id/images/generate', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  const b = req.body || {}
  const aspect = b.aspect || '1:1'
  const imageStyle = b.image_style || b.style || 'ad'
  const shopOnly = Boolean(b.shop_only)
  const userPrompt = String(b.user_prompt || '')
  const model = apiModel(b.model)
  const variantCount = Math.min(5, Math.max(1, Number(b.variant_count) || 3))
  const client = await pool.connect()
  try {
    const o = await shopOwnedBy(client, id, profileId)
    if (o.err) return res.status(o.err).json({ error: o.msg })
    const { shop } = o
    let content = ''
    let templateId = b.prompt_template_id || null
    if (templateId) {
      const t = await client.query(
        "SELECT id, content FROM prompt_templates WHERE id = $1 AND category = 'image' AND is_active = true",
        [templateId]
      )
      if (!t.rows.length) return res.status(400).json({ error: 'Invalid prompt_template_id' })
      content = t.rows[0].content
    } else {
      const ip = await client.query(
        `SELECT id, content FROM prompt_templates WHERE category = 'image' AND is_active = true
         ORDER BY sort_order NULLS LAST, RANDOM() LIMIT 1`
      )
      if (!ip.rows.length) {
        return res.status(503).json({ error: 'No image prompt templates; run npm run seed:prompt-images' })
      }
      templateId = ip.rows[0].id
      content = ip.rows[0].content
    }
    const products = parseProductsJson(shop)
    let selected = products
    if (!shopOnly && Array.isArray(b.product_indices)) {
      selected = b.product_indices.map((i) => products[Number(i)]).filter(Boolean)
    } else if (!shopOnly && b.selectedProductKeys?.length) {
      selected = products.filter((p, i) =>
        b.selectedProductKeys.includes(String(p?.id ?? `${i}-${p?.name}`))
      )
    }
    const finalPrompt = buildImagePrompt({
      templateContent: content,
      shop,
      aspect,
      imageStyle,
      shopOnly,
      selectedProducts: selected,
      userPrompt,
    })
    const out = await generateImageVariants(finalPrompt, aspect, model, variantCount)
    // #region agent log
    fetch('http://127.0.0.1:7761/ingest/05cf90d4-996a-4cce-828d-8d12f370426f', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bb1f55' },
      body: JSON.stringify({
        sessionId: 'bb1f55',
        runId: 'pre-qa',
        hypothesisId: 'H1',
        location: 'shopImageBot.js:images/generate',
        message: 'generate variants ok',
        data: {
          urlCount: out.urls?.length ?? 0,
          dataUrlCount: out.dataUrls?.length ?? 0,
          model: String(out.modelSource || ''),
          variantCount,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    agentDbgFile({
      hypothesisId: 'H1',
      location: 'shopImageBot.js:images/generate:file',
      message: 'generate variants ok',
      data: {
        urlCount: out.urls?.length ?? 0,
        dataUrlCount: out.dataUrls?.length ?? 0,
        model: String(out.modelSource || ''),
      },
    })
    res.json({
      image_urls: out.urls,
      image_data_urls: out.dataUrls,
      model_source: out.modelSource,
      prompt_template_id: templateId,
      final_prompt: finalPrompt,
    })
  } catch (err) {
    console.error('images/generate error:', err)
    // #region agent log
    fetch('http://127.0.0.1:7761/ingest/05cf90d4-996a-4cce-828d-8d12f370426f', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bb1f55' },
      body: JSON.stringify({
        sessionId: 'bb1f55',
        runId: 'pre-qa',
        hypothesisId: 'H1',
        location: 'shopImageBot.js:images/generate:catch',
        message: 'generate failed',
        data: { err: String(err?.message || err).slice(0, 200) },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    agentDbgFile({
      hypothesisId: 'H1',
      location: 'shopImageBot.js:images/generate:catch',
      message: 'generate failed',
      data: { err: String(err?.message || err).slice(0, 200) },
    })
    res.status(502).json({ error: err.message || 'Image generation failed' })
  } finally {
    client.release()
  }
})

router.post('/:id/images/save', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  const b = req.body || {}
  const client = await pool.connect()
  try {
    const o = await shopOwnedBy(client, id, profileId)
    if (o.err) return res.status(o.err).json({ error: o.msg })
    let buffer
    let ext = 'png'
    let mime = 'image/png'
    if (b.image_base64) {
      const p = parseDataUrl(b.image_base64)
      if (!p) return res.status(400).json({ error: 'Invalid image_base64 data URL' })
      buffer = p.buffer
      ext = p.ext
      mime = p.mime
    } else if (b.image_url) {
      const f = await fetchImageToBuffer(String(b.image_url))
      buffer = f.buffer
      ext = f.ext
      mime = f.mime
    } else {
      return res.status(400).json({ error: 'image_url or image_base64 required' })
    }
    const ms = ['imagen', 'dall-e-3', 'flux'].includes(b.model_source) ? b.model_source : 'dall-e-3'
    const assetType = ['logo', 'banner', 'cover', 'post', 'product', 'other'].includes(b.type)
      ? b.type
      : 'post'
    const { publicUrl } = await saveShopAssetFile(buffer, id, ext)
    const ins = await client.query(
      `INSERT INTO assets (
         user_id, shop_id, type, name, storage_path_or_url, mime_type, model_source,
         prompt_template_id, user_prompt, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       RETURNING id, type, name, storage_path_or_url, mime_type, model_source, created_at`,
      [
        profileId,
        id,
        assetType,
        b.name || `generated-${Date.now()}`,
        publicUrl,
        mime,
        ms,
        b.prompt_template_id || null,
        b.user_prompt || null,
        JSON.stringify({ saved_from: 'image_bot' }),
      ]
    )
    try {
      await logActivity(pool, {
        userId: profileId,
        action: 'save_generated_image',
        entityType: 'asset',
        entityId: ins.rows[0].id,
        details: { shop_id: id, model_source: ms },
        severity: 'info',
        ipAddress: req.ip || req.headers['x-forwarded-for'],
      })
    } catch (e) {
      console.warn('activity log save_generated_image:', e.message)
    }
    // #region agent log
    fetch('http://127.0.0.1:7761/ingest/05cf90d4-996a-4cce-828d-8d12f370426f', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bb1f55' },
      body: JSON.stringify({
        sessionId: 'bb1f55',
        runId: 'pre-qa',
        hypothesisId: 'H3',
        location: 'shopImageBot.js:images/save',
        message: 'save ok',
        data: { assetId: String(ins.rows[0]?.id || ''), hasPublicUrl: Boolean(ins.rows[0]?.storage_path_or_url) },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    agentDbgFile({
      hypothesisId: 'H3',
      location: 'shopImageBot.js:images/save:file',
      message: 'save ok',
      data: { assetIdPrefix: String(ins.rows[0]?.id || '').slice(0, 8) },
    })
    res.status(201).json({ asset: ins.rows[0] })
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'assets table not available' })
    }
    console.error('images/save error:', err)
    agentDbgFile({
      hypothesisId: 'H3',
      location: 'shopImageBot.js:images/save:catch',
      message: 'save failed',
      data: { code: err.code, err: String(err?.message || err).slice(0, 200) },
    })
    // #region agent log
    fetch('http://127.0.0.1:7761/ingest/05cf90d4-996a-4cce-828d-8d12f370426f', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bb1f55' },
      body: JSON.stringify({
        sessionId: 'bb1f55',
        runId: 'pre-qa',
        hypothesisId: 'H3',
        location: 'shopImageBot.js:images/save:catch',
        message: 'save failed',
        data: { code: err.code, err: String(err?.message || err).slice(0, 200) },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    res.status(500).json({ error: err.message || 'Failed to save image' })
  } finally {
    client.release()
  }
})

router.post('/:id/images/edit', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  const b = req.body || {}
  const editPrompt = String(b.edit_prompt || '').trim()
  if (!editPrompt) return res.status(400).json({ error: 'edit_prompt required' })
  const aspect = b.aspect || '1:1'
  const model = apiModel(b.model)
  const client = await pool.connect()
  try {
    const o = await shopOwnedBy(client, id, profileId)
    if (o.err) return res.status(o.err).json({ error: o.msg })
    const base = String(b.base_prompt || '').slice(0, 2000)
    const augmented = `${base ? `${base}\n\n` : ''}[Image edit request] ${editPrompt}\nProduce a revised marketing image matching the request.`
    const out = await generateImageVariants(augmented, aspect, model, 1)
    res.json({
      image_urls: out.urls,
      image_data_urls: out.dataUrls,
      model_source: out.modelSource,
    })
  } catch (err) {
    console.error('images/edit error:', err)
    res.status(502).json({ error: err.message || 'Image edit failed' })
  } finally {
    client.release()
  }
})

router.post('/:id/images/rebuild', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  const b = req.body || {}
  const aspect = b.aspect || '1:1'
  const imageStyle = b.image_style || b.style || 'ad'
  const shopOnly = Boolean(b.shop_only)
  const userPrompt = String(b.user_prompt || '')
  const model = apiModel(b.model)
  const variantCount = Math.min(5, Math.max(1, Number(b.variant_count) || 1))
  const client = await pool.connect()
  try {
    const o = await shopOwnedBy(client, id, profileId)
    if (o.err) return res.status(o.err).json({ error: o.msg })
    const { shop } = o
    let content = String(b.override_prompt || '').trim()
    let templateId = b.prompt_template_id || null
    if (!content && templateId) {
      const t = await client.query(
        "SELECT id, content FROM prompt_templates WHERE id = $1 AND category = 'image'",
        [templateId]
      )
      if (t.rows.length) content = t.rows[0].content
    }
    if (!content) {
      const ip = await client.query(
        `SELECT id, content FROM prompt_templates WHERE category = 'image' AND is_active = true ORDER BY RANDOM() LIMIT 1`
      )
      if (!ip.rows.length) {
        return res.status(503).json({ error: 'No image templates' })
      }
      templateId = ip.rows[0].id
      content = ip.rows[0].content
    }
    const products = parseProductsJson(shop)
    let selected = products
    if (!shopOnly && Array.isArray(b.product_indices)) {
      selected = b.product_indices.map((i) => products[Number(i)]).filter(Boolean)
    }
    const finalPrompt = buildImagePrompt({
      templateContent: content,
      shop,
      aspect,
      imageStyle,
      shopOnly,
      selectedProducts: selected,
      userPrompt,
    })
    const out = await generateImageVariants(finalPrompt, aspect, model, variantCount)
    res.json({
      image_urls: out.urls,
      image_data_urls: out.dataUrls,
      model_source: out.modelSource,
      prompt_template_id: templateId,
      final_prompt: finalPrompt,
    })
  } catch (err) {
    console.error('images/rebuild error:', err)
    res.status(502).json({ error: err.message || 'Rebuild failed' })
  } finally {
    client.release()
  }
})

router.put('/:id/products', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  const body = req.body
  if (!Array.isArray(body)) {
    return res.status(400).json({ error: 'Body must be a JSON array of products' })
  }
  const normalized = body.map((p, i) => ({
    id: p?.id != null ? String(p.id) : `item-${i}`,
    name: p?.name != null ? String(p.name) : '',
    price: p?.price,
    description: p?.description != null ? String(p.description) : undefined,
    image_url: p?.image_url != null ? String(p.image_url) : undefined,
  }))
  const client = await pool.connect()
  try {
    const o = await shopOwnedBy(client, id, profileId)
    if (o.err) return res.status(o.err).json({ error: o.msg })
    const r = await client.query(
      'UPDATE shops SET products = $1::jsonb, updated_at = NOW() WHERE id = $2 RETURNING id, products',
      [JSON.stringify(normalized), id]
    )
    try {
      await logActivity(pool, {
        userId: profileId,
        action: 'update_shop_products',
        entityType: 'shop',
        entityId: id,
        details: { count: normalized.length },
        severity: 'info',
        ipAddress: req.ip || req.headers['x-forwarded-for'],
      })
    } catch (e) {
      console.warn('activity log update_shop_products:', e.message)
    }
    res.json({ products: r.rows[0].products })
  } catch (err) {
    console.error('PUT products error:', err)
    res.status(500).json({ error: 'Failed to update products' })
  } finally {
    client.release()
  }
})

export default router
