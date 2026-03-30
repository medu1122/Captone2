/** GỌI /API/CREDITS — PAYMENT, LỊCH SỬ */
import { apiFetch } from './client'

const PREFIX = '/credits'

export type PaymentMethod = {
  id: string
  label: string
  bankBin?: string
  bankName?: string
  accountNo?: string
}

export type PaymentIntentResponse = {
  payment: {
    id: string
    amountMoney: number
    credits: number
    status: string
    transferContent: string
    qrImageUrl: string | null
    expiresAt: string
    createdAt: string
  }
  creditVndRate: number
}

export type CreditTxRow = {
  id: string
  amount: number
  type: string
  reference_type: string | null
  reference_id: string | null
  description: string | null
  created_at: string
}

export const creditsApi = {
  methods(token: string) {
    return apiFetch<{ methods: PaymentMethod[]; creditVndRate: number; minAmountVnd: number }>(
      `${PREFIX}/methods`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
  },

  topupIntent(token: string, amountVnd: number, methodId: string) {
    return apiFetch<PaymentIntentResponse>(`${PREFIX}/topup/intent`, {
      method: 'POST',
      body: { amountVnd, methodId },
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  getPayment(token: string, paymentId: string) {
    return apiFetch<{ payment: PaymentIntentResponse['payment'] }>(`${PREFIX}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  history(token: string, params?: { limit?: number; offset?: number }) {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    const qs = q.toString()
    return apiFetch<{ transactions: CreditTxRow[] }>(`${PREFIX}/history${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}
