/**
 * BACKEND AIMAP — KHỞI ĐỘNG EXPRESS, KẾT NỐI DB, POLL EXPIRE PAYMENT.
 * CHẠY: NODE INDEX.JS HOẶC NPM RUN DEV
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
import shopWebsiteRoutes from './routes/shopWebsite.js'
import shopFacebookMarketingRoutes from './routes/shopFacebookMarketing.js'
import facebookOAuthRoutes from './routes/facebookOAuth.js'
import configRoutes from './routes/config.js'
import creditsRoutes from './routes/credits.js'
import webhooksRoutes from './routes/webhooks.js'
import { getUploadRoot } from './services/assetStorage.js'
import { startPaymentPollLoop } from './services/paymentPoll.js'

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
app.use('/api/shops', shopWebsiteRoutes)
app.use('/api/shops', shopFacebookMarketingRoutes)
app.use('/api/facebook', facebookOAuthRoutes)
app.use('/api/config', configRoutes)
app.use('/api/credits', creditsRoutes)
app.use('/api/webhooks', webhooksRoutes)
app.use('/vqr', webhooksRoutes)

await connectDB()
startPaymentPollLoop()

// NGHE 0.0.0.0 ĐỂ TRUY CẬP TỪ MẠNG / DOCKER
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AIMAP backend http://localhost:${PORT}`)
})
