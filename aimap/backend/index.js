/**
 * AIMAP Backend – entry + auth routes.
 * Chạy: node index.js hoặc npm run dev
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDB } from './db/index.js'
import authRoutes from './routes/auth.js'

const app = express()
const PORT = process.env.PORT ?? 4111

app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }))
app.use(express.json())

app.get('/health', (_, res) => {
  res.json({ ok: true, service: 'aimap-backend' })
})

app.use('/api/auth', authRoutes)

await connectDB()

app.listen(PORT, () => {
  console.log(`AIMAP backend http://localhost:${PORT}`)
})
