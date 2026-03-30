/**
 * WEBHOOK NGÂN HÀNG (CASSO) — KHỚP NỘI DUNG AIMAP-* + SỐ TIỀN VỚI ĐƠN PENDING.
 */
import { Router } from 'express'
import { applyTopupSuccess, findPendingPaymentByContentAndAmount } from '../services/creditPaymentService.js'

const router = Router()

function collectCassoTxns(body) {
  if (!body || typeof body !== 'object') return []
  if (Array.isArray(body.data)) return body.data
  if (body.data && Array.isArray(body.data.transactions)) return body.data.transactions
  if (Array.isArray(body.transactions)) return body.transactions
  if (Array.isArray(body)) return body
  return []
}

function txnAmountDesc(item) {
  const amount = Number(item?.amount ?? item?.transferAmount ?? item?.transfer_amount ?? 0)
  const desc = String(item?.description ?? item?.content ?? item?.remark ?? '')
  const extId = String(
    item?.id ?? item?.reference ?? item?.tid ?? item?.transactionID ?? item?.virtualAccount ?? ''
  ).slice(0, 255)
  return { amount, desc, extId }
}

router.post('/casso', async (req, res) => {
  const token = process.env.CASSO_WEBHOOK_BEARER
  if (token) {
    const auth = req.headers.authorization || ''
    if (auth !== `Bearer ${token}`) {
      return res.status(401).json({ error: 'unauthorized' })
    }
  }

  try {
    const txns = collectCassoTxns(req.body)
    let matched = 0
    for (const item of txns) {
      const { amount, desc, extId } = txnAmountDesc(item)
      if (!Number.isFinite(amount) || amount <= 0 || !desc) continue
      const m = desc.match(/AIMAP-[A-Z0-9]+/i)
      if (!m) continue
      const transferContent = m[0]
      const paymentId = await findPendingPaymentByContentAndAmount(transferContent, amount)
      if (!paymentId) continue
      if (!extId) continue
      const result = await applyTopupSuccess(paymentId, extId)
      if (result.ok) matched += 1
    }
    res.json({ ok: true, processed: matched })
  } catch (e) {
    console.error('[webhook casso]', e.message)
    res.status(500).json({ error: 'webhook failed' })
  }
})

export default router
