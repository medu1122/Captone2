/**
 * Website AI Service tests (no external test framework required).
 * Run: node scripts/testWebsiteAi.js
 *
 * Tests:
 *  1. Provider selection logic (env-based)
 *  2. OpenAI — success path (mock fetch)
 *  3. OpenAI — malformed / missing-updates JSON (mock fetch)
 *  4. OpenAI — HTTP error 429 (mock fetch)
 *  5. OpenAI — timeout (mock fetch)
 *  6. Ollama — success path (mock fetch)
 *  7. Ollama — missing base URL → skipped
 *  8. No provider configured → heuristic fallback
 *  9. page_redesign intent → requiresAi when AI unavailable
 * 10. section_edit intent → heuristic fallback applies safely
 * 11. /api/config/website-ai info (getWebsiteAiInfo)
 */

import assert from 'node:assert/strict'

// ─── helpers ──────────────────────────────────────────────────────────────────

function pass(name) { console.log(`  ✓  ${name}`) }
function fail(name, err) { console.error(`  ✗  ${name}\n     ${err.message || err}`); process.exitCode = 1 }

async function run(name, fn) {
  try {
    await fn()
    pass(name)
  } catch (err) {
    fail(name, err)
  }
}

// ─── mock helpers ─────────────────────────────────────────────────────────────

function mockFetchOnce(responseFactory) {
  const original = globalThis.fetch
  globalThis.fetch = async (...args) => {
    globalThis.fetch = original
    return responseFactory(...args)
  }
  return () => { globalThis.fetch = original }
}

function makeFetchResponse({ status = 200, body = {} }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
  }
}

// ─── minimal site config for patch tests ──────────────────────────────────────

const demoConfig = {
  meta: { updatedAt: '' },
  theme: { primary: '#000' },
  sections: [
    { id: 'hero', type: 'hero', props: { title: 'Hello', subtitle: 'World', bgColor: '#fff' } },
    { id: 'footer', type: 'footer', props: { buttonText: 'Contact' } },
  ],
}

const demoShop = { name: 'Test shop', industry: 'retail', description: 'A test shop', contact_info: '' }

// ─── test suite ───────────────────────────────────────────────────────────────

console.log('\nWebsite AI Service — unit tests\n')

// --- 1. Provider selection — openai explicit --------------------------------
await run('provider resolves to openai when WEBSITE_AI_PROVIDER=openai + key present', async () => {
  process.env.WEBSITE_AI_PROVIDER = 'openai'
  process.env.OPENAI_API_KEY = 'sk-test'
  process.env.WEBSITE_AI_BASE_URL = ''
  // Dynamic import picks up env at module-level constants only at first import.
  // We test this by calling getWebsiteAiInfo which re-reads via resolvedProvider().
  const { getWebsiteAiInfo } = await import('../services/websiteAiService.js?v=1')
  const info = getWebsiteAiInfo()
  assert.equal(info.provider, 'openai')
  assert.equal(info.configured, true)
})

// --- 2. Provider selection — auto with key ----------------------------------
await run('provider resolves to openai in auto mode when OPENAI_API_KEY is present', async () => {
  process.env.WEBSITE_AI_PROVIDER = 'auto'
  process.env.OPENAI_API_KEY = 'sk-test-auto'
  const { getWebsiteAiInfo } = await import('../services/websiteAiService.js?v=2')
  const info = getWebsiteAiInfo()
  assert.equal(info.provider, 'openai')
})

// --- 3. OpenAI success path -------------------------------------------------
await run('buildPromptPatch returns source:ai when OpenAI responds with valid updates', async () => {
  process.env.WEBSITE_AI_PROVIDER = 'openai'
  process.env.OPENAI_API_KEY = 'sk-test'
  process.env.WEBSITE_AI_MODEL = 'gpt-4o-mini'

  const aiResponse = {
    choices: [{
      message: {
        content: JSON.stringify({
          summary: 'Hero updated',
          affectedSections: ['hero'],
          updates: {
            theme: {},
            sections: [{ id: 'hero', action: 'update', props: { title: 'New Title', subtitle: 'New Sub' } }],
          },
        }),
      },
    }],
  }
  mockFetchOnce(() => makeFetchResponse({ body: aiResponse }))

  const { buildPromptPatch } = await import('../services/websiteAiService.js?v=3')
  const patch = await buildPromptPatch({
    prompt: 'make the hero bolder',
    scope: 'selected',
    sectionId: 'hero',
    config: demoConfig,
    shop: demoShop,
    assets: [],
    creativity: 'balanced',
  })

  assert.equal(patch.source, 'ai')
  assert.ok(patch.updates?.sections?.length > 0, 'should have section updates')
  assert.equal(patch.provider, 'openai')
})

