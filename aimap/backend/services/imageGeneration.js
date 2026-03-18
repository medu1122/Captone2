/**
 * OpenAI DALL-E 3 + Gemini image (Imagen-style via Generative Language API when available).
 */

const SIZE_BY_ASPECT = {
  '1:1': '1024x1024',
  '2:3': '1024x1792',
  '3:2': '1792x1024',
  '4:5': '1024x1792',
  '16:9': '1792x1024',
}

async function openaiGenerateOne(prompt, aspect) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set')
  const size = SIZE_BY_ASPECT[aspect] || '1024x1024'
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || 'dall-e-3',
      prompt: prompt.slice(0, 4000),
      n: 1,
      size,
      quality: 'standard',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error?.message || res.statusText || 'OpenAI image error')
  }
  const url = data.data?.[0]?.url
  if (!url) throw new Error('OpenAI returned no image URL')
  return { url, modelSource: 'dall-e-3' }
}

/**
 * Try Gemini 2.0 image generation; on failure fall back to OpenAI if key exists.
 */
async function googleGenerateOne(prompt, aspect) {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    if (process.env.OPENAI_API_KEY) {
      const r = await openaiGenerateOne(`[Visual style: photorealistic marketing] ${prompt}`, aspect)
      return { ...r, modelSource: 'imagen' }
    }
    throw new Error('GEMINI_API_KEY (or OPENAI_API_KEY fallback) is not set')
  }
  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-preview-image-generation'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt.slice(0, 4000) }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  })
  const data = await res.json().catch(() => ({}))
  const parts = data.candidates?.[0]?.content?.parts || []
  const img = parts.find((p) => p.inlineData?.data)
  if (img?.inlineData?.data) {
    const mime = img.inlineData.mimeType || 'image/png'
    const b64 = img.inlineData.data
    return { dataUrl: `data:${mime};base64,${b64}`, modelSource: 'imagen' }
  }
  if (process.env.OPENAI_API_KEY) {
    const r = await openaiGenerateOne(prompt, aspect)
    return { ...r, modelSource: 'dall-e-3' }
  }
  throw new Error(data.error?.message || 'Gemini image generation failed; no image in response')
}

/**
 * @param {'openai'|'google'} model
 * @returns {Promise<{ urls?: string[], dataUrls?: string[], modelSource: string }>}
 */
export async function generateImageVariants(prompt, aspect, model, count = 3) {
  const urls = []
  const dataUrls = []
  let modelSource = 'dall-e-3'
  for (let i = 0; i < count; i++) {
    const p = count > 1 ? `${prompt}\n(Variant ${i + 1} of ${count}, unique composition.)` : prompt
    if (model === 'google') {
      const r = await googleGenerateOne(p, aspect)
      modelSource = r.modelSource
      if (r.dataUrl) dataUrls.push(r.dataUrl)
      else if (r.url) urls.push(r.url)
    } else {
      const r = await openaiGenerateOne(p, aspect)
      modelSource = r.modelSource
      urls.push(r.url)
    }
  }
  return { urls, dataUrls, modelSource }
}
