/**
 * Website Codegen Service
 *
 * Uses AI to generate a complete standalone HTML website instead of patching config.
 * This enables broad redesign prompts to produce visually distinct results.
 *
 * Storage layout (relative to ASSET_STORAGE_PATH):
 *   shops/:shopId/index.html           — current live site (config or codegen)
 *   shops/:shopId/.bundles/:vid.html   — versioned codegen snapshots
 */

import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { getUploadRoot } from './assetStorage.js'
import { callWebsiteAi } from './websiteAiService.js'

// ---------- prompt builders --------------------------------------------------

function buildFullRedesignPrompt({ prompt, shop, assets, creativity }) {
  const assetList = (Array.isArray(assets) ? assets : [])
    .slice(0, 8)
    .map((a) => ({ name: String(a.name || ''), url: String(a.storage_path_or_url || ''), type: String(a.type || 'image') }))

  const shopInfo = {
    name: shop.name,
    industry: shop.industry,
    description: shop.description,
    contact: shop.contact_info,
  }

  return `You are a professional web designer. Create a complete, modern, beautiful website for the shop below.

Respond with a JSON object containing ONLY these fields:
{
  "title": "Page <title> text",
  "description": "Meta description sentence",
  "summary": "What you built — 1-2 sentences for the user",
  "html": "<!doctype html>..."
}

Rules for the html field:
- Must be a complete valid HTML5 document (<!doctype html> ... </html>)
- All CSS must be embedded inside a <style> tag in <head> — no external stylesheets
- Optional: minimal inline JS in a <script> tag at bottom of <body>
- Responsive and mobile-friendly
- Modern design: clean typography, good spacing, clear hierarchy
- Use the shop's brand identity and describe the actual business
- Embed the asset image URLs directly in img src attributes (use the url values from Assets)
- The website must look visually distinct from a basic template
- Do NOT add any placeholder text like "Lorem ipsum"

Creativity level: ${creativity || 'balanced'}

Shop context:
${JSON.stringify(shopInfo)}

Available assets (use these image URLs directly):
${JSON.stringify(assetList)}

User request: "${prompt}"`.trim()
}

function buildEditBundlePrompt({ prompt, currentHtml, shop, assets, sectionId, creativity }) {
  const assetList = (Array.isArray(assets) ? assets : [])
    .slice(0, 8)
    .map((a) => ({ name: String(a.name || ''), url: String(a.storage_path_or_url || ''), type: String(a.type || 'image') }))

  const htmlSnippet = currentHtml
    ? (currentHtml.length > 6000 ? currentHtml.slice(0, 6000) + '\n<!-- ...truncated -->' : currentHtml)
    : '<!-- no current html -->'

  return `You are a professional web designer editing an existing website.

Respond with a JSON object containing ONLY these fields:
{
  "title": "Page <title> text",
  "description": "Meta description sentence",
  "summary": "What you changed — 1-2 sentences for the user",
  "html": "<!doctype html>..."
}

Rules:
- Return the COMPLETE updated HTML document (not just a diff or fragment)
- All CSS must remain embedded in <style> tag — no external stylesheets
- Only change what the user requested${sectionId ? ` (focus on the "${sectionId}" section)` : ''}
- Keep all other parts of the site intact
- Return valid HTML5

Creativity level: ${creativity || 'balanced'}

Shop context:
${JSON.stringify({ name: shop.name, industry: shop.industry })}

Available assets:
${JSON.stringify(assetList)}

Current HTML of the site:
${htmlSnippet}

User request: "${prompt}"`.trim()
}

// ---------- validation -------------------------------------------------------

function validateBundle(data) {
  if (!data || typeof data !== 'object') return 'AI did not return a JSON object'
  const html = data.html
  if (!html || typeof html !== 'string') return 'AI response is missing the html field'
  const lower = html.toLowerCase().trim()
  if (!lower.startsWith('<!doctype html') && !lower.startsWith('<html')) {
    return 'html field does not appear to be a valid HTML document'
  }
  if (!lower.includes('</html>')) return 'html field appears to be truncated (missing </html>)'
  if (html.length < 400) return 'html field is too short to be a real website'
  return null
}

// ---------- file I/O ---------------------------------------------------------

export async function readCurrentBundleHtml(shopId) {
  const indexPath = path.join(getUploadRoot(), 'shops', String(shopId), 'index.html')
  try {
    const html = await fs.readFile(indexPath, 'utf8')
    return { html, found: true }
  } catch {
    return { html: null, found: false }
  }
}

