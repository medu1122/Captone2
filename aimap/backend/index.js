/**
 * AIMAP Backend – entry + auth routes.
 * Chạy: node index.js hoặc npm run dev
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDB } from './db/index.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import shopsRoutes from './routes/shops.js'
import shopImageBotRoutes from './routes/shopImageBot.js'
import shopDeployRoutes from './routes/shopDeploy.js'
import configRoutes from './routes/config.js'
import { getUploadRoot } from './services/assetStorage.js'

const app = express()
const PORT = process.env.PORT ?? 4111

if (process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1)
}

app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }))
app.use(express.json({ limit: '20mb' }))
app.use('/uploads', express.static(getUploadRoot()))

app.get('/health', (_, res) => {
  res.json({ ok: true, service: 'aimap-backend' })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/shops', shopsRoutes)
app.use('/api/shops', shopImageBotRoutes)
app.use('/api/shops', shopDeployRoutes)
app.use('/api/config', configRoutes)

await connectDB()

// Listen on 0.0.0.0 (IPv4 only) so all clients connect via IPv4
// and the access log records readable IPv4 addresses instead of IPv6.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AIMAP backend http://localhost:${PORT}`)
})
