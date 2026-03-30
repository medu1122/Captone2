/**
 * WEBHOOK VIETQR API SERVICE — KHỚP NỘI DUNG AIMAP-* + SỐ TIỀN VỚI ĐƠN PENDING.
 */
import { Router } from 'express'
import crypto from 'crypto'
import { applyTopupSuccess, findPendingPaymentByContentAndAmount } from '../services/creditPaymentService.js'

const router = Router()
const issuedTokens = new Map()

function collectVietQrTxns(body) {
  if (!body || typeof body !== 'object') return []
  if (Array.isArray(body.transactions)) return body.transactions
  if (Array.isArray(body.data)) return body.data
  if (body.data && Array.isArray(body.data.transactions)) return body.data.transactions
  if (body.data && Array.isArray(body.data.records)) return body.data.records
  if (body.data && typeof body.data === 'object') return [body.data]
  if (Array.isArray(body)) return body
  if (typeof body.amount !== 'undefined' && (body.content || body.description || body.remark)) return [body]
  return []
}

function parseTxn(item) {
  const amount = Number(item?.amount ?? item?.transferAmount ?? item?.transfer_amount ?? 0)
  const desc = String(item?.content ?? item?.description ?? item?.remark ?? item?.note ?? '')
  const extId = String(
    item?.transactionid ??
    item?.transactionID ??
    item?.transaction_id ??
    item?.id ??
    item?.reference ??
    item?.tid ??
    item?.referencenumber ??
    item?.virtualAccount ??
    ''
  ).slice(0, 255)
  const sign = String(item?.sign ?? item?.signature ?? '').trim().toLowerCase()
  const transactionTime = String(item?.transactiontime ?? item?.transactionTime ?? '').trim()
  const orderId = String(item?.orderId ?? item?.orderid ?? '').trim()
  const transType = String(item?.transType ?? item?.transactionType ?? '').trim().toUpperCase()
  return { amount, desc, extId, sign, transactionTime, orderId, transType }
}

function verifyBasicAuth(authHeader, username, password) {
  const raw = String(authHeader || '')
  if (!raw.startsWith('Basic ')) return false
  try {
    const decoded = Buffer.from(raw.slice(6), 'base64').toString('utf8')
    const i = decoded.indexOf(':')
    if (i < 0) return false
    const u = decoded.slice(0, i)
    const p = decoded.slice(i + 1)
    return u === username && p === password
  } catch {
    return false
  }
}

function issueClientToken(ttlSec = 900) {
  const token = crypto.randomBytes(24).toString('hex')
  const exp = Date.now() + ttlSec * 1000
  issuedTokens.set(token, exp)
  return { token, expiresIn: ttlSec }
}

function isIssuedTokenValid(token) {
  const exp = issuedTokens.get(token)
  if (!exp) return false
  if (Date.now() > exp) {
    issuedTokens.delete(token)
    return false
  }
  return true
}

function normalizeAuthToken(authHeader) {
  const raw = String(authHeader || '')
  if (!raw.startsWith('Bearer ')) return ''
  return raw.slice(7).trim()
}

function verifySign(txn, secret) {
  if (!secret) return true
  if (!txn.sign || !txn.extId || !txn.transactionTime || !txn.orderId) return false
  const amount10 = String(Math.round(txn.amount)).padStart(10, '0')
  const raw = `${txn.extId}${amount10}${txn.transactionTime}${txn.orderId}`
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex').toLowerCase()
  return expected === txn.sign
}

function isAuthorizedForVietQr(req) {
  const token = String(process.env.VIETQR_WEBHOOK_BEARER || '').trim()
  const username = String(process.env.VIETQR_CLIENT_USERNAME || '').trim()
  const password = String(process.env.VIETQR_CLIENT_PASSWORD || '').trim()
  const authHeader = req.headers.authorization || ''
  if (token) {
    return authHeader === `Bearer ${token}`
  }
  if (username && password) {
    if (verifyBasicAuth(authHeader, username, password)) return true
    const bearer = normalizeAuthToken(authHeader)
    if (bearer && isIssuedTokenValid(bearer)) return true
  }
  return false
}

async function handleVietQrCallback(req, res) {
  if (!isAuthorizedForVietQr(req)) {
    return res.status(401).json({ error: true, errorReason: 'unauthorized', toastMessage: 'unauthorized' })
  }

  try {
    const txns = collectVietQrTxns(req.body)
    const signSecret = String(process.env.VIETQR_CALLBACK_SECRET || '').trim()
    let matched = 0
    let invalidSign = 0
    for (const item of txns) {
      const txn = parseTxn(item)
      const { amount, desc, extId, transType } = txn
      if (!Number.isFinite(amount) || amount <= 0 || !desc) continue
      if (transType && transType !== 'C') continue
      if (!verifySign(txn, signSecret)) {
        invalidSign += 1
        continue
      }
      const m = desc.match(/AIMAP-[A-Z0-9]+/i)
      if (!m) continue
      const transferContent = m[0]
      const paymentId = await findPendingPaymentByContentAndAmount(transferContent, amount)
      if (!paymentId) continue
      const result = await applyTopupSuccess(paymentId, extId || null)
      if (result.ok) matched += 1
    }
    res.json({
      error: false,
      errorReason: null,
      toastMessage: 'ok',
      object: { processed: matched, received: txns.length, invalidSign },
    })
  } catch (e) {
    console.error('[webhook vietqr]', e.message)
    res.status(500).json({ error: true, errorReason: 'webhook_failed', toastMessage: 'webhook failed' })
  }
}

router.post('/vietqr', handleVietQrCallback)
router.post('/bank/api/test/transaction-callback', handleVietQrCallback)
router.post('/bank/api/transaction-callback', handleVietQrCallback)

router.post('/api/token_generate', (req, res) => {
  const username = String(process.env.VIETQR_CLIENT_USERNAME || '').trim()
  const password = String(process.env.VIETQR_CLIENT_PASSWORD || '').trim()
  const authHeader = req.headers.authorization || ''
  if (!username || !password) {
    return res.status(503).json({ error: true, errorReason: 'vietqr_client_auth_missing', toastMessage: 'client auth missing' })
  }
  if (!verifyBasicAuth(authHeader, username, password)) {
    return res.status(401).json({ error: true, errorReason: 'unauthorized', toastMessage: 'unauthorized' })
  }
  const ttl = Math.max(60, parseInt(process.env.VIETQR_CLIENT_TOKEN_TTL_SEC || '900', 10))
  const out = issueClientToken(ttl)
  res.json({
    error: false,
    errorReason: null,
    toastMessage: 'ok',
    object: { token: out.token, tokenType: 'Bearer', expiresIn: out.expiresIn },
  })
})

export default router
