/**
 * Unit tests for websiteCodegenService.js
 *
 * Run: node scripts/testWebsiteCodegen.js
 */

import { generateFullRedesign, editBundle } from '../services/websiteCodegenService.js'

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label}`)
    failed++
  }
}

const mockShop = {
  id: 'test-shop-id',
  name: 'Test Bakery',
  industry: 'Food & Beverage',
  description: 'Artisan bakery specialising in sourdough and pastries.',
  contact_info: 'hello@testbakery.com',
}
const mockAssets = []

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAi(returnData) {
  return async (_prompt) => ({ data: returnData, error: null, skipped: false, provider: 'test' })
}

function makeAiError(error) {
  return async (_prompt) => ({ data: null, error, skipped: false, provider: 'test' })
}

const VALID_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Test Bakery</title>
    <meta name="description" content="Artisan bakery specialising in sourdough and pastries." />
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 24px; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
      h1 { font-size: 2rem; margin-bottom: 8px; }
      nav { background: #0f172a; color: white; padding: 16px 24px; display: flex; justify-content: space-between; }
      section { padding: 48px 24px; }
    </style>
  </head>
  <body>
    <nav><strong>Test Bakery</strong><a href="#contact" style="color:white;">Contact</a></nav>
    <section>
      <h1>Welcome to Test Bakery</h1>
      <p>Artisan sourdough and pastries baked fresh every morning since 2020.</p>
      <a href="#menu" style="background:#2563eb;color:white;padding:12px 24px;display:inline-block;margin-top:16px;">View Menu</a>
    </section>
    <footer style="background:#0f172a;color:white;padding:24px;text-align:center;">
      &copy; 2024 Test Bakery. All rights reserved.
    </footer>
  </body>
</html>`

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\n── generateFullRedesign ──────────────────────────────────────────────')

{
  console.log('\n[1] AI returns valid HTML → ok: true')
  const result = await generateFullRedesign({
    prompt: 'Make a modern dark bakery website',
    shop: mockShop,
    assets: mockAssets,
    callAi: makeAi({ html: VALID_HTML, title: 'Test Bakery', description: 'Great sourdough', summary: 'Created dark bakery site' }),
  })
  assert(result.ok === true, 'ok is true')
  assert(typeof result.html === 'string' && result.html.length > 400, 'html present and substantial')
  assert(result.summary === 'Created dark bakery site', 'summary forwarded from AI')
  assert(result.provider === 'test', 'provider forwarded')
}

{
  console.log('\n[2] AI returns no data (provider failure) → ok: false, requiresAi: true')
  const result = await generateFullRedesign({
    prompt: 'redesign everything',
    shop: mockShop,
    assets: mockAssets,
    callAi: makeAiError('OPENAI_API_KEY not configured'),
  })
  assert(result.ok === false, 'ok is false')
  assert(result.requiresAi === true, 'requiresAi is true')
  assert(typeof result.error === 'string', 'error message present')
}

{
  console.log('\n[3] AI returns invalid HTML (missing tags) → ok: false, requiresAi: false')
  const result = await generateFullRedesign({
    prompt: 'redesign',
    shop: mockShop,
    assets: mockAssets,
    callAi: makeAi({ html: 'short', title: 'T', description: '', summary: 'bad output' }),
  })
  assert(result.ok === false, 'ok is false')
  assert(result.requiresAi === false, 'requiresAi is false (not a provider issue)')
  assert(result.error?.includes('html'), 'error mentions html')
}

{
  console.log('\n[4] AI returns HTML missing </html> closing tag → ok: false')
  const truncated = VALID_HTML.replace('</html>', '')
  const result = await generateFullRedesign({
    prompt: 'redesign',
    shop: mockShop,
    assets: mockAssets,
    callAi: makeAi({ html: truncated }),
  })
  assert(result.ok === false, 'ok is false for truncated HTML')
}

{
  console.log('\n[5] AI returns object with missing html field → ok: false')
  const result = await generateFullRedesign({
    prompt: 'redesign',
    shop: mockShop,
    assets: mockAssets,
    callAi: makeAi({ summary: 'done', updates: {} }),
  })
  assert(result.ok === false, 'ok is false when html field absent')
}

console.log('\n── editBundle ────────────────────────────────────────────────────────────')

{
  console.log('\n[6] Edit existing bundle → ok: true, returns updated HTML')
  const result = await editBundle({
    prompt: 'Change the header color to green',
    shop: mockShop,
    assets: mockAssets,
    currentHtml: VALID_HTML,
    sectionId: null,
    callAi: makeAi({ html: VALID_HTML.replace('Welcome', 'Hello'), summary: 'Changed header' }),
  })
  assert(result.ok === true, 'ok is true')
  assert(result.html?.includes('Hello'), 'updated HTML returned')
}

{
  console.log('\n[7] Edit fails (no current html, AI error) → ok: false, requiresAi: true')
  const result = await editBundle({
    prompt: 'change something',
    shop: mockShop,
    assets: mockAssets,
    currentHtml: null,
    sectionId: null,
    callAi: makeAiError('network timeout'),
  })
  assert(result.ok === false, 'ok is false')
  assert(result.requiresAi === true, 'requiresAi true on provider failure')
}

console.log('\n── intent classification (via websiteAiService) ──────────────────────────')

{
  const { classifyIntent } = await import('../services/websiteAiService.js')
  console.log('\n[8] Broad redesign keywords → page_redesign')
  assert(classifyIntent('xoá và làm lại toàn bộ giao diện') === 'page_redesign', 'Vietnamese redesign keyword')
  assert(classifyIntent('rebuild the whole page from scratch') === 'page_redesign', 'English redesign keyword')
  assert(classifyIntent('redesign the website') === 'page_redesign', 'redesign keyword')
}

{
  const { classifyIntent } = await import('../services/websiteAiService.js')
  console.log('\n[9] Targeted edits → section_edit')
  assert(classifyIntent('change the button color to blue') === 'section_edit', 'color change → section_edit')
  assert(classifyIntent('update the hero title') === 'section_edit', 'title update → section_edit')
  assert(classifyIntent('add a contact section') === 'section_edit', 'add section → section_edit')
}

console.log('\n── getWebsiteAiInfo ────────────────────────────────────────────────────────')

{
  const { getWebsiteAiInfo } = await import('../services/websiteAiService.js')
  console.log('\n[10] getWebsiteAiInfo returns safe shape without leaking keys')
  const info = getWebsiteAiInfo()
  assert(typeof info.provider === 'string', 'provider is string')
  assert(typeof info.configured === 'boolean', 'configured is boolean')
  assert(typeof info.model === 'string', 'model is string')
  assert(!JSON.stringify(info).includes('sk-'), 'no API key leaked')
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n─── Results: ${passed} passed, ${failed} failed ──────────────────────────`)
if (failed > 0) {
  process.exit(1)
}
