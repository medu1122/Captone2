import { randomUUID } from 'crypto'

const DEFAULT_TEMPLATE = 'catalog'
const DEFAULT_TONE = 'balanced'
const DEFAULT_VIEWPORT = 'desktop'
const VERSION_LIMIT = 12

const TONE_PALETTES = {
  balanced: { primary: '#0f172a', accent: '#2563eb', background: '#f8fafc', surface: '#ffffff' },
  friendly: { primary: '#14532d', accent: '#16a34a', background: '#f6fef9', surface: '#ffffff' },
  luxury: { primary: '#3f2f1d', accent: '#c28f2c', background: '#fdf8f1', surface: '#fffdf8' },
  energetic: { primary: '#7c2d12', accent: '#ea580c', background: '#fff7ed', surface: '#ffffff' },
}

function toText(value, fallback = '') {
  if (value == null) return fallback
  return String(value).trim() || fallback
}

function clip(text, max = 160) {
  const normalized = toText(text)
  if (normalized.length <= max) return normalized
  return normalized.slice(0, max - 1).trimEnd() + '…'
}

function sanitizeSlug(value) {
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

function uniqueStrings(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map((item) => String(item)).filter(Boolean)))
}

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '').trim())
}

function normalizePalette(tone, palette) {
  const base = TONE_PALETTES[tone] || TONE_PALETTES[DEFAULT_TONE]
  const custom = palette && typeof palette === 'object' ? palette : {}
  return {
    primary: isHexColor(custom.primary) ? custom.primary : base.primary,
    accent: isHexColor(custom.accent) ? custom.accent : base.accent,
    background: isHexColor(custom.background) ? custom.background : base.background,
    surface: isHexColor(custom.surface) ? custom.surface : base.surface,
  }
}

function parseProducts(products) {
  if (!Array.isArray(products)) return []
  return products.map((item, index) => {
    if (!item || typeof item !== 'object') return null
    return {
      id: String(item.id || index + 1),
      name: toText(item.name, `Product ${index + 1}`),
      price: toText(item.price),
      description: toText(item.description),
      imageUrl: toText(item.image_url),
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    }
  }).filter(Boolean)
}

function stripHtml(value) {
  return toText(value).replace(/[<>&"]/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
  })[char] || char)
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function removeVersionSnapshots(config) {
  const next = clone(config)
  next.meta = {
    ...next.meta,
    versions: [],
  }
  return next
}

