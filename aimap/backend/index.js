/**
 * AIMAP Backend – entry (config only, chưa mount routes).
 * Chạy: node index.js hoặc npm run dev
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors())
app.use(express.json())

app.get('/health', (_, res) => {
  res.json({ ok: true, service: 'aimap-backend' })
})

app.listen(PORT, () => {
  console.log(`AIMAP backend http://localhost:${PORT}`)
})
