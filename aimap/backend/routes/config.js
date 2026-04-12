/**
 * Public config cho frontend (model nào đã cấu hình key).
 * Mount: /api/config
 */
import { Router } from 'express'
import { getWebsiteAiInfo } from '../services/websiteAiService.js'

const router = Router()

router.get('/image-models', (_, res) => {
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim())
  const gemini = Boolean(process.env.GEMINI_API_KEY?.trim())
  res.json({ openai, gemini })
})

/** Ollama marketing bot — không lộ URL đầy đủ, chỉ báo đã cấu hình + model + timeout */
router.get('/marketing-ai', (_, res) => {
  const configured = Boolean((process.env.MARKETING_AI_BASE_URL || '').trim())
  const model = process.env.MARKETING_AI_MODEL || 'qwen2.5:7b'
  const timeoutMs = Math.min(120000, Math.max(5000, parseInt(process.env.MARKETING_AI_TIMEOUT_MS || '45000', 10)))
  res.json({ configured, model, timeoutMs })
})

/** Website AI — provider-based (openai | ollama | auto), không lộ key */
router.get('/website-ai', (_, res) => {
  res.json(getWebsiteAiInfo())
})

export default router
