/**
 * THANH TOÁN NẠP CREDIT: CẬP NHẬT PAYMENTS + GHI CREDIT_TRANSACTIONS (MỘT GIAO DỊCH DB).
 */
import pool from '../db/index.js'
import { buildVietQrImageUrl } from './vietqrUrl.js'

export const CREDIT_VND_RATE = Math.max(1, parseInt(process.env.CREDIT_VND_RATE || '1000', 10))
export const PAYMENT_EXPIRY_MINUTES = Math.max(5, parseInt(process.env.PAYMENT_EXPIRY_MINUTES || '30', 10))
export const PAYMENT_MIN_AMOUNT_VND = Math.max(1000, parseInt(process.env.PAYMENT_MIN_AMOUNT_VND || '10000', 10))

export function getPaymentMethods() {
  const methods = []
  if (process.env.PAYMENT_METHOD_MOCK !== '0') {
    methods.push({ id: 'mock', label: 'Mock (dev)' })
  }
  const hasVietqr = (process.env.VIETQR_BANK_BIN || '').trim() && (process.env.VIETQR_ACCOUNT_NO || '').trim()
  if (hasVietqr && process.env.PAYMENT_METHOD_VIETQR !== '0') {
    methods.push({ id: 'vietqr_bank', label: 'VietQR chuyển khoản' })
  }
  if (methods.length === 0) {
    methods.push({ id: 'mock', label: 'Mock (dev)' })
  }
  return methods
}

export function isValidMethodId(id) {
  return getPaymentMethods().some((m) => m.id === id)
}

export async function applyTopupSuccess(paymentId, gatewayTxnId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const lock = await client.query(
      `SELECT id, user_id, credits, status FROM payments WHERE id = $1 FOR UPDATE`,
      [paymentId]
    )
    if (!lock.rows.length) {
      await client.query('ROLLBACK')
      return { ok: false, reason: 'not_found' }
    }
    const p = lock.rows[0]
    if (p.status !== 'pending') {
      await client.query('ROLLBACK')
      return { ok: false, reason: 'not_pending' }
    }
    const refId = String(paymentId).slice(0, 100)
    await client.query(
      `UPDATE payments SET
         status = 'success',
         gateway_txn_id = COALESCE($2::varchar, gateway_txn_id),
         paid_at = NOW(),
         updated_at = NOW()
       WHERE id = $1`,
      [paymentId, gatewayTxnId]
    )
    await client.query(
      `INSERT INTO credit_transactions (user_id, amount, type, reference_type, reference_id, description)
       VALUES ($1, $2, 'topup', 'payment', $3, $4)`,
      [p.user_id, p.credits, refId, 'Credit top-up via payment']
    )
    await client.query('COMMIT')
    return { ok: true }
  } catch (e) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackErr) {
      console.warn('applyTopupSuccess rollback:', rollbackErr?.message)
    }
    throw e
  } finally {
    client.release()
  }
}

/**
 * TẠO ĐƠN PENDING: amountVnd LÀ SỐ TIỀN CK; CREDIT = FLOOR(amountVnd / CREDIT_VND_RATE).
 */
export async function createPendingPaymentFromAmountVnd(userId, amountVnd, methodId) {
  if (!isValidMethodId(methodId)) {
    throw Object.assign(new Error('invalid payment method'), { status: 400 })
  }
  if (!Number.isFinite(amountVnd) || amountVnd < PAYMENT_MIN_AMOUNT_VND || amountVnd > 1_000_000_000) {
    throw Object.assign(
      new Error(`amountVnd must be between ${PAYMENT_MIN_AMOUNT_VND} and 1000000000`),
      { status: 400 }
    )
  }
  const amountRounded = Math.round(amountVnd)
  const credits = Math.max(1, Math.floor(amountRounded / CREDIT_VND_RATE))
  const gateway = methodId === 'mock' ? 'mock' : 'vietqr_bank'
  const short = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase()
  const transferContent = `AIMAP-${short}`.slice(0, 80)
  const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60 * 1000)

  let qrImageUrl = null
  if (methodId === 'vietqr_bank') {
    qrImageUrl = buildVietQrImageUrl(amountRounded, transferContent)
  }

  const ins = await pool.query(
    `INSERT INTO payments (
       user_id, amount_money, credits, gateway, status, transfer_content, expires_at, qr_image_url
     ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)
     RETURNING *`,
    [userId, amountRounded, credits, gateway, transferContent, expiresAt, qrImageUrl]
  )
  return { payment: ins.rows[0], transferContent }
}

export async function findPendingPaymentByContentAndAmount(transferContent, amountVnd) {
  const r = await pool.query(
    `SELECT id FROM payments
     WHERE status = 'pending' AND transfer_content = $1 AND amount_money = $2`,
    [transferContent, Math.round(amountVnd)]
  )
  return r.rows[0]?.id ?? null
}

export async function expireStalePayments() {
  await pool.query(
    `UPDATE payments SET status = 'expired', updated_at = NOW()
     WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < NOW()`
  )
}
