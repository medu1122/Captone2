import { Router } from 'express'
import bcrypt from 'bcrypt'
import fs from 'fs/promises'
import path from 'path'
import pool from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { logActivity } from '../services/activityLog.js'
import { buildPromptPatch, classifyIntent } from '../services/websiteAiService.js'
import {
  appendVersion,
  buildHistoryItems,
  buildWebsiteOverview,
  createBaseWebsiteConfig,
  ensureWebsiteTables,
  getSectionList,
  moveSection,
  normalizeWebsiteConfig,
  readVersions,
  replaceSection,
  restoreVersion,
  serializeConversationContent,
  summarizeSections,
} from '../services/shopWebsiteService.js'
import { createShopContainer, getContainerStats, removeContainer } from '../services/shopDockerService.js'
import { publishWebsiteStatic } from '../services/websiteStaticPublishService.js'
import { getUploadRoot } from '../services/assetStorage.js'
import {
  applyBundle,
  editBundle,
  generateFullRedesign,
  readCurrentBundleHtml,
  restoreBundleVersion,
} from '../services/websiteCodegenService.js'

const router = Router()

function toText(value, fallback = '') {
  if (value == null) return fallback
  return String(value).trim() || fallback
}

function clip(value, max = 140) {
  const text = toText(value)
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + '…'
}

function normalizeSlug(value) {
  return toText(value, 'shop')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'shop'
}

function previewBaseUrl() {
  return toText(process.env.WEBSITE_PREVIEW_BASE_URL, 'https://preview.captone2.site').replace(/\/$/, '')
}

function publicBaseDomain() {
  return toText(process.env.WEBSITE_PUBLIC_BASE_DOMAIN, 'captone2.site')
}

function buildDefaultSubdomain(slug) {
  return `${normalizeSlug(slug)}.${publicBaseDomain()}`
}

function buildPreviewUrl(shopId) {
  return `${previewBaseUrl()}/sites/${shopId}`
}

async function getOwnedShop(client, shopId, profileId) {
  const row = await client.query(
    `SELECT id, user_id, name, slug, industry, description, address, city, district, country,
            postal_code, contact_info, logo_url, cover_url, status, products
     FROM shops WHERE id = $1 AND user_id = $2`,
    [shopId, profileId]
  )
  if (row.rows.length > 0) return row.rows[0]
  const any = await client.query('SELECT id FROM shops WHERE id = $1', [shopId])
  return any.rows.length > 0 ? null : undefined
}

async function listAssets(client, shopId) {
  try {
    const result = await client.query(
      `SELECT id, type, name, storage_path_or_url, mime_type, model_source, created_at
       FROM assets WHERE shop_id = $1 ORDER BY created_at DESC`,
      [shopId]
    )
    return result.rows
  } catch (error) {
    if (error.code === '42P01') return []
    throw error
  }
}

async function ensureDeploymentTable(client) {
  await client.query(
    `CREATE TABLE IF NOT EXISTS site_deployments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID,
      shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      container_id TEXT,
      container_name TEXT,
      subdomain TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'draft',
      port INTEGER,
      deployed_at TIMESTAMPTZ,
      last_build_at TIMESTAMPTZ,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  )
  await client.query('ALTER TABLE site_deployments ADD COLUMN IF NOT EXISTS site_id UUID')
  await client.query('ALTER TABLE site_deployments ADD COLUMN IF NOT EXISTS container_name TEXT')
  await client.query('ALTER TABLE site_deployments ADD COLUMN IF NOT EXISTS subdomain TEXT')
  await client.query('ALTER TABLE site_deployments ADD COLUMN IF NOT EXISTS port INTEGER')
  await client.query('ALTER TABLE site_deployments ADD COLUMN IF NOT EXISTS last_build_at TIMESTAMPTZ')
  await client.query('ALTER TABLE site_deployments ADD COLUMN IF NOT EXISTS error_message TEXT')
  await client.query('ALTER TABLE site_deployments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()')
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_site_deployments_shop_unique ON site_deployments (shop_id)')
}

async function getDeployment(client, shopId) {
  try {
    await ensureDeploymentTable(client)
    const result = await client.query('SELECT * FROM site_deployments WHERE shop_id = $1 LIMIT 1', [shopId])
    return result.rows[0] || null
  } catch (error) {
    if (error.code === '42P01') return null
    throw error
  }
}

async function upsertSite(client, { siteId, shopId, userId, name, slug, config, status, renderMode, bundleManifest }) {
  if (siteId) {
    const updated = await client.query(
      `UPDATE sites
       SET name = $1, slug = $2, config_json = $3::jsonb, status = $4,
           render_mode = COALESCE($6, render_mode),
           bundle_manifest = CASE WHEN $7::jsonb IS NOT NULL THEN $7::jsonb ELSE bundle_manifest END,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, slug, JSON.stringify(config), status, siteId,
       renderMode || null,
       bundleManifest ? JSON.stringify(bundleManifest) : null]
    )
    return updated.rows[0]
  }

  const inserted = await client.query(
    `INSERT INTO sites (shop_id, user_id, name, slug, config_json, status, render_mode, bundle_manifest)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb)
     RETURNING *`,
    [shopId, userId, name, slug, JSON.stringify(config), status,
     renderMode || 'config',
     bundleManifest ? JSON.stringify(bundleManifest) : null]
  )
  return inserted.rows[0]
}

