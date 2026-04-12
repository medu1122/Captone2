/**
 * Live smoke test for Website AI endpoints.
 *
 * Usage (requires running backend):
 *   AIMAP_TOKEN=<jwt> SHOP_ID=<uuid> node scripts/smokeWebsiteAi.js
 *
 * Optional:
 *   BASE_URL=http://localhost:4000   (default http://localhost:4000)
 */

const BASE = (process.env.BASE_URL || 'http://localhost:4000').replace(/\/$/, '')
const TOKEN = process.env.AIMAP_TOKEN || ''
const SHOP_ID = process.env.SHOP_ID || ''

function pass(name) { console.log(`  ✓  ${name}`) }
function fail(name, detail) { console.error(`  ✗  ${name}\n     ${detail}`); process.exitCode = 1 }

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, ok: res.ok, data }
}

console.log(`\nWebsite AI smoke tests  →  ${BASE}\n`)

// 1. /api/config/website-ai --------------------------------------------------
try {
  const { status, data } = await req('GET', '/api/config/website-ai')
  if (status === 200 && typeof data.configured === 'boolean') {
    pass(`GET /api/config/website-ai → provider=${data.provider}, configured=${data.configured}, model=${data.model}`)
  } else {
    fail('GET /api/config/website-ai', `status=${status}, body=${JSON.stringify(data)}`)
  }
} catch (e) {
  fail('GET /api/config/website-ai', e.message)
}

if (!TOKEN || !SHOP_ID) {
  console.warn('\nSkipping authenticated tests — set AIMAP_TOKEN and SHOP_ID to run them.\n')
  process.exit(0)
}

// 2. prompt/preview — section edit ------------------------------------------
try {
  const { status, data } = await req('POST', `/api/shops/${SHOP_ID}/website/prompt/preview`, {
    prompt: 'make the hero headline more impactful',
    scope: 'selected',
    sectionId: 'hero',
    creativity: 'balanced',
  })
  if (status === 200 && data.draftConfig) {
    pass('POST prompt/preview — section edit → draftConfig returned')
  } else if (status === 422 && data.requiresAi) {
    pass('POST prompt/preview — section edit → AI unavailable, requiresAi=true (expected if no AI provider)')
  } else {
    fail('POST prompt/preview — section edit', `status=${status}, body=${JSON.stringify(data).slice(0, 300)}`)
  }
} catch (e) {
  fail('POST prompt/preview — section edit', e.message)
}

// 3. prompt/preview — broad redesign -----------------------------------------
try {
  const { status, data } = await req('POST', `/api/shops/${SHOP_ID}/website/prompt/preview`, {
    prompt: 'xoá và làm lại giao diện này cho t',
    scope: 'all',
    sectionId: null,
    creativity: 'creative',
  })
  if (status === 200 && data.draftConfig) {
    pass('POST prompt/preview — broad redesign → AI returned draftConfig')
  } else if (status === 422 && data.requiresAi) {
    pass('POST prompt/preview — broad redesign → requiresAi=true (expected without AI provider)')
  } else {
    fail('POST prompt/preview — broad redesign', `status=${status}, body=${JSON.stringify(data).slice(0, 300)}`)
  }
} catch (e) {
  fail('POST prompt/preview — broad redesign', e.message)
}

// 4. prompt/apply — section edit ---------------------------------------------
try {
  const { status, data } = await req('POST', `/api/shops/${SHOP_ID}/website/prompt/apply`, {
    prompt: 'make the CTA button say "Shop Now"',
    scope: 'selected',
    sectionId: 'hero',
    creativity: 'balanced',
  })
  if (status === 200 && data.ok) {
    pass('POST prompt/apply — section edit → ok=true, config saved')
  } else if (status === 422 && data.requiresAi) {
    pass('POST prompt/apply — section edit → requiresAi=true (fallback, AI unavailable)')
  } else {
    fail('POST prompt/apply — section edit', `status=${status}, body=${JSON.stringify(data).slice(0, 300)}`)
  }
} catch (e) {
  fail('POST prompt/apply — section edit', e.message)
}

// 5. prompt/apply — broad redesign -------------------------------------------
try {
  const { status, data } = await req('POST', `/api/shops/${SHOP_ID}/website/prompt/apply`, {
    prompt: 'redesign the whole page to look more modern',
    scope: 'all',
    sectionId: null,
    creativity: 'creative',
  })
  if (status === 200 && data.ok) {
    pass('POST prompt/apply — broad redesign → AI succeeded, config saved')
  } else if (status === 422 && data.requiresAi) {
    pass('POST prompt/apply — broad redesign → requiresAi=true (AI unavailable, nothing written to site)')
  } else {
    fail('POST prompt/apply — broad redesign', `status=${status}, body=${JSON.stringify(data).slice(0, 300)}`)
  }
} catch (e) {
  fail('POST prompt/apply — broad redesign', e.message)
}

console.log('\nDone.\n')
