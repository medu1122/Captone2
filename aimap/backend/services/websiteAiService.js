/**
 * WEBSITE AI ASSIST — ưu tiên model local/Ollama; lỗi thì fallback heuristic.
 * Env mới:
 * - WEBSITE_AI_BASE_URL (fallback MARKETING_AI_BASE_URL)
 * - WEBSITE_AI_MODEL (fallback MARKETING_AI_MODEL hoặc qwen2.5:7b)
 * - WEBSITE_AI_TIMEOUT_MS (fallback MARKETING_AI_TIMEOUT_MS)
 */

const DEFAULT_MODEL = process.env.WEBSITE_AI_MODEL || process.env.MARKETING_AI_MODEL || 'qwen2.5:7b'
const TIMEOUT_MS = Math.min(
  120000,
  Math.max(5000, parseInt(process.env.WEBSITE_AI_TIMEOUT_MS || process.env.MARKETING_AI_TIMEOUT_MS || '45000', 10))
)

function toText(value, fallback = '') {
  if (value == null) return fallback
  return String(value).trim() || fallback
}

function clip(value, max = 140) {
  const text = toText(value)
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + '…'
}

function safeJsonParse(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

async function ollamaGenerateJson(prompt) {
  const base = (process.env.WEBSITE_AI_BASE_URL || process.env.MARKETING_AI_BASE_URL || '').trim().replace(/\/$/, '')
  if (!base) return { skipped: true, data: null }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt,
        stream: false,
        format: 'json',
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { skipped: false, data: null, error: data?.error || res.statusText }
    }
    return { skipped: false, data: safeJsonParse(data?.response || '') }
  } catch (error) {
    return { skipped: false, data: null, error: error instanceof Error ? error.message : 'AI request failed' }
  } finally {
    clearTimeout(timer)
  }
}

function colorFromPrompt(prompt) {
  const text = prompt.toLowerCase()
  if (text.includes('blue') || text.includes('xanh dương')) return '#2563eb'
  if (text.includes('green') || text.includes('xanh lá')) return '#16a34a'
  if (text.includes('orange') || text.includes('cam')) return '#ea580c'
  if (text.includes('purple') || text.includes('tím')) return '#7c3aed'
  if (text.includes('gold') || text.includes('vàng')) return '#c28f2c'
  if (text.includes('red') || text.includes('đỏ')) return '#dc2626'
  return null
}

/**
 * Classify the user's intent:
 * - 'page_redesign': broad request to overhaul or redo the whole page.
 * - 'section_edit': targeted edit on a specific section or element.
 */
function classifyIntent(prompt) {
  const text = prompt.toLowerCase()
  const broadPatterns = [
    'xoá', 'xóa', 'làm lại', 'thiết kế lại', 'tạo lại', 'xây lại',
    'redesign', 'rebuild', 'redo', 'start over', 'from scratch', 'overhaul',
    'new design', 'toàn bộ', 'toàn trang', 'từ đầu', 'bắt đầu lại',
    'thay đổi toàn', 'thay toàn bộ', 'làm mới toàn', 'làm lại giao diện',
  ]
  const isBroad = broadPatterns.some((k) => text.includes(k))
  return isBroad ? 'page_redesign' : 'section_edit'
}