async function getExistingSite(client, shop) {
  await ensureWebsiteTables(client)
  const existing = await client.query(
    'SELECT * FROM sites WHERE shop_id = $1 ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 1',
    [shop.id]
  )
  if (existing.rows.length === 0) return null
  return existing.rows[0]
}

async function verifyProfilePassword(client, profileId, password) {
  const result = await client.query(
    `SELECT l.password_hash
     FROM user_profiles up
     JOIN logins l ON l.id = up.login_id
     WHERE up.id = $1`,
    [profileId]
  )
  if (result.rows.length === 0) return false
  return bcrypt.compare(String(password || ''), result.rows[0].password_hash)
}

async function ensureSite(client, shop, assets, overrides = {}) {
  const existingSite = await getExistingSite(client, shop)
  if (existingSite) {
    const site = existingSite
    const config = normalizeWebsiteConfig(site.config_json, { shop, assets })
    return { site, config }
  }

  const baseConfig = createBaseWebsiteConfig({
    shop,
    assets,
    selectedAssetIds: overrides.selectedAssetIds || [],
    template: overrides.template,
    tone: overrides.tone,
    palette: overrides.palette,
    idea: overrides.idea || shop.description,
  })
  const seededConfig = appendVersion(baseConfig, {
    title: 'Initial website draft',
    source: 'system',
    summary: 'Created from shop context and selected assets.',
  })
  const site = await upsertSite(client, {
    siteId: null,
    shopId: shop.id,
    userId: shop.user_id,
    name: `${shop.name} website`,
    slug: normalizeSlug(shop.slug),
    config: seededConfig,
    status: 'draft',
  })
  return { site, config: seededConfig }
}

async function logWebsitePrompt(client, siteId, role, payload) {
  await client.query(
    `INSERT INTO conversation_messages (site_id, role, content)
     VALUES ($1, $2, $3)`,
    [siteId, role, serializeConversationContent(payload)]
  )
}

function mergePromptUpdates(config, updates) {
  const next = {
    ...config,
    theme: {
      ...config.theme,
      ...(updates.theme && typeof updates.theme === 'object' ? updates.theme : {}),
    },
    settings: {
      ...config.settings,
      ...(updates.settings && typeof updates.settings === 'object' ? updates.settings : {}),
    },
    sections: [...config.sections],
  }

  const entries = Array.isArray(updates.sections) ? updates.sections : []
  const affectedSections = []
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const action = entry.action === 'append' ? 'append' : 'update'
    if (action === 'append' && entry.id && !next.sections.some((section) => section.id === entry.id)) {
      next.sections.push({
        id: entry.id,
        type: entry.type || 'content',
        name: entry.name || 'New section',
        editableFields: Array.isArray(entry.editableFields) ? entry.editableFields.map(String) : [],
        props: entry.props && typeof entry.props === 'object' ? entry.props : {},
      })
      affectedSections.push(entry.id)
      continue
    }
    const index = next.sections.findIndex((section) => section.id === entry.id)
    if (index === -1) continue
    next.sections[index] = {
      ...next.sections[index],
      props: {
        ...(next.sections[index].props || {}),
        ...(entry.props && typeof entry.props === 'object' ? entry.props : {}),
      },
    }
    affectedSections.push(entry.id)
  }
  return { config: next, affectedSections: Array.from(new Set(affectedSections)) }
}

