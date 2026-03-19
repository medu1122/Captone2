/**
 * Image bot + products PUT — mounted at /api/shops after main shops router.
 */
import { Router } from 'express'
import pool from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { logActivity } from '../services/activityLog.js'
import { buildImagePrompt } from '../services/imagePromptBuilder.js'
import { generateImageVariants, generateSingleImageVariant } from '../services/imageGeneration.js'
import { saveShopAssetFile, fetchImageToBuffer, parseDataUrl } from '../services/assetStorage.js'

const router = Router()

// Credit cost per generate call (can override via env IMAGE_GENERATE_CREDIT_COST)
const CREDIT_COST_GENERATE = Math.max(1, parseInt(process.env.IMAGE_GENERATE_CREDIT_COST || '10', 10))

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

/**
 * Resolve a prompt template by ID, or auto-pick one filtered by the shop's
 * industry tags (same logic as GET /:id/image-prompts).
 * Returns { templateId, content } or throws if none found.
 */
async function resolveTemplate(client, templateIdInput, shop) {
  if (templateIdInput) {
    const t = await client.query(
      "SELECT id, content FROM prompt_templates WHERE id = $1 AND category = 'image' AND is_active = true",
      [templateIdInput]
    )
    if (!t.rows.length) throw Object.assign(new Error('Invalid prompt_template_id'), { status: 400 })
    return { templateId: t.rows[0].id, content: t.rows[0].content }
  }

  // Auto-pick: try to filter by industry tags first
  let tagList = []
  try {
    const map = await client.query(
      'SELECT tags FROM industry_tag_mappings WHERE TRIM(industry) = TRIM($1) LIMIT 1',
      [String(shop.industry || '')]
    )
    const tags = map.rows[0]?.tags
    if (Array.isArray(tags)) tagList = tags.map(String)
  } catch (_) {}

  let picked = null

  if (tagList.length) {
    // GIN overlap filter: pick a random template that matches the industry tags
    try {
      const taggedResult = await client.query(
        `SELECT id, content FROM prompt_templates
         WHERE category = 'image' AND is_active = true
           AND tags::jsonb ?| $1
         ORDER BY sort_order NULLS LAST, RANDOM()
         LIMIT 1`,
        [tagList]
      )
      if (taggedResult.rows.length) picked = taggedResult.rows[0]
    } catch (_) {}
  }

  if (!picked) {
    // Fallback: any active image template
    const fallback = await client.query(
      `SELECT id, content FROM prompt_templates
       WHERE category = 'image' AND is_active = true
       ORDER BY sort_order NULLS LAST, RANDOM()
       LIMIT 1`
    )
    if (!fallback.rows.length) {
      throw Object.assign(
        new Error('No image prompt templates; run npm run seed:prompt-images'),
        { status: 503 }
      )
    }
    picked = fallback.rows[0]
  }

  return { templateId: picked.id, content: picked.content }
}

/**
 * N template cho N ảnh (mỗi ảnh một prompt). Ít template hơn count thì lặp (A,B,A).
 */
async function resolveTemplatesForVariants(client, shop, count) {
  let tagList = []
  try {
    const map = await client.query(
      'SELECT tags FROM industry_tag_mappings WHERE TRIM(industry) = TRIM($1) LIMIT 1',
      [String(shop.industry || '')]
    )
    const tags = map.rows[0]?.tags
    if (Array.isArray(tags)) tagList = tags.map(String)
  } catch (_) {}

  let rows = []
  if (tagList.length) {
    try {
      const r = await client.query(
        `SELECT id, content FROM prompt_templates
         WHERE category = 'image' AND is_active = true
           AND tags::jsonb ?| $1
         ORDER BY sort_order NULLS LAST, RANDOM()`,
        [tagList]
      )
      rows = r.rows || []
    } catch (_) {}
  }
  if (!rows.length) {
    const fallback = await client.query(
      `SELECT id, content FROM prompt_templates
       WHERE category = 'image' AND is_active = true
       ORDER BY sort_order NULLS LAST, RANDOM()`
    )
    rows = fallback.rows || []
  }
  if (!rows.length) {
    throw Object.assign(
      new Error('No image prompt templates; run npm run seed:prompt-images'),
      { status: 503 }
    )
  }
  const result = []
  for (let i = 0; i < count; i++) {
    result.push(rows[i % rows.length])
  }
  return result
}