function buildTemplateSections({ shop, assets, selectedAssetIds, template, idea }) {
  const products = parseProducts(shop.products)
  const selectedAssets = assets.filter((asset) => selectedAssetIds.includes(asset.id))
  const imagePool = selectedAssets.length > 0 ? selectedAssets : assets
  const heroImage = toText(
    imagePool[0]?.storage_path_or_url || shop.cover_url || shop.logo_url || products[0]?.imageUrl
  )
  const galleryUrls = uniqueStrings(
    imagePool.slice(0, 4).map((asset) => asset.storage_path_or_url).concat(products.slice(0, 2).map((item) => item.imageUrl))
  ).slice(0, 4)
  const ownerName = toText(shop.contact_info?.owner_name, shop.name)
  const contactLine = [toText(shop.contact_info?.phone), toText(shop.contact_info?.email)].filter(Boolean).join(' • ')
  const description = clip(shop.description || `Discover ${shop.name} and explore what makes this shop stand out.`)
  const objective = clip(idea || `Introduce ${shop.name} online with a clear ${tone} tone.`)
  const featureItems = products.slice(0, 3).map((product, index) => ({
    title: product.name,
    body: clip(product.description || `Key offer ${index + 1} for ${shop.name}.`, 90),
  }))
  while (featureItems.length < 3) {
    featureItems.push({
      title: ['Trusted service', 'Clear pricing', 'Fast contact'][featureItems.length],
      body: [
        `Show what customers can expect from ${shop.name}.`,
        'Highlight your offer in a short, simple way.',
        `Give customers an easy next step to reach ${ownerName}.`,
      ][featureItems.length],
    })
  }

  const heroTitle =
    template === 'story'
      ? clip(`${shop.name} brings ${toText(shop.industry, 'great experiences')} to your customers.`, 70)
      : template === 'minimal'
        ? clip(`${shop.name}, made simple.`, 60)
        : clip(`Grow ${shop.name} with a website your customers can trust.`, 70)

  const ctaBody =
    template === 'story'
      ? 'Tell your story, show your offers, and make it easy for customers to contact you.'
      : 'Keep your best offers, images, and contact details in one clear website.'

  return [
    {
      id: 'hero',
      type: 'hero',
      name: 'Hero',
      editableFields: ['eyebrow', 'title', 'subtitle', 'primaryButtonText', 'primaryButtonHref', 'secondaryButtonText', 'secondaryButtonHref', 'imageUrl'],
      props: {
        eyebrow: toText(shop.industry, 'Shop website'),
        title: heroTitle,
        subtitle: description,
        primaryButtonText: 'Contact now',
        primaryButtonHref: '#contact',
        secondaryButtonText: 'See highlights',
        secondaryButtonHref: '#highlights',
        imageUrl: heroImage,
      },
    },
    {
      id: 'highlights',
      type: 'features',
      name: 'Highlights',
      editableFields: ['title', 'items'],
      props: {
        title: template === 'minimal' ? 'Why customers choose us' : 'What your visitors should notice first',
        items: featureItems,
      },
    },
    {
      id: 'gallery',
      type: 'gallery',
      name: 'Gallery',
      editableFields: ['title', 'imageUrls'],
      props: {
        title: selectedAssetIds.length > 0 ? 'Selected visuals from your storage' : 'Featured visuals',
        imageUrls: galleryUrls,
      },
    },
    {
      id: 'cta',
      type: 'cta',
      name: 'Call to action',
      editableFields: ['title', 'body', 'buttonText', 'buttonHref'],
      props: {
        title: objective,
        body: ctaBody,
        buttonText: 'Talk to us',
        buttonHref: '#contact',
      },
    },
    {
      id: 'footer',
      type: 'footer',
      name: 'Footer',
      editableFields: ['title', 'body', 'contactLine'],
      props: {
        title: `${shop.name}`,
        body: `${toText(shop.address)} ${toText(shop.city)}`.trim(),
        contactLine,
      },
    },
  ]
}

export function createBaseWebsiteConfig({ shop, assets, selectedAssetIds, template, tone, palette, idea }) {
  const safeTemplate = ['catalog', 'story', 'minimal'].includes(template) ? template : DEFAULT_TEMPLATE
  const safeTone = ['balanced', 'friendly', 'luxury', 'energetic'].includes(tone) ? tone : DEFAULT_TONE
  const primaryAssetIds = uniqueStrings(selectedAssetIds).filter((assetId) => assets.some((asset) => asset.id === assetId))
  const fallbackAssetIds = assets.slice(0, 4).map((asset) => asset.id)
  const finalAssetIds = primaryAssetIds.length > 0 ? primaryAssetIds : fallbackAssetIds

  return {
    template: safeTemplate,
    theme: normalizePalette(safeTone, palette),
    settings: {
      tone: safeTone,
      viewport: DEFAULT_VIEWPORT,
      seoTitle: clip(`${shop.name} | ${toText(shop.industry, 'Website')}`, 60),
      seoDescription: clip(shop.description || idea || `Website for ${shop.name}`),
      objective: clip(idea || `Introduce ${shop.name} to new customers.`),
    },
    selectedAssetIds: finalAssetIds,
    sections: buildTemplateSections({
      shop,
      assets,
      selectedAssetIds: finalAssetIds,
      template: safeTemplate,
      idea,
    }),
    meta: {
      lastIdea: clip(idea || ''),
      lastPrompt: '',
      versions: [],
      updatedAt: new Date().toISOString(),
    },
  }
}

