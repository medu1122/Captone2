/**
 * BOT MARKETING — GỌI OLLAMA (HOẶC TƯƠNG THÍCH) TRÊN VPS QUA HTTP.
 *
 * Env:
 *   MARKETING_AI_BASE_URL — ví dụ http://IP:11434 (Ollama)
 *   MARKETING_AI_MODEL    — mặc định qwen2.5:7b (đổi theo máy bạn pull)
 *
 * Nếu không set MARKETING_AI_BASE_URL → trả skipped (backend vẫn 200, FE hiển thị placeholder).
 */
const DEFAULT_MODEL = process.env.MARKETING_AI_MODEL || 'qwen2.5:7b'
const TIMEOUT_MS = Math.min(120000, Math.max(5000, parseInt(process.env.MARKETING_AI_TIMEOUT_MS || '45000', 10)))

function safeJsonParse(text) {
  if (!text || typeof text !== 'string') return null
  const t = text.trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(t.slice(start, end + 1))
    } catch {
      /* fallthrough */
    }
  }
  try {
    return JSON.parse(t)
  } catch {
    return null
  }
}

/**
 * @param {string} prompt
 * @returns {Promise<{ text: string | null, skipped?: boolean, error?: string }>}
 */
export async function ollamaGenerate(prompt) {
  const base = (process.env.MARKETING_AI_BASE_URL || '').trim().replace(/\/$/, '')
  if (!base) {
    return { text: null, skipped: true }
  }
  const url = `${base}/api/generate`
  const body = {
    model: DEFAULT_MODEL,
    prompt,
    stream: false,
    options: { temperature: 0.35, num_predict: 900 },
  }
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ac.signal,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('[marketingAiBot] Ollama HTTP', res.status, data)
      return { text: null, error: data?.error || `HTTP ${res.status}` }
    }
    const text = data.response || data.text || ''
    return { text: typeof text === 'string' ? text : String(text) }
  } catch (err) {
    console.error('[marketingAiBot] fetch error:', err.message)
    return { text: null, error: err.message }
  } finally {
    clearTimeout(timer)
  }
}

/** Tóm tắt comment + chủ đề + sentiment */
export async function aiSummarizeComments(commentsText) {
  const prompt = `Bạn là trợ lý phân tích bình luận Facebook cho chủ shop Việt Nam.
Dưới đây là các bình luận (có thể rút gọn). Trả về ĐÚNG một JSON, không markdown, không giải thích thêm:
{"summary":"tóm tắt 2-4 câu tiếng Việt","topics":["chủ đề 1","chủ đề 2"],"sentiment":"mostly_positive|mixed|mostly_negative|neutral"}

Bình luận:
${commentsText.slice(0, 12000)}`
  const { text, skipped, error } = await ollamaGenerate(prompt)
  if (skipped) {
    return {
      summary: 'Chưa cấu hình bot AI (MARKETING_AI_BASE_URL).',
      topics: [],
      sentiment: 'neutral',
      skipped: true,
    }
  }
  if (error || !text) {
    return { summary: 'Không tạo được tóm tắt lúc này.', topics: [], sentiment: 'neutral', error: error || 'empty' }
  }
  const j = safeJsonParse(text)
  if (j && typeof j.summary === 'string') {
    return {
      summary: j.summary,
      topics: Array.isArray(j.topics) ? j.topics.map(String).slice(0, 12) : [],
      sentiment: typeof j.sentiment === 'string' ? j.sentiment : 'neutral',
    }
  }
  return { summary: text.slice(0, 500), topics: [], sentiment: 'neutral' }
}

/** Đánh giá nội dung bài đăng bán hàng */
export async function aiEvaluatePost(postMessage) {
  const prompt = `Đánh giá đoạn caption/post bán hàng sau (tiếng Việt). Trả về ĐÚNG một JSON:
{"score":0-100,"bullets":["gợi ý 1","gợi ý 2","gợi ý 3"]}

Nội dung:
${String(postMessage || '').slice(0, 8000)}`
  const { text, skipped, error } = await ollamaGenerate(prompt)
  if (skipped) {
    return {
      score: 0,
      bullets: ['Cấu hình MARKETING_AI_BASE_URL để bật đánh giá AI.'],
      skipped: true,
    }
  }
  if (error || !text) {
    return { score: 0, bullets: ['Không tạo được đánh giá lúc này.'], error }
  }
  const j = safeJsonParse(text)
  if (j && typeof j.score === 'number') {
    return {
      score: Math.min(100, Math.max(0, Math.round(j.score))),
      bullets: Array.isArray(j.bullets) ? j.bullets.map(String).slice(0, 7) : [],
    }
  }
  return { score: 70, bullets: [text.slice(0, 300)] }
}

/** Gợi ý hành động cấp Page từ KPI đã chuẩn hoá (JSON nhỏ) */
export async function aiPageActions(kpiJson) {
  const prompt = `Dựa trên dữ liệu KPI Facebook Page (JSON). Trả về ĐÚNG một JSON:
{"actions":[{"action":"...","expectedImpact":"..."}]}
Tối đa 5 mục, tiếng Việt ngắn.

Dữ liệu:
${JSON.stringify(kpiJson).slice(0, 6000)}`
  const { text, skipped, error } = await ollamaGenerate(prompt)
  if (skipped) {
    return { actions: [], skipped: true }
  }
  if (error || !text) {
    return { actions: [], error }
  }
  const j = safeJsonParse(text)
  if (j && Array.isArray(j.actions)) {
    return {
      actions: j.actions
        .filter((a) => a && typeof a.action === 'string')
        .map((a) => ({
          action: a.action,
          expectedImpact: typeof a.expectedImpact === 'string' ? a.expectedImpact : '',
        }))
        .slice(0, 5),
    }
  }
  return { actions: [{ action: 'Xem lại nội dung đăng đều theo tuần', expectedImpact: 'Ổn định reach' }] }
}

/** AI Assist — chỉnh/sinh caption theo hướng dẫn user */
export async function aiWriteAssist(draftMessage, instruction, locale = 'vi') {
  const prompt =
    locale === 'en'
      ? `Rewrite or improve this marketing caption. Instruction: ${instruction}\n\nDraft:\n${draftMessage}`
      : `Viết lại hoặc cải thiện đoạn caption/post bán hàng sau theo hướng dẫn. Chỉ trả về nội dung cuối cùng (tiếng Việt), không giải thích.

Hướng dẫn: ${instruction}

Bản nháp:
${draftMessage}`
  const { text, skipped, error } = await ollamaGenerate(prompt)
  if (skipped) {
    return { suggestedMessage: draftMessage, skipped: true }
  }
  if (error || !text) {
    return { suggestedMessage: draftMessage, error }
  }
  return { suggestedMessage: text.trim() }
}