// --- 4. OpenAI — missing updates in JSON ------------------------------------
await run('falls back to heuristic when OpenAI returns JSON without updates field', async () => {
  process.env.WEBSITE_AI_PROVIDER = 'openai'
  process.env.OPENAI_API_KEY = 'sk-test'

  const badAiResponse = {
    choices: [{ message: { content: JSON.stringify({ summary: 'oops', note: 'forgot updates' }) } }],
  }
  mockFetchOnce(() => makeFetchResponse({ body: badAiResponse }))

  const { buildPromptPatch } = await import('../services/websiteAiService.js?v=4')
  const patch = await buildPromptPatch({
    prompt: 'cambiar color a blue',
    scope: 'selected',
    sectionId: 'hero',
    config: demoConfig,
    shop: demoShop,
    assets: [],
    creativity: 'safe',
  })

  assert.equal(patch.source, 'fallback', 'should fall back when AI returns no updates')
})

// --- 5. OpenAI — HTTP 429 ---------------------------------------------------
await run('buildPromptPatch does not crash on OpenAI HTTP 429', async () => {
  process.env.WEBSITE_AI_PROVIDER = 'openai'
  process.env.OPENAI_API_KEY = 'sk-test'

  mockFetchOnce(() => makeFetchResponse({
    status: 429,
    body: { error: { message: 'Rate limit exceeded' } },
  }))

  const { buildPromptPatch } = await import('../services/websiteAiService.js?v=5')
  const patch = await buildPromptPatch({
    prompt: 'sửa nút CTA',
    scope: 'selected',
    sectionId: 'footer',
    config: demoConfig,
    shop: demoShop,
    assets: [],
    creativity: 'balanced',
  })

  // Should not throw; falls back to heuristic
  assert.ok(['fallback', 'ai'].includes(patch.source))
})

// --- 6. OpenAI — network error ---------------------------------------------
await run('buildPromptPatch does not crash on OpenAI network error', async () => {
  process.env.WEBSITE_AI_PROVIDER = 'openai'
  process.env.OPENAI_API_KEY = 'sk-test'

  mockFetchOnce(() => { throw new Error('ECONNREFUSED') })

  const { buildPromptPatch } = await import('../services/websiteAiService.js?v=6')
  const patch = await buildPromptPatch({
    prompt: 'thêm testimonial',
    scope: 'selected',
    sectionId: 'hero',
    config: demoConfig,
    shop: demoShop,
    assets: [],
    creativity: 'creative',
  })

  assert.equal(patch.source, 'fallback')
})

// --- 7. Ollama — success path -----------------------------------------------
await run('buildPromptPatch uses Ollama when provider=ollama', async () => {
  process.env.WEBSITE_AI_PROVIDER = 'ollama'
  process.env.WEBSITE_AI_BASE_URL = 'http://localhost:11434'
  process.env.OPENAI_API_KEY = ''

  const ollamaBody = {
    response: JSON.stringify({
      summary: 'Ollama patch',
      affectedSections: ['hero'],
      updates: {
        theme: {},
        sections: [{ id: 'hero', action: 'update', props: { title: 'Ollama Title' } }],
      },
    }),
  }
  mockFetchOnce(() => makeFetchResponse({ body: ollamaBody }))

  const { buildPromptPatch } = await import('../services/websiteAiService.js?v=7')
  const patch = await buildPromptPatch({
    prompt: 'sửa tiêu đề hero',
    scope: 'selected',
    sectionId: 'hero',
    config: demoConfig,
    shop: demoShop,
    assets: [],
    creativity: 'balanced',
  })

  assert.equal(patch.source, 'ai')
  assert.equal(patch.provider, 'ollama')
})