export function normalizeWebsiteConfig(rawConfig, { shop, assets }) {
  const raw = rawConfig && typeof rawConfig === 'object' ? clone(rawConfig) : {}
  const normalized = createBaseWebsiteConfig({
    shop,
    assets,
    selectedAssetIds: Array.isArray(raw.selectedAssetIds) ? raw.selectedAssetIds : [],
    template: raw.template,
    tone: raw.settings?.tone || raw.tone,
    palette: raw.theme,
    idea: raw.meta?.lastIdea || raw.settings?.objective || shop.description,
  })

  if (Array.isArray(raw.sections) && raw.sections.length > 0) {
    normalized.sections = raw.sections.map((section, index) => ({
      id: toText(section.id, `section-${index + 1}`),
      type: toText(section.type, 'content'),
      name: toText(section.name, `Section ${index + 1}`),
      editableFields: Array.isArray(section.editableFields) ? section.editableFields.map(String) : [],
      props: section.props && typeof section.props === 'object' ? section.props : {},
    }))
  }

  normalized.theme = normalizePalette(raw.settings?.tone || raw.tone || normalized.settings.tone, raw.theme)
  normalized.settings = {
    ...normalized.settings,
    ...(raw.settings && typeof raw.settings === 'object' ? raw.settings : {}),
    tone: ['balanced', 'friendly', 'luxury', 'energetic'].includes(raw.settings?.tone)
      ? raw.settings.tone
      : normalized.settings.tone,
  }
  normalized.selectedAssetIds = uniqueStrings(raw.selectedAssetIds).filter((assetId) => assets.some((asset) => asset.id === assetId))
  if (normalized.selectedAssetIds.length === 0) {
    normalized.selectedAssetIds = assets.slice(0, 4).map((asset) => asset.id)
  }
  normalized.meta = {
    lastIdea: toText(raw.meta?.lastIdea, normalized.meta.lastIdea),
    lastPrompt: toText(raw.meta?.lastPrompt),
    versions: Array.isArray(raw.meta?.versions) ? raw.meta.versions : [],
    updatedAt: raw.meta?.updatedAt || new Date().toISOString(),
  }
  return normalized
}

export function getSectionList(config) {
  return (config.sections || []).map((section) => ({
    id: section.id,
    type: section.type,
    name: section.name,
    editableFields: Array.isArray(section.editableFields) ? section.editableFields : [],
  }))
}

export function replaceSection(config, sectionId, updater) {
  let changed = false
  const nextSections = config.sections.map((section) => {
    if (section.id !== sectionId) return section
    changed = true
    return updater(section)
  })
  return { changed, config: { ...config, sections: nextSections } }
}

export function moveSection(config, sectionId, direction) {
  const index = config.sections.findIndex((section) => section.id === sectionId)
  if (index === -1) return { changed: false, config }
  const nextIndex = direction === 'up' ? index - 1 : index + 1
  if (nextIndex < 0 || nextIndex >= config.sections.length) return { changed: false, config }
  const nextSections = [...config.sections]
  const [item] = nextSections.splice(index, 1)
  nextSections.splice(nextIndex, 0, item)
  return { changed: true, config: { ...config, sections: nextSections } }
}

export function appendVersion(config, { title, source, summary }) {
  const entry = {
    id: randomUUID(),
    title: clip(title, 90),
    source: toText(source, 'system'),
    summary: clip(summary, 140),
    createdAt: new Date().toISOString(),
    snapshot: removeVersionSnapshots(config),
  }
  return {
    ...config,
    meta: {
      ...config.meta,
      versions: [entry, ...(Array.isArray(config.meta?.versions) ? config.meta.versions : [])].slice(0, VERSION_LIMIT),
      updatedAt: entry.createdAt,
    },
  }
}

