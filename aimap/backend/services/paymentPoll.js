/**
 * JOB ĐỊNH KỲ: HẾT HẠN ĐƠN PENDING; MOCK TỰ HOÀN TẤT SAU VÀI GIÂY (DEV).
 */
import pool from '../db/index.js'
import { applyTopupSuccess, expireStalePayments } from './creditPaymentService.js'

const MOCK_DELAY_SEC = Math.max(2, parseInt(process.env.PAYMENT_MOCK_DELAY_SEC || '5', 10))

export async function runPaymentPollOnce() {
  await expireStalePayments()
  const provider = process.env.PAYMENT_PROVIDER ?? 'mock'
  if (provider !== 'mock') return

  const r = await pool.query(
    `SELECT id FROM payments
     WHERE status = 'pending'
       AND gateway = 'mock'
       AND expires_at > NOW()
       AND created_at < NOW() - ($1 * INTERVAL '1 second')`,
    [MOCK_DELAY_SEC]
  )
  for (const row of r.rows) {
    const tid = `mock_${row.id}`.slice(0, 255)
    await applyTopupSuccess(row.id, tid)
  }
}

export function startPaymentPollLoop() {
  if (process.env.PAYMENT_POLL_ENABLED === '0') return
  const ms = Math.max(5000, parseInt(process.env.PAYMENT_POLL_INTERVAL_MS || '15000', 10))
  setInterval(() => {
    runPaymentPollOnce().catch((e) => console.error('[paymentPoll]', e.message))
  }, ms)
  console.log(`[paymentPoll] interval ${ms}ms provider=${process.env.PAYMENT_PROVIDER || 'mock'}`)
}