function heuristicPromptPatch({ prompt, scope, sectionId, config, intent }) {
  const text = prompt.toLowerCase()
  const resolvedIntent = intent || classifyIntent(prompt)
  const affectedSections = []
  const updates = { theme: {}, sections: [] }

  // For broad redesigns we cannot safely generate content without AI.
  // Return a no-op with a clear message instead of pasting the raw prompt into the page.
  if (resolvedIntent === 'page_redesign' || scope === 'all') {
    return {
      summary: 'Broad redesign requires AI. No content changes were made.',
      affectedSections: [],
      updates: { theme: {}, sections: [] },
      source: 'fallback',
      requiresAi: true,
    }
  }

  const primary = colorFromPrompt(prompt)
  if (primary) {
    updates.theme.primary = primary
    affectedSections.push('theme')
  }

  if (text.includes('testimonial') || text.includes('review') || text.includes('đánh giá')) {
    updates.sections.push({
      id: 'testimonials',
      type: 'testimonials',
      name: 'Testimonials',
      action: 'append',
      editableFields: ['title', 'items'],
      props: {
        title: 'Customer feedback',
        items: [
          { quote: 'Customers can quickly see why this shop is trusted.', author: 'Happy customer' },
          { quote: 'Add real quotes later to make this section stronger.', author: 'Your next review' },
        ],
      },
    })
    affectedSections.push('testimonials')
  }

  const targetSectionId = sectionId
    || (text.includes('hero') ? 'hero'
      : text.includes('footer') || text.includes('contact') ? 'footer'
        : text.includes('gallery') || text.includes('image') ? 'gallery'
          : 'hero')

  const selected = config.sections.find((section) => section.id === targetSectionId)
  if (selected) {
    const props = { ...(selected.props || {}) }
    // Only update structural/interactive props — never paste the raw prompt into text fields.
    if (primary && 'bgColor' in props) props.bgColor = primary
    if ('primaryButtonText' in props && (text.includes('cta') || text.includes('button'))) {
      props.primaryButtonText = 'Get in touch'
    }
    if ('buttonText' in props && (text.includes('cta') || text.includes('button'))) {
      props.buttonText = 'Get in touch'
    }
    updates.sections.push({
      id: targetSectionId,
      action: 'update',
      props,
    })
    affectedSections.push(targetSectionId)
  }

  return {
    summary: clip(`Updated ${affectedSections.join(', ') || 'selected section'} from prompt.`),
    affectedSections: Array.from(new Set(affectedSections)),
    updates,
    source: 'fallback',
  }
}

function buildAiPromptText({ promptText, scope, sectionId, intent, config, shop, assets, creativity }) {
  const isRedesign = intent === 'page_redesign'

  const instructions = isRedesign
    ? `You are a website redesign assistant. The user wants to completely overhaul or redo the page.
- Regenerate meaningful content for the hero, features, and at least one other section.
- Update the theme primary color if appropriate.
- Keep the same section IDs but replace their props with fresh, relevant content based on the shop context.
- Do NOT copy the user's request text into any content field.
- Reply ONLY with the JSON shape below.`
    : `You are an assistant for a website builder.
- Respect the user's scope. If scope is "selected", update ONLY the section with id "${sectionId}".
- Keep the site structure stable and do not add new sections unless explicitly asked.
- Do NOT copy the user's request text into content fields — generate real content.
- Reply ONLY with the JSON shape below.`

  return `${instructions}

JSON shape:
{
  "summary": "short summary of what changed",
  "affectedSections": ["hero"],
  "updates": {
    "theme": { "primary": "#2563eb" },
    "sections": [
      {
        "id": "hero",
        "action": "update",
        "props": {
          "title": "New title",
          "subtitle": "New subtitle"
        }
      }
    ]
  }
}

Shop context:
${JSON.stringify({ name: shop.name, industry: shop.industry, description: shop.description, contact: shop.contact_info })}

Assets:
${JSON.stringify(
    (Array.isArray(assets) ? assets : []).slice(0, 6).map((a) => ({ id: a.id, type: a.type, name: a.name, url: a.storage_path_or_url }))
  )}

Current page config:
${JSON.stringify(config)}

User request:
${JSON.stringify({ prompt: promptText, scope, sectionId, creativity, intent })}`.trim()
}

export async function buildPromptPatch({ prompt, scope, sectionId, config, shop, assets, creativity }) {
  const promptText = toText(prompt)
  const intent = classifyIntent(promptText)

  // For broad redesign prompts, always treat scope as 'all' regardless of what the frontend sent.
  const effectiveScope = intent === 'page_redesign' ? 'all' : (scope || 'all')
  const effectiveSectionId = effectiveScope === 'all' ? null : sectionId

  const aiPrompt = buildAiPromptText({
    promptText,
    scope: effectiveScope,
    sectionId: effectiveSectionId,
    intent,
    config,
    shop,
    assets,
    creativity,
  })

  const ai = await ollamaGenerateJson(aiPrompt)
  if (ai.data?.updates) {
    return {
      summary: clip(ai.data.summary || 'Prompt patch generated.'),
      affectedSections: Array.isArray(ai.data.affectedSections) ? ai.data.affectedSections.map(String) : [],
      updates: ai.data.updates,
      source: 'ai',
      intent,
    }
  }

  return heuristicPromptPatch({ prompt: promptText, scope: effectiveScope, sectionId: effectiveSectionId, config, intent })
}