export function buildHistoryItems(config, deployment) {
  const versions = Array.isArray(config.meta?.versions) ? config.meta.versions : []
  const items = versions.map((version) => ({
    id: version.id,
    type: version.source === 'deploy' ? 'deploy' : version.source === 'prompt' ? 'prompt' : 'system',
    title: version.title,
    createdAt: version.createdAt,
    summary: version.summary || '',
    restorable: true,
  }))
  if (deployment?.deployed_at) {
    items.unshift({
      id: `${deployment.shop_id}-deploy-${deployment.deployed_at}`,
      type: 'deploy',
      title: 'Deploy website',
      createdAt: deployment.deployed_at,
      summary: deployment.subdomain ? `Live at ${deployment.subdomain}` : 'Container updated',
      restorable: false,
    })
  }
  return items
}

export function buildWebsiteOverview({ site, config, deployment, promptCount, promptSuccessRate }) {
  const previewUrl = `${previewBaseUrl()}/sites/${site.shop_id}`
  const publicHost = toText(deployment?.subdomain, `${sanitizeSlug(site.slug || site.shop_slug || 'shop')}.${publicBaseDomain()}`)
  const publicUrl = `https://${publicHost}`
  const versions = Array.isArray(config.meta?.versions) ? config.meta.versions : []
  const draftStatuses = new Set(['draft', 'preview_ready', 'deployed', 'building', 'error'])
  const status = draftStatuses.has(String(site.status)) ? site.status : deployment?.status === 'running' ? 'deployed' : 'draft'
  return {
    siteId: site.id,
    slug: site.slug,
    status,
    versionCount: versions.length,
    publicUrl,
    previewUrl,
    updatedAt: config.meta?.updatedAt || site.updated_at || site.created_at || null,
    promptCount,
    promptSuccessRate,
    creditsUsed: null,
    lastPrompt: toText(config.meta?.lastPrompt) || null,
    viewsToday: null,
    views7d: null,
    mobileDesktopRatio: null,
    coreWebVitals: null,
    template: config.template,
    tone: config.settings?.tone || DEFAULT_TONE,
    selectedAssetIds: config.selectedAssetIds || [],
  }
}

export function serializeConversationContent(payload) {
  return JSON.stringify(payload)
}

export function readVersions(config) {
  return (Array.isArray(config.meta?.versions) ? config.meta.versions : []).map((version) => ({
    id: version.id,
    title: version.title,
    source: version.source,
    summary: version.summary || '',
    createdAt: version.createdAt,
  }))
}

export function restoreVersion(config, versionId) {
  const versions = Array.isArray(config.meta?.versions) ? config.meta.versions : []
  const version = versions.find((item) => item.id === versionId)
  if (!version?.snapshot) return null
  const restored = clone(version.snapshot)
  restored.meta = {
    ...restored.meta,
    versions,
    lastPrompt: `Restored: ${version.title}`,
    updatedAt: new Date().toISOString(),
  }
  return restored
}

export function summarizeSections(config) {
  return config.sections.map((section) => ({
    id: section.id,
    name: section.name,
    type: section.type,
  }))
}

export async function ensureWebsiteTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS sites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      name VARCHAR(255),
      slug VARCHAR(255) NOT NULL,
      config_json JSONB DEFAULT '{}'::jsonb,
      status VARCHAR(30) NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_shop_id_unique ON sites (shop_id)')
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_slug_unique ON sites (slug)')
  await client.query(`
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  // Keep legacy databases compatible with current website statuses.
  // Older schemas often had sites_status_check limited to draft/deployed/archived.
  await client.query(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'sites'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%status%'
      LOOP
        EXECUTE format('ALTER TABLE sites DROP CONSTRAINT IF EXISTS %I', r.conname);
      END LOOP;

      ALTER TABLE sites
      ADD CONSTRAINT sites_status_check
      CHECK (status IN ('draft', 'preview_ready', 'deployed', 'building', 'error', 'archived'));
    END $$;
  `)
}
