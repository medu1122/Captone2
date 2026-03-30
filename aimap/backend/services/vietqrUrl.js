/**
 * TẠO URL ẢNH QR VIETQR (IMG.VIETQR.IO) — CẦN VIETQR_BANK_BIN + VIETQR_ACCOUNT_NO.
 */
export function buildVietQrImageUrl(amountVnd, addInfo) {
  const bin = (process.env.VIETQR_BANK_BIN || '').trim()
  const account = (process.env.VIETQR_ACCOUNT_NO || '').replace(/\s/g, '')
  if (!bin || !account) return null

  const path = `${bin}-${account}-compact2.jpg`
  const base = `https://img.vietqr.io/image/${path}`
  const q = new URLSearchParams()
  if (Number.isFinite(amountVnd) && amountVnd > 0) q.set('amount', String(Math.round(amountVnd)))
  const info = typeof addInfo === 'string' ? addInfo.trim().slice(0, 120) : ''
  if (info) q.set('addInfo', info)
  const qs = q.toString()
  return qs ? `${base}?${qs}` : base
}