// --- 8. No provider → page_redesign → requiresAi ----------------------------
await run('requiresAi=true for page_redesign when no AI configured', async () => {
  process.env.WEBSITE_AI_PROVIDER = 'ollama'
  process.env.WEBSITE_AI_BASE_URL = ''
  process.env.MARKETING_AI_BASE_URL = ''
  process.env.OPENAI_API_KEY = ''

  const { buildPromptPatch } = await import('../services/websiteAiService.js?v=8')
  const patch = await buildPromptPatch({
    prompt: 'xoá và làm lại giao diện này cho t',
    scope: 'all',
    sectionId: null,
    config: demoConfig,
    shop: demoShop,
    assets: [],
    creativity: 'creative',
  })

  assert.equal(patch.requiresAi, true, 'broad redesign without AI should set requiresAi')
  assert.equal(patch.source, 'fallback')
  assert.equal(patch.updates.sections.length, 0, 'should not write any sections')
})

// --- 9. No provider → section_edit → safe heuristic -------------------------
await run('heuristic does not paste raw prompt into section text fields', async () => {
  process.env.WEBSITE_AI_PROVIDER = 'ollama'
  process.env.WEBSITE_AI_BASE_URL = ''
  process.env.OPENAI_API_KEY = ''

  const { buildPromptPatch } = await import('../services/websiteAiService.js?v=9')
  const rawPrompt = 'change button to blue CTA'
  const patch = await buildPromptPatch({
    prompt: rawPrompt,
    scope: 'selected',
    sectionId: 'footer',
    config: demoConfig,
    shop: demoShop,
    assets: [],
    creativity: 'safe',
  })

  // Footer section has buttonText; verify it is NOT set to the raw prompt text
  const footerUpdate = patch.updates?.sections?.find(s => s.id === 'footer')
  if (footerUpdate) {
    assert.notEqual(footerUpdate.props?.buttonText, rawPrompt, 'buttonText must not be the raw prompt')
    assert.notEqual(footerUpdate.props?.subtitle, rawPrompt, 'subtitle must not be the raw prompt')
    assert.notEqual(footerUpdate.props?.body, rawPrompt, 'body must not be the raw prompt')
  }
  assert.equal(patch.source, 'fallback')
})

// --- 10. classifyIntent — broad patterns ------------------------------------
await run('classifyIntent correctly identifies broad redesign prompts', async () => {
  const { buildPromptPatch } = await import('../services/websiteAiService.js?v=10')

  process.env.WEBSITE_AI_PROVIDER = 'ollama'
  process.env.WEBSITE_AI_BASE_URL = ''
  process.env.OPENAI_API_KEY = ''

  const broadPrompts = [
    'xoá và làm lại giao diện này',
    'redesign the whole page',
    'rebuild from scratch',
    'làm lại giao diện',
    'thiết kế lại toàn bộ',
  ]

  for (const p of broadPrompts) {
    const patch = await buildPromptPatch({
      prompt: p, scope: 'all', sectionId: null,
      config: demoConfig, shop: demoShop, assets: [], creativity: 'balanced',
    })
    assert.equal(patch.requiresAi, true, `Expected requiresAi for broad prompt: "${p}"`)
  }
})

// --- 11. getWebsiteAiInfo visibility ----------------------------------------
await run('getWebsiteAiInfo exposes provider+model without leaking key', async () => {
  process.env.WEBSITE_AI_PROVIDER = 'openai'
  process.env.OPENAI_API_KEY = 'sk-secret'
  process.env.WEBSITE_AI_MODEL = 'gpt-4o-mini'

  const { getWebsiteAiInfo } = await import('../services/websiteAiService.js?v=11')
  const info = getWebsiteAiInfo()

  assert.equal(info.configured, true)
  assert.equal(info.provider, 'openai')
  assert.equal(info.model, 'gpt-4o-mini')
  assert.ok(!('key' in info), 'must not expose key')
  assert.ok(!('apiKey' in info), 'must not expose apiKey')
  assert.ok(info.timeoutMs > 0)
})

console.log('\nDone.\n')
