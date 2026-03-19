/**
 * Public config cho frontend (model nào đã cấu hình key).
 * Mount: /api/config
 */
import { Router } from 'express'

const router = Router()

router.get('/image-models', (_, res) => {
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim())
  const gemini = Boolean(process.env.GEMINI_API_KEY?.trim())
  res.json({ openai, gemini })
})

export default router