export async function writeLiveBundle(shopId, html) {
  const shopDir = path.join(getUploadRoot(), 'shops', String(shopId))
  await fs.mkdir(shopDir, { recursive: true })
  const indexPath = path.join(shopDir, 'index.html')
  await fs.writeFile(indexPath, html, 'utf8')
  return indexPath
}

export async function writeBundleSnapshot(shopId, versionId, html) {
  const dir = path.join(getUploadRoot(), 'shops', String(shopId), '.bundles')
  await fs.mkdir(dir, { recursive: true })
  const snapshotPath = path.join(dir, `${versionId}.html`)
  await fs.writeFile(snapshotPath, html, 'utf8')
  return snapshotPath
}

export async function readBundleSnapshot(shopId, versionId) {
  const snapshotPath = path.join(
    getUploadRoot(), 'shops', String(shopId), '.bundles', `${versionId}.html`
  )
  try {
    const html = await fs.readFile(snapshotPath, 'utf8')
    return { html, found: true }
  } catch {
    return { html: null, found: false }
  }
}

// ---------- core API ---------------------------------------------------------

/**
 * Generate a full-page redesign via AI.
 *
 * @param {{ prompt, shop, assets, creativity, callAi? }} params
 *   callAi — injectable for testing (default: callWebsiteAi from websiteAiService)
 * @returns {{ ok, html, title, description, summary, provider, error?, requiresAi? }}
 */
export async function generateFullRedesign({ prompt, shop, assets, creativity, callAi = callWebsiteAi }) {
  const systemPrompt = buildFullRedesignPrompt({ prompt, shop, assets, creativity })
  const result = await callAi(systemPrompt)

  if (!result.data) {
    return {
      ok: false,
      requiresAi: true,
      error: result.error || 'AI did not return data. Check provider configuration.',
      provider: result.provider,
    }
  }

  const validationError = validateBundle(result.data)
  if (validationError) {
    return {
      ok: false,
      requiresAi: false,
      error: `AI returned unusable output: ${validationError}`,
      provider: result.provider,
    }
  }

  return {
    ok: true,
    html: result.data.html,
    title: String(result.data.title || shop.name || 'Shop website'),
    description: String(result.data.description || ''),
    summary: String(result.data.summary || 'Website redesigned by AI.'),
    provider: result.provider,
  }
}

/**
 * Edit an existing codegen bundle via AI (targeted or broad edit).
 *
 * @param {{ prompt, shop, assets, currentHtml, sectionId, creativity, callAi? }} params
 * @returns {{ ok, html, title, description, summary, provider, error?, requiresAi? }}
 */
export async function editBundle({ prompt, shop, assets, currentHtml, sectionId, creativity, callAi = callWebsiteAi }) {
  const systemPrompt = buildEditBundlePrompt({ prompt, shop, assets, currentHtml, sectionId, creativity })
  const result = await callAi(systemPrompt)

  if (!result.data) {
    return {
      ok: false,
      requiresAi: true,
      error: result.error || 'AI did not return data. Check provider configuration.',
      provider: result.provider,
    }
  }

  const validationError = validateBundle(result.data)
  if (validationError) {
    return {
      ok: false,
      requiresAi: false,
      error: `AI returned unusable output: ${validationError}`,
      provider: result.provider,
    }
  }

  return {
    ok: true,
    html: result.data.html,
    title: String(result.data.title || shop.name || 'Shop website'),
    description: String(result.data.description || ''),
    summary: String(result.data.summary || 'Website updated by AI.'),
    provider: result.provider,
  }
}

/**
 * Restore a codegen bundle version to the live index.html.
 *
 * @param {{ shopId, versionId }} params
 * @returns {{ ok, html, error? }}
 */
export async function restoreBundleVersion({ shopId, versionId }) {
  const { html, found } = await readBundleSnapshot(shopId, versionId)
  if (!found || !html) {
    return { ok: false, error: `Bundle snapshot for version ${versionId} not found.` }
  }
  await writeLiveBundle(shopId, html)
  return { ok: true, html }
}

/**
 * Save a new bundle (apply): write live file + version snapshot.
 *
 * @param {{ shopId, html }} params
 * @returns {{ versionId, indexPath, snapshotPath }}
 */
export async function applyBundle({ shopId, html }) {
  const versionId = randomUUID()
  const indexPath = await writeLiveBundle(shopId, html)
  const snapshotPath = await writeBundleSnapshot(shopId, versionId, html)
  return { versionId, indexPath, snapshotPath }
}