/**
 * Deduct credits for image generation. Non-fatal: logs a warning on failure
 * so a credit DB issue never blocks image delivery.
 */
async function deductImageCredit(profileId, shopId, variantCount) {
  const amount = -(CREDIT_COST_GENERATE * variantCount)
  try {
    await pool.query(
      `INSERT INTO credit_transactions (user_id, amount, type, reference_type, reference_id, description)
       VALUES ($1, $2, 'deduct', 'image_generate', $3, $4)`,
      [profileId, amount, shopId, `Image generation (${variantCount} variant${variantCount > 1 ? 's' : ''})`]
    )
  } catch (e) {
    console.warn('[credit] deductImageCredit failed (non-fatal):', e.message)
  }
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

/**
 * Stream NDJSON: first line = prompt meta, then one line per variant, last = done.
 * Keeps connection alive (avoids 504) and lets UI show each image as it completes.
 */
router.post('/:id/images/generate-stream', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  const b = req.body || {}
  const aspect = b.aspect || '1:1'
  const imageStyle = b.image_style || b.style || 'ad'
  const shopOnly = Boolean(b.shop_only)
  const userPrompt = String(b.user_prompt || '')
  const model = apiModel(b.model)
  const variantCount = Math.min(5, Math.max(1, Number(b.variant_count) || 3))
  const refImages = Array.isArray(b.ref_images)
    ? b.ref_images.filter((x) => typeof x === 'string' && x.startsWith('data:'))
    : []

  const writeLine = (obj) => {
    res.write(`${JSON.stringify(obj)}\n`)
  }

  const client = await pool.connect()
  try {
    const o = await shopOwnedBy(client, id, profileId)
    if (o.err) {
      res.status(o.err).json({ error: o.msg })
      return
    }
    const { shop } = o

    let templates
    try {
      templates = await resolveTemplatesForVariants(client, shop, variantCount)
    } catch (e) {
      res.status(e.status || 503).json({ error: e.message })
      return
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

    const maxLength = model === 'openai' ? 28000 : 3900
    const finalPrompts = templates.map((t) =>
      buildImagePrompt({
        templateContent: t.content,
        shop,
        aspect,
        imageStyle,
        shopOnly,
        selectedProducts: selected,
        userPrompt,
        maxLength,
      })
    )

    const firstTemplateId = templates[0]?.id ?? null
    console.log(
      `[image-bot stream] shop=${id} variants=${variantCount} model=${model} one-template-per-image`
    )

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Accel-Buffering', 'no')
    res.status(200)
    res.flushHeaders?.()

    writeLine({
      type: 'prompt',
      prompt_template_id: firstTemplateId,
      variant_count: variantCount,
      model,
    })

    let modelSource = 'dall-e-3'
    let successCount = 0
    for (let i = 0; i < variantCount; i++) {
      const finalPrompt = finalPrompts[i]
      try {
        const r = await generateSingleImageVariant(finalPrompt, aspect, model, refImages, i, variantCount)
        modelSource = r.modelSource || modelSource
        successCount += 1
        writeLine({
          type: 'variant',
          index: i,
          image_url: r.url || null,
          image_data_url: r.dataUrl || null,
        })
      } catch (err) {
        console.error(`[image-bot stream] variant ${i} failed:`, err.message)
        writeLine({ type: 'error', index: i, message: err.message || 'Generation failed' })
        break
      }
    }

    if (successCount > 0) {
      await deductImageCredit(profileId, id, successCount)
    }

    writeLine({
      type: 'done',
      model_source: modelSource,
      prompt_template_id: firstTemplateId,
      generated: successCount,
    })
    res.end()
  } catch (err) {
    console.error('images/generate-stream error:', err)
    if (!res.headersSent) {
      res.status(502).json({ error: err.message || 'Image generation failed' })
    } else {
      try {
        writeLine({ type: 'fatal', message: err.message })
        res.end()
      } catch (_) {
        res.end()
      }
    }
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
  // ref_images: array of base64 data URLs from the frontend upload
  const refImages = Array.isArray(b.ref_images)
    ? b.ref_images.filter((x) => typeof x === 'string' && x.startsWith('data:'))
    : []
  const client = await pool.connect()
  try {
    const o = await shopOwnedBy(client, id, profileId)
    if (o.err) return res.status(o.err).json({ error: o.msg })
    const { shop } = o

    let templateId, content
    try {
      ;({ templateId, content } = await resolveTemplate(client, b.prompt_template_id || null, shop))
    } catch (e) {
      return res.status(e.status || 503).json({ error: e.message })
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

    // gpt-image-1 supports longer prompts; use 28000 to leave headroom
    const maxLength = model === 'openai' ? 28000 : 3900
    const finalPrompt = buildImagePrompt({
      templateContent: content,
      shop,
      aspect,
      imageStyle,
      shopOnly,
      selectedProducts: selected,
      userPrompt,
      maxLength,
    })

    const out = await generateImageVariants(finalPrompt, aspect, model, variantCount, refImages)

    // Deduct credits after successful generation (non-fatal)
    await deductImageCredit(profileId, id, variantCount)

    res.json({
      image_urls: out.urls,
      image_data_urls: out.dataUrls,
      model_source: out.modelSource,
      prompt_template_id: templateId,
      final_prompt: finalPrompt,
    })
  } catch (err) {
    console.error('images/generate error:', err)
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
    res.status(201).json({ asset: ins.rows[0] })
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'assets table not available' })
    }
    console.error('images/save error:', err)
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
  const refImages = Array.isArray(b.ref_images)
    ? b.ref_images.filter((x) => typeof x === 'string' && x.startsWith('data:'))
    : []
  const client = await pool.connect()
  try {
    const o = await shopOwnedBy(client, id, profileId)
    if (o.err) return res.status(o.err).json({ error: o.msg })
    const base = String(b.base_prompt || '').slice(0, 2000)
    const augmented = `${base ? `${base}\n\n` : ''}[Image edit request] ${editPrompt}\nProduce a revised marketing image matching the request.`
    const out = await generateImageVariants(augmented, aspect, model, 1, refImages)
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
  const refImages = Array.isArray(b.ref_images)
    ? b.ref_images.filter((x) => typeof x === 'string' && x.startsWith('data:'))
    : []
  const client = await pool.connect()
  try {
    const o = await shopOwnedBy(client, id, profileId)
    if (o.err) return res.status(o.err).json({ error: o.msg })
    const { shop } = o

    // If an override_prompt is given, use it directly without a DB template
    let content = String(b.override_prompt || '').trim()
    let templateId = b.prompt_template_id || null

    if (!content) {
      try {
        ;({ templateId, content } = await resolveTemplate(client, templateId, shop))
      } catch (e) {
        return res.status(e.status || 503).json({ error: e.message })
      }
    }

    const products = parseProductsJson(shop)
    let selected = products
    if (!shopOnly && Array.isArray(b.product_indices)) {
      selected = b.product_indices.map((i) => products[Number(i)]).filter(Boolean)
    }

    const maxLength = model === 'openai' ? 28000 : 3900
    const finalPrompt = buildImagePrompt({
      templateContent: content,
      shop,
      aspect,
      imageStyle,
      shopOnly,
      selectedProducts: selected,
      userPrompt,
      maxLength,
    })

    const out = await generateImageVariants(finalPrompt, aspect, model, variantCount, refImages)

    // Deduct credits after successful rebuild (non-fatal)
    await deductImageCredit(profileId, id, variantCount)

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
    tags: Array.isArray(p?.tags) ? p.tags.map(String) : undefined,
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