async function buildOverviewPayload(client, shop) {
  const assets = await listAssets(client, shop.id)
  const { site, config } = await ensureSite(client, shop, assets)
  const deployment = await getDeployment(client, shop.id)
  const promptResult = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM conversation_messages
     WHERE site_id = $1 AND role = 'user'`,
    [site.id]
  )
  const promptCount = promptResult.rows[0]?.count ?? 0
  const promptSuccessRate = promptCount > 0 ? 100 : null
  return {
    site,
    config,
    assets,
    deployment,
    overview: buildWebsiteOverview({
      site,
      config,
      deployment,
      promptCount,
      promptSuccessRate,
    }),
    history: buildHistoryItems(config, deployment),
  }
}

router.get('/:id/website/entry', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const shop = await getOwnedShop(client, req.params.id, req.auth.profileId)
    if (shop === undefined) return res.status(404).json({ error: 'Shop not found' })
    if (!shop) return res.status(403).json({ error: 'Access denied' })

    const site = await getExistingSite(client, shop)
    const deployment = await getDeployment(client, shop.id)
    if (!site) {
      return res.json({ sites: [] })
    }

    res.json({
      sites: [{
        id: site.id,
        name: site.name || `${shop.name} website`,
        link: `https://${toText(deployment?.subdomain, buildDefaultSubdomain(site.slug))}`,
        previewUrl: buildPreviewUrl(shop.id),
        status: deployment?.status || site.status || 'draft',
        createdAt: site.created_at || null,
        launchedAt: deployment?.deployed_at || null,
      }],
    })
  } catch (error) {
    console.error('website entry error:', error)
    res.status(500).json({ error: error.message || 'Failed to load website entry' })
  } finally {
    client.release()
  }
})

router.get('/:id/website/overview', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const shop = await getOwnedShop(client, req.params.id, req.auth.profileId)
    if (shop === undefined) return res.status(404).json({ error: 'Shop not found' })
    if (!shop) return res.status(403).json({ error: 'Access denied' })

    const payload = await buildOverviewPayload(client, shop)
    res.json({ overview: payload.overview, history: payload.history })
  } catch (error) {
    console.error('website overview error:', error)
    res.status(500).json({ error: error.message || 'Failed to load website overview' })
  } finally {
    client.release()
  }
})

router.get('/:id/website/builder-state', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const shop = await getOwnedShop(client, req.params.id, req.auth.profileId)
    if (shop === undefined) return res.status(404).json({ error: 'Shop not found' })
    if (!shop) return res.status(403).json({ error: 'Access denied' })

    const payload = await buildOverviewPayload(client, shop)
    res.json({
      site: payload.site,
      config: payload.config,
      sections: getSectionList(payload.config),
      assets: payload.assets,
      theme: payload.config.theme,
      selectedTemplate: payload.config.template,
      draftPreviewUrl: payload.overview.previewUrl,
      publicUrl: payload.overview.publicUrl,
      previewUrl: payload.overview.previewUrl,
      deploy: payload.deployment,
      renderMode: payload.site?.render_mode || 'config',
      bundleManifest: payload.site?.bundle_manifest || null,
      shop: {
        id: shop.id,
        name: shop.name,
        industry: shop.industry,
        description: shop.description,
        slug: shop.slug,
      },
      versions: readVersions(payload.config),
    })
  } catch (error) {
    console.error('website builder-state error:', error)
    res.status(500).json({ error: error.message || 'Failed to load website builder state' })
  } finally {
    client.release()
  }
})

router.post('/:id/website/create-from-idea', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const shop = await getOwnedShop(client, req.params.id, req.auth.profileId)
    if (shop === undefined) return res.status(404).json({ error: 'Shop not found' })
    if (!shop) return res.status(403).json({ error: 'Access denied' })

    const assets = await listAssets(client, shop.id)
    const { site } = await ensureSite(client, shop, assets)
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const nextConfig = appendVersion(
      createBaseWebsiteConfig({
        shop,
        assets,
        selectedAssetIds: Array.isArray(body.selectedAssetIds) ? body.selectedAssetIds : [],
        template: body.template,
        tone: body.tone,
        palette: body.palette,
        idea: body.idea,
      }),
      {
        title: body.idea ? 'Create website from idea' : 'Rebuild website draft',
        source: 'system',
        summary: clip(body.idea || 'Website draft regenerated from current shop context.'),
      }
    )
    nextConfig.meta.lastIdea = clip(body.idea || nextConfig.meta.lastIdea)

    const savedSite = await upsertSite(client, {
      siteId: site.id,
      shopId: shop.id,
      userId: shop.user_id,
      name: `${shop.name} website`,
      slug: normalizeSlug(shop.slug),
      config: nextConfig,
      status: 'draft',
    })
    await publishWebsiteStatic({ shopId: shop.id, config: nextConfig })

    try {
      await logActivity(pool, {
        userId: req.auth.profileId,
        action: 'create_website_draft',
        entityType: 'site',
        entityId: savedSite.id,
        details: { template: nextConfig.template, tone: nextConfig.settings.tone },
        severity: 'info',
        ipAddress: req.ip || req.headers['x-forwarded-for'],
      })
    } catch (logError) {
      console.warn('activity log create_website_draft:', logError.message)
    }

    res.json({
      ok: true,
      site: savedSite,
      config: nextConfig,
      sections: getSectionList(nextConfig),
      summary: 'Website draft updated from your selected inputs.',
    })
  } catch (error) {
    console.error('website create-from-idea error:', error)
    res.status(500).json({ error: error.message || 'Failed to create website from idea' })
  } finally {
    client.release()
  }
})

