/**
 * API CREDIT / PAYMENT: PHƯƠNG THỨC, TẠO ĐƠN, XEM PAYMENT, LỊCH SỬ.
 */
import { Router } from 'express'
import pool from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import {
  createPendingPaymentFromAmountVnd,
  CREDIT_VND_RATE,
  PAYMENT_MIN_AMOUNT_VND,
  getPaymentMethods,
} from '../services/creditPaymentService.js'

const router = Router()

router.get('/methods', requireAuth, (req, res) => {
  res.json({
    methods: getPaymentMethods(),
    creditVndRate: CREDIT_VND_RATE,
    minAmountVnd: PAYMENT_MIN_AMOUNT_VND,
  })
})

router.post('/topup/intent', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const amountVnd = parseInt(req.body?.amountVnd, 10)
  const methodId = typeof req.body?.methodId === 'string' ? req.body.methodId.trim() : ''
  try {
    const { payment, transferContent } = await createPendingPaymentFromAmountVnd(profileId, amountVnd, methodId)
    res.status(201).json({
      payment: {
        id: payment.id,
        amountMoney: payment.amount_money,
        credits: payment.credits,
        status: payment.status,
        transferContent,
        qrImageUrl: payment.qr_image_url,
        expiresAt: payment.expires_at,
        createdAt: payment.created_at,
      },
      creditVndRate: CREDIT_VND_RATE,
    })
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'payments table not migrated; run db/migrations/005_payments_vietqr.sql' })
    }
    if (err.code === '42703') {
      return res.status(503).json({ error: 'payments columns missing; run db/migrations/005_payments_vietqr.sql' })
    }
    if (err.status === 400) return res.status(400).json({ error: err.message })
    console.error('topup intent error:', err.code || '', err.message)
    res.status(500).json({ error: 'Failed to create payment intent' })
  }
})

router.get('/payments/:id', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const { id } = req.params
  try {
    const r = await pool.query(
      `SELECT id, user_id, amount_money, credits, status, transfer_content, qr_image_url,
              expires_at, paid_at, created_at
       FROM payments WHERE id = $1`,
      [id]
    )
    if (!r.rows.length) return res.status(404).json({ error: 'Payment not found' })
    if (r.rows[0].user_id !== profileId) return res.status(403).json({ error: 'Access denied' })
    const p = r.rows[0]
    res.json({
      payment: {
        id: p.id,
        amountMoney: p.amount_money,
        credits: p.credits,
        status: p.status,
        transferContent: p.transfer_content,
        qrImageUrl: p.qr_image_url,
        expiresAt: p.expires_at,
        paidAt: p.paid_at,
        createdAt: p.created_at,
      },
    })
  } catch (err) {
    if (err.code === '42P01') {
      return res.status(503).json({ error: 'payments table not available' })
    }
    console.error('get payment error:', err)
    res.status(500).json({ error: 'Failed to load payment' })
  }
})

router.get('/history', requireAuth, async (req, res) => {
  const profileId = req.auth.profileId
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0)
  try {
    const rows = await pool.query(
      `SELECT id, amount, type, reference_type, reference_id, description, created_at
       FROM credit_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [profileId, limit, offset]
    )
    res.json({ transactions: rows.rows })
  } catch (err) {
    console.error('credit history error:', err)
    res.status(500).json({ error: 'Failed to load history' })
  }
})

export default router
