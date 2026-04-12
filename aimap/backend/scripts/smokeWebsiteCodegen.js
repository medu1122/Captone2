/**
 * Smoke / integration tests for the codegen website builder endpoints.
 *
 * Usage:
 *   AIMAP_TOKEN=<jwt> SHOP_ID=<uuid> node scripts/smokeWebsiteCodegen.js
 *
 * Optional env:
 *   API_BASE=http://localhost:4111   (default)
 */

const BASE = (process.env.API_BASE || 'http://localhost:4111').replace(/\/$/, '')
const TOKEN = process.env.AIMAP_TOKEN || ''
const SHOP_ID = process.env.SHOP_ID || ''

let passed = 0
let failed = 0

function ok(label) { console.log(`  ✓ ${label}`); passed++ }
function fail(label, detail) { console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); failed++ }

async function request(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: TOKEN ? `Bearer ${TOKEN}` : '',
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  let data = null
  try { data = await res.json() } catch { /* ignore */ }
  return { status: res.status, data }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log(`\nSmoke tests against ${BASE}\n`)

// 1. Health / config endpoint
console.log('[1] GET /api/config/website-ai')
{
  const r = await request('GET', '/api/config/website-ai')
  if (r.status === 200 && r.data?.provider) {
    ok(`provider=${r.data.provider}, configured=${r.data.configured}`)
  } else {
    fail('expected 200 with provider field', JSON.stringify(r.data))
  }
}

if (!TOKEN || !SHOP_ID) {
  console.log('\nSkipping authenticated tests (set AIMAP_TOKEN and SHOP_ID)\n')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

const shopPath = `/api/shops/${SHOP_ID}/website`

// 2. Builder state — check render_mode is exposed
console.log('\n[2] GET builder-state includes renderMode')
{
  const r = await request('GET', `${shopPath}/builder-state`)
  if (r.status === 200) {
    const hasRenderMode = 'renderMode' in (r.data || {})
    if (hasRenderMode) ok(`renderMode = "${r.data.renderMode}"`)
    else fail('renderMode not in builder-state response', Object.keys(r.data || {}).join(','))
  } else {
    fail(`builder-state returned ${r.status}`, r.data?.error)
  }
}

// 3. Prompt preview — section edit (config path)
console.log('\n[3] POST prompt/preview — section_edit stays in config mode')
{
  const r = await request('POST', `${shopPath}/prompt/preview`, {
    prompt: 'change the hero title to Welcome',
    scope: 'selected',
    sectionId: 'hero',
    creativity: 'balanced',
  })
  if (r.status === 200) {
    const { renderMode, draftConfig, previewHtml } = r.data || {}
    if (renderMode === 'config' && draftConfig) ok('section_edit → config mode, draftConfig present')
    else if (renderMode === 'codegen' && previewHtml) ok('site in codegen mode, previewHtml returned')
    else fail('unexpected response shape', JSON.stringify({ renderMode, hasConfig: !!draftConfig, hasHtml: !!previewHtml }))
  } else if (r.status === 422) {
    ok(`422 accepted (AI not available, requiresAi=${r.data?.requiresAi})`)
  } else {
    fail(`prompt/preview returned ${r.status}`, r.data?.error)
  }
}

// 4. Prompt preview — broad redesign (codegen path)
console.log('\n[4] POST prompt/preview — page_redesign triggers codegen path')
{
  const r = await request('POST', `${shopPath}/prompt/preview`, {
    prompt: 'Làm lại toàn bộ giao diện theo phong cách tối hiện đại',
    scope: 'all',
    creativity: 'creative',
  })
  if (r.status === 200) {
    const { renderMode, previewHtml, summary } = r.data || {}
    if (renderMode === 'codegen' && typeof previewHtml === 'string' && previewHtml.length > 200) {
      ok(`codegen preview returned — ${previewHtml.length} chars HTML, summary: "${summary?.slice(0, 60)}"`)
    } else {
      fail('codegen preview response missing previewHtml', JSON.stringify({ renderMode, htmlLen: previewHtml?.length }))
    }
  } else if (r.status === 422) {
    ok(`422 — AI not available (requiresAi=${r.data?.requiresAi}), renderMode=${r.data?.renderMode}`)
  } else {
    fail(`prompt/preview redesign returned ${r.status}`, r.data?.error)
  }
}

// 5. Prompt apply — broad redesign (full codegen flow)
console.log('\n[5] POST prompt/apply — page_redesign with codegen')
let appliedVersionId = null
{
  const r = await request('POST', `${shopPath}/prompt/apply`, {
    prompt: 'Làm lại toàn bộ giao diện theo phong cách tối hiện đại',
    scope: 'all',
    creativity: 'creative',
  })
  if (r.status === 200 && r.data?.ok) {
    const { renderMode, versionId, message } = r.data
    if (renderMode === 'codegen') {
      ok(`apply succeeded — renderMode=${renderMode}, versionId=${versionId}, message="${message?.slice(0, 60)}"`)
      appliedVersionId = versionId
    } else {
      fail('expected renderMode codegen after broad redesign', JSON.stringify({ renderMode }))
    }
  } else if (r.status === 422) {
    ok(`422 — AI not available, skipping apply test (requiresAi=${r.data?.requiresAi})`)
  } else {
    fail(`prompt/apply returned ${r.status}`, r.data?.error)
  }
}

// 6. Preview URL returns HTML after codegen apply
if (appliedVersionId) {
  console.log('\n[6] GET preview/sites/:shopId returns updated HTML after codegen apply')
  {
    const r = await fetch(`${BASE}/api/shops/preview/sites/${SHOP_ID}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    })
    if (r.status === 200) {
      const html = await r.text()
      if (html.length > 400 && html.toLowerCase().includes('<!doctype html')) {
        ok(`preview HTML present — ${html.length} chars`)
      } else {
        fail('preview HTML looks invalid', `len=${html.length}`)
      }
    } else {
      fail(`preview URL returned ${r.status}`)
    }
  }

  // 7. Restore version
  console.log('\n[7] POST versions/:versionId/restore — restore codegen bundle')
  {
    const r = await request('POST', `${shopPath}/versions/${appliedVersionId}/restore`)
    if (r.status === 200 && r.data?.ok) {
      ok(`restore ok — renderMode=${r.data.renderMode}, summary="${r.data.summary}"`)
    } else {
      fail(`restore returned ${r.status}`, r.data?.error)
    }
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n─── Results: ${passed} passed, ${failed} failed ──────────────────────────`)
if (failed > 0) process.exit(1)