router.post('/:id/website/sections/:sectionId/update', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const shop = await getOwnedShop(client, req.params.id, req.auth.profileId)
    if (shop === undefined) return res.status(404).json({ error: 'Shop not found' })
    if (!shop) return res.status(403).json({ error: 'Access denied' })

    const assets = await listAssets(client, shop.id)
    const { site, config } = await ensureSite(client, shop, assets)
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    let nextConfig = config

    if (body.theme && typeof body.theme === 'object') {
      nextConfig = {
        ...nextConfig,
        theme: {
          ...nextConfig.theme,
          ...body.theme,
        },
      }
    }
    if (body.selectedAssetIds && Array.isArray(body.selectedAssetIds)) {
      nextConfig = {
        ...nextConfig,
        selectedAssetIds: body.selectedAssetIds.map(String),
      }
    }
    if (body.settings && typeof body.settings === 'object') {
      nextConfig = {
        ...nextConfig,
        settings: {
          ...nextConfig.settings,
          ...body.settings,
        },
      }
    }

    if (body.moveDirection === 'up' || body.moveDirection === 'down') {
      nextConfig = moveSection(nextConfig, req.params.sectionId, body.moveDirection).config
    }

    if (body.props && typeof body.props === 'object') {
      nextConfig = replaceSection(nextConfig, req.params.sectionId, (section) => ({
        ...section,
        props: {
          ...(section.props || {}),
          ...body.props,
        },
      })).config
    }

    nextConfig = appendVersion({
      ...nextConfig,
      meta: {
        ...nextConfig.meta,
        updatedAt: new Date().toISOString(),
      },
    }, {
      title: `Update ${req.params.sectionId}`,
      source: 'manual',
      summary: `Manual update on section ${req.params.sectionId}.`,
    })

    const savedSite = await upsertSite(client, {
      siteId: site.id,
      shopId: shop.id,
      userId: shop.user_id,
      name: `${shop.name} website`,
      slug: normalizeSlug(shop.slug),
      config: nextConfig,
      status: 'draft',
    })
    await publishWebsiteStatic({ shopId: shop.id, config: nextConfig })

    res.json({
      ok: true,
      site: savedSite,
      config: nextConfig,
      sections: getSectionList(nextConfig),
      summary: `Section ${req.params.sectionId} updated.`,
    })
  } catch (error) {
    console.error('website section update error:', error)
    res.status(500).json({ error: error.message || 'Failed to update website section' })
  } finally {
    client.release()
  }
})

