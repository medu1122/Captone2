/**
 * JOB ĐỊNH KỲ: CHỈ XỬ LÝ EXPIRE ĐƠN PENDING.
 */
import { expireStalePayments } from './creditPaymentService.js'

export async function runPaymentPollOnce() {
  await expireStalePayments()
}

export function startPaymentPollLoop() {
  if (process.env.PAYMENT_POLL_ENABLED === '0') return
  const ms = Math.max(5000, parseInt(process.env.PAYMENT_POLL_INTERVAL_MS || '15000', 10))
  setInterval(() => {
    runPaymentPollOnce().catch((e) => console.error('[paymentPoll]', e.message))
  }, ms)
  console.log(`[paymentPoll] interval ${ms}ms mode=expire-only`)
}