router.post('/:id/website/prompt/preview', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const shop = await getOwnedShop(client, req.params.id, req.auth.profileId)
    if (shop === undefined) return res.status(404).json({ error: 'Shop not found' })
    if (!shop) return res.status(403).json({ error: 'Access denied' })

    const assets = await listAssets(client, shop.id)
    const { site, config } = await ensureSite(client, shop, assets)
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const promptText = toText(body.prompt)

    const renderMode = site.render_mode || 'config'
    const intent = classifyIntent(promptText)

    // Codegen path: broad redesign OR site already in codegen mode
    if (intent === 'page_redesign' || renderMode === 'codegen') {
      const { html: currentHtml } = await readCurrentBundleHtml(shop.id)
      const codegenFn = intent === 'page_redesign'
        ? () => generateFullRedesign({ prompt: promptText, shop, assets, creativity: body.creativity })
        : () => editBundle({ prompt: promptText, shop, assets, currentHtml, sectionId: body.sectionId, creativity: body.creativity })

      const result = await codegenFn()
      if (!result.ok) {
        return res.status(422).json({
          error: result.error || 'AI is required but is not available.',
          requiresAi: result.requiresAi,
          intent,
          renderMode: 'codegen',
        })
      }

      return res.json({
        summary: result.summary,
        renderMode: 'codegen',
        previewHtml: result.html,
        draftPreviewUrl: buildPreviewUrl(shop.id),
        affectedSections: [],
      })
    }

    // Config-patch path: section edit in config mode
    const patch = await buildPromptPatch({
      prompt: promptText,
      scope: body.scope,
      sectionId: body.sectionId,
      config,
      shop,
      assets,
      creativity: body.creativity,
    })

    if (patch.requiresAi) {
      return res.status(422).json({
        error: patch.summary || 'AI is required for this request but is not available. Configure WEBSITE_AI_PROVIDER and matching credentials.',
        requiresAi: true,
        intent: patch.intent,
      })
    }

    const merged = mergePromptUpdates(config, patch.updates || {})
    const draftConfig = {
      ...merged.config,
      meta: {
        ...merged.config.meta,
        lastPrompt: clip(body.prompt),
        updatedAt: new Date().toISOString(),
      },
    }

    res.json({
      summary: patch.summary,
      affectedSections: merged.affectedSections.length > 0 ? merged.affectedSections : patch.affectedSections,
      draftConfig,
      draftPreviewUrl: buildPreviewUrl(shop.id),
      renderMode: 'config',
    })
  } catch (error) {
    console.error('website prompt preview error:', error)
    res.status(500).json({ error: error.message || 'Failed to preview prompt changes' })
  } finally {
    client.release()
  }
})

router.post('/:id/website/prompt/apply', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const shop = await getOwnedShop(client, req.params.id, req.auth.profileId)
    if (shop === undefined) return res.status(404).json({ error: 'Shop not found' })
    if (!shop) return res.status(403).json({ error: 'Access denied' })

    const assets = await listAssets(client, shop.id)
    const { site, config } = await ensureSite(client, shop, assets)
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const promptText = toText(body.prompt)

    const renderMode = site.render_mode || 'config'
    const intent = classifyIntent(promptText)

    // ── Codegen path: broad redesign or site already in codegen mode ──────────
    if (intent === 'page_redesign' || renderMode === 'codegen') {
      const { html: currentHtml } = await readCurrentBundleHtml(shop.id)
      const codegenFn = intent === 'page_redesign'
        ? () => generateFullRedesign({ prompt: promptText, shop, assets, creativity: body.creativity })
        : () => editBundle({ prompt: promptText, shop, assets, currentHtml, sectionId: body.sectionId, creativity: body.creativity })

      const result = await codegenFn()
      if (!result.ok) {
        return res.status(422).json({
          error: result.error || 'AI is required for this request but is not available.',
          requiresAi: result.requiresAi,
          intent,
          renderMode: 'codegen',
        })
      }

      const { versionId } = await applyBundle({ shopId: shop.id, html: result.html })

      const bundleManifest = {
        versionId,
        generatedAt: new Date().toISOString(),
        prompt: clip(promptText, 200),
        provider: result.provider || 'unknown',
        title: result.title,
        summary: result.summary,
        intent,
      }

      // Append version entry to config_json for history rail
      let nextConfig = {
        ...config,
        meta: {
          ...config.meta,
          lastPrompt: clip(promptText),
          updatedAt: new Date().toISOString(),
        },
      }
      nextConfig = appendVersion(nextConfig, {
        title: clip(promptText || 'Redesign'),
        source: 'codegen',
        summary: result.summary,
        bundleVersionId: versionId,
      })

      const savedSite = await upsertSite(client, {
        siteId: site.id,
        shopId: shop.id,
        userId: shop.user_id,
        name: `${shop.name} website`,
        slug: normalizeSlug(shop.slug),
        config: nextConfig,
        status: 'preview_ready',
        renderMode: 'codegen',
        bundleManifest,
      })

      await logWebsitePrompt(client, site.id, 'user', { prompt: promptText, intent, creativity: body.creativity })
      await logWebsitePrompt(client, site.id, 'assistant', {
        summary: result.summary,
        source: 'codegen',
        provider: result.provider,
        versionId,
      })

      try {
        await logActivity(pool, {
          userId: req.auth.profileId,
          action: 'edit_site_codegen',
          entityType: 'site',
          entityId: savedSite.id,
          details: { prompt: clip(promptText, 120), intent, provider: result.provider, versionId },
          severity: 'info',
          ipAddress: req.ip || req.headers['x-forwarded-for'],
        })
      } catch (logError) {
        console.warn('activity log edit_site_codegen:', logError.message)
      }

      return res.json({
        ok: true,
        message: result.summary,
        renderMode: 'codegen',
        previewUrl: buildPreviewUrl(shop.id),
        affectedSections: [],
        config: nextConfig,
        site: savedSite,
        versionId,
      })
    }

    // ── Config-patch path: section edit in config mode ─────────────────────────
    const patch = await buildPromptPatch({
      prompt: promptText,
      scope: body.scope,
      sectionId: body.sectionId,
      config,
      shop,
      assets,
      creativity: body.creativity,
    })

    if (patch.requiresAi) {
      return res.status(422).json({
        error: patch.summary || 'AI is required for this request but is not available. Configure WEBSITE_AI_PROVIDER and matching credentials.',
        requiresAi: true,
        intent: patch.intent,
      })
    }

    const merged = mergePromptUpdates(config, patch.updates || {})
    let nextConfig = {
      ...merged.config,
      meta: {
        ...merged.config.meta,
        lastPrompt: clip(promptText),
        updatedAt: new Date().toISOString(),
      },
    }
    nextConfig = appendVersion(nextConfig, {
      title: clip(promptText || 'Apply prompt'),
      source: 'prompt',
      summary: patch.summary,
    })

    const savedSite = await upsertSite(client, {
      siteId: site.id,
      shopId: shop.id,
      userId: shop.user_id,
      name: `${shop.name} website`,
      slug: normalizeSlug(shop.slug),
      config: nextConfig,
      status: 'preview_ready',
    })
    await publishWebsiteStatic({ shopId: shop.id, config: nextConfig })

    await logWebsitePrompt(client, site.id, 'user', {
      prompt: promptText,
      scope: body.scope,
      sectionId: body.sectionId,
      creativity: body.creativity,
    })
    await logWebsitePrompt(client, site.id, 'assistant', {
      summary: patch.summary,
      affectedSections: merged.affectedSections.length > 0 ? merged.affectedSections : patch.affectedSections,
      sections: summarizeSections(nextConfig),
      source: patch.source,
    })

    try {
      await logActivity(pool, {
        userId: req.auth.profileId,
        action: 'edit_site_prompt',
        entityType: 'site',
        entityId: savedSite.id,
        details: {
          prompt: clip(promptText, 120),
          section_id: body.sectionId || null,
          scope: body.scope || 'all',
          source: patch.source,
        },
        severity: 'info',
        ipAddress: req.ip || req.headers['x-forwarded-for'],
      })
    } catch (logError) {
      console.warn('activity log edit_site_prompt:', logError.message)
    }

    res.json({
      ok: true,
      message: patch.summary,
      renderMode: 'config',
      previewUrl: buildPreviewUrl(shop.id),
      affectedSections: merged.affectedSections.length > 0 ? merged.affectedSections : patch.affectedSections,
      config: nextConfig,
      site: savedSite,
    })
  } catch (error) {
    console.error('website prompt apply error:', error)
    res.status(500).json({ error: error.message || 'Failed to apply prompt changes' })
  } finally {
    client.release()
  }
})

router.post('/:id/website/rebuild', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const shop = await getOwnedShop(client, req.params.id, req.auth.profileId)
    if (shop === undefined) return res.status(404).json({ error: 'Shop not found' })
    if (!shop) return res.status(403).json({ error: 'Access denied' })

    const assets = await listAssets(client, shop.id)
    const { site } = await ensureSite(client, shop, assets)
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const rebuilt = appendVersion(
      createBaseWebsiteConfig({
        shop,
        assets,
        selectedAssetIds: Array.isArray(body.selectedAssetIds) ? body.selectedAssetIds : [],
        template: body.template,
        tone: body.tone,
        palette: body.palette,
        idea: body.idea || body.prompt,
      }),
      {
        title: 'Rebuild website draft',
        source: 'system',
        summary: clip(body.idea || body.prompt || 'Website draft rebuilt from current inputs.'),
      }
    )

    const savedSite = await upsertSite(client, {
      siteId: site.id,
      shopId: shop.id,
      userId: shop.user_id,
      name: `${shop.name} website`,
      slug: normalizeSlug(shop.slug),
      config: rebuilt,
      status: 'draft',
    })
    await publishWebsiteStatic({ shopId: shop.id, config: rebuilt })

    res.json({
      ok: true,
      site: savedSite,
      config: rebuilt,
      sections: getSectionList(rebuilt),
      summary: 'Website draft rebuilt.',
    })
  } catch (error) {
    console.error('website rebuild error:', error)
    res.status(500).json({ error: error.message || 'Failed to rebuild website' })
  } finally {
    client.release()
  }
})

router.get('/:id/website/versions', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const shop = await getOwnedShop(client, req.params.id, req.auth.profileId)
    if (shop === undefined) return res.status(404).json({ error: 'Shop not found' })
    if (!shop) return res.status(403).json({ error: 'Access denied' })

    const assets = await listAssets(client, shop.id)
    const { config } = await ensureSite(client, shop, assets)
    res.json({ versions: readVersions(config) })
  } catch (error) {
    console.error('website versions error:', error)
    res.status(500).json({ error: error.message || 'Failed to list website versions' })
  } finally {
    client.release()
  }
})

router.post('/:id/website/versions/:versionId/restore', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const shop = await getOwnedShop(client, req.params.id, req.auth.profileId)
    if (shop === undefined) return res.status(404).json({ error: 'Shop not found' })
    if (!shop) return res.status(403).json({ error: 'Access denied' })

    const assets = await listAssets(client, shop.id)
    const { site, config } = await ensureSite(client, shop, assets)
    const versionId = req.params.versionId

    // Try codegen bundle restore first
    const bundleRestore = await restoreBundleVersion({ shopId: shop.id, versionId })
    if (bundleRestore.ok) {
      const nextConfig = appendVersion(config, {
        title: `Restore codegen version`,
        source: 'manual',
        summary: 'Website restored from codegen bundle snapshot.',
        bundleVersionId: versionId,
      })
      nextConfig.meta = { ...nextConfig.meta, updatedAt: new Date().toISOString() }

      const savedSite = await upsertSite(client, {
        siteId: site.id,
        shopId: shop.id,
        userId: shop.user_id,
        name: `${shop.name} website`,
        slug: normalizeSlug(shop.slug),
        config: nextConfig,
        status: 'preview_ready',
        renderMode: 'codegen',
      })
      return res.json({
        ok: true,
        renderMode: 'codegen',
        site: savedSite,
        config: nextConfig,
        summary: 'Codegen version restored.',
      })
    }

    // Fall back to config-based version restore
    const restored = restoreVersion(config, versionId)
    if (!restored) return res.status(404).json({ error: 'Version not found' })

    const nextConfig = appendVersion(restored, {
      title: `Restore version ${versionId}`,
      source: 'manual',
      summary: 'Website restored from version history.',
    })
    const savedSite = await upsertSite(client, {
      siteId: site.id,
      shopId: shop.id,
      userId: shop.user_id,
      name: `${shop.name} website`,
      slug: normalizeSlug(shop.slug),
      config: nextConfig,
      status: 'preview_ready',
    })
    await publishWebsiteStatic({ shopId: shop.id, config: nextConfig })

    res.json({
      ok: true,
      renderMode: 'config',
      site: savedSite,
      config: nextConfig,
      sections: getSectionList(nextConfig),
      summary: 'Version restored.',
    })
  } catch (error) {
    console.error('website restore version error:', error)
    res.status(500).json({ error: error.message || 'Failed to restore website version' })
  } finally {
    client.release()
  }
})

router.get('/:id/website/deploy/status', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const shop = await getOwnedShop(client, req.params.id, req.auth.profileId)
    if (shop === undefined) return res.status(404).json({ error: 'Shop not found' })
    if (!shop) return res.status(403).json({ error: 'Access denied' })

    const deployment = await getDeployment(client, shop.id)
    let liveStats = null
    if (deployment?.container_id) {
      liveStats = await getContainerStats(deployment.container_id)
    }
    res.json({
      deployment,
      liveStats,
      publicUrl: `https://${toText(deployment?.subdomain, buildDefaultSubdomain(shop.slug))}`,
      previewUrl: buildPreviewUrl(shop.id),
    })
  } catch (error) {
    console.error('website deploy status error:', error)
    res.status(500).json({ error: error.message || 'Failed to load deploy status' })
  } finally {
    client.release()
  }
})

router.post('/:id/website/delete', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const shop = await getOwnedShop(client, req.params.id, req.auth.profileId)
    if (shop === undefined) return res.status(404).json({ error: 'Shop not found' })
    if (!shop) return res.status(403).json({ error: 'Access denied' })

    const password = req.body?.password
    if (!password) return res.status(400).json({ error: 'Password is required' })

    const isValidPassword = await verifyProfilePassword(client, req.auth.profileId, password)
    if (!isValidPassword) return res.status(401).json({ error: 'Password is incorrect' })

    const site = await getExistingSite(client, shop)
    const deployment = await getDeployment(client, shop.id)

    await client.query('BEGIN')
    await ensureWebsiteTables(client)
    await ensureDeploymentTable(client)

    if (deployment?.container_id) {
      try {
        await removeContainer(deployment.container_id, true)
      } catch (dockerError) {
        console.warn('website delete removeContainer:', dockerError.message)
      }
    }

    await client.query('DELETE FROM site_deployments WHERE shop_id = $1', [shop.id])
    if (site?.id) {
      await client.query('DELETE FROM conversation_messages WHERE site_id = $1', [site.id])
      await client.query('DELETE FROM sites WHERE id = $1', [site.id])
    }

    await client.query('COMMIT')

    try {
      await logActivity(pool, {
        userId: req.auth.profileId,
        action: 'delete_website',
        entityType: 'site',
        entityId: site?.id || null,
        details: { shop_id: shop.id },
        severity: 'warning',
        ipAddress: req.ip || req.headers['x-forwarded-for'],
      })
    } catch (logError) {
      console.warn('activity log delete_website:', logError.message)
    }

    res.json({ ok: true })
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {}
    console.error('website delete error:', error)
    res.status(500).json({ error: error.message || 'Failed to delete website' })
  } finally {
    client.release()
  }
})

router.post('/:id/website/deploy', requireAuth, async (req, res) => {
  const client = await pool.connect()
  try {
    const shop = await getOwnedShop(client, req.params.id, req.auth.profileId)
    if (shop === undefined) return res.status(404).json({ error: 'Shop not found' })
    if (!shop) return res.status(403).json({ error: 'Access denied' })

    const assets = await listAssets(client, shop.id)
    const { site, config } = await ensureSite(client, shop, assets)
    let deployment = await getDeployment(client, shop.id)

    await ensureDeploymentTable(client)
    if (!deployment) {
      const inserted = await client.query(
        `INSERT INTO site_deployments (site_id, shop_id, subdomain, status)
         VALUES ($1, $2, $3, 'building')
         RETURNING *`,
        [site.id, shop.id, buildDefaultSubdomain(site.slug)]
      )
      deployment = inserted.rows[0]
    } else {
      await client.query(
        `UPDATE site_deployments
         SET status = 'building', error_message = NULL, updated_at = NOW()
         WHERE shop_id = $1`,
        [shop.id]
      )
    }

    const runtime = await createShopContainer(shop.id)
    const updated = await client.query(
      `UPDATE site_deployments
       SET site_id = $1,
           container_id = $2,
           container_name = $3,
           subdomain = COALESCE(subdomain, $4),
           status = 'running',
           port = COALESCE($5, port),
           deployed_at = NOW(),
           last_build_at = NOW(),
           updated_at = NOW()
       WHERE shop_id = $6
       RETURNING *`,
      [site.id, runtime.containerId, runtime.containerName, buildDefaultSubdomain(site.slug), runtime.port, shop.id]
    )

    const nextConfig = appendVersion({
      ...config,
      meta: {
        ...config.meta,
        updatedAt: new Date().toISOString(),
      },
    }, {
      title: 'Deploy website',
      source: 'deploy',
      summary: 'Website container deployed and running.',
    })

    const renderMode = site.render_mode || 'config'
    if (renderMode !== 'codegen') {
      // Config mode: render HTML from config before deploy
      await publishWebsiteStatic({ shopId: shop.id, config: nextConfig })
    }
    // Codegen mode: index.html was already written by the last applyBundle call — no re-render needed.

    await upsertSite(client, {
      siteId: site.id,
      shopId: shop.id,
      userId: shop.user_id,
      name: `${shop.name} website`,
      slug: normalizeSlug(shop.slug),
      config: nextConfig,
      status: 'deployed',
    })

    res.json({
      ok: true,
      deployment: updated.rows[0],
      publicUrl: `https://${toText(updated.rows[0]?.subdomain, buildDefaultSubdomain(site.slug))}`,
      previewUrl: buildPreviewUrl(shop.id),
    })
  } catch (error) {
    console.error('website deploy error:', error)
    res.status(500).json({ error: error.message || 'Failed to deploy website' })
  } finally {
    client.release()
  }
})

router.get('/preview/sites/:shopId', async (req, res) => {
  const shopId = toText(req.params.shopId)
  if (!shopId) return res.status(400).send('Invalid shop id')
  const indexPath = path.join(getUploadRoot(), 'shops', shopId, 'index.html')
  try {
    await fs.access(indexPath)
    res.setHeader('Cache-Control', 'no-store')
    return res.sendFile(indexPath)
  } catch {
    return res.status(404).send('Preview not ready')
  }
})

export default router
