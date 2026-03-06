import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import { useLocale } from '../contexts/LocaleContext'
import { authApi } from '../api/auth'

export default function VerifyPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const location = useLocation()
  const stateEmail = (location.state as { verificationEmail?: string } | null)?.verificationEmail ?? ''

  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendMessage, setResendMessage] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    const code = (form.elements.namedItem('code') as HTMLInputElement).value.trim().replace(/\s/g, '')
    if (!email || !code) {
      setError('Please enter your email and the 6-digit code.')
      return
    }
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('Code must be exactly 6 digits.')
      return
    }
    setLoading(true)
    const { data, error: err } = await authApi.verify({ email, code })
    setLoading(false)
    if (err || !data?.success) {
      setError((data as { error?: string })?.error ?? err ?? 'Verification failed')
      return
    }
    navigate((data as { redirectTo?: string }).redirectTo ?? '/login', { replace: true })
  }

  async function handleResend() {
    const form = document.getElementById('verify-form') as HTMLFormElement | null
    const email = form?.querySelector<HTMLInputElement>('input[name="email"]')?.value?.trim()
    if (!email) {
      setError('Enter your email first.')
      return
    }
    setResendMessage('')
    setError('')
    setResendLoading(true)
    const { data, error: err } = await authApi.resendVerifyCode({ email })
    setResendLoading(false)
    if (err) {
      setError(err)
      return
    }
    setResendMessage((data as { message?: string })?.message ?? 'A new code was sent.')
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="bg-surface-dark border border-border-dark rounded-2xl p-8 card-glow shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">mark_email_read</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{t('auth.verify.title')}</h1>
              <p className="text-sm text-slate-400">{t('auth.verify.subtitle')}</p>
            </div>
          </div>
          {error && (
            <p className="mb-4 text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}
          {resendMessage && (
            <p className="mb-4 text-sm text-green-400 bg-green-400/10 rounded-lg px-3 py-2">{resendMessage}</p>
          )}
          <form id="verify-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="verify-email" className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                id="verify-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                defaultValue={stateEmail}
                className="w-full px-4 py-3 rounded-xl bg-background-dark border border-border-dark text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="verify-code" className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.verify.code')}
              </label>
              <input
                id="verify-code"
                type="text"
                name="code"
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                pattern="\d{6}"
                className="w-full px-4 py-3 rounded-xl bg-background-dark border border-border-dark text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-center text-lg tracking-widest"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-full transition-all shadow-[0_0_15px_rgba(37,106,244,0.4)]"
            >
              {loading ? '...' : t('auth.verify.submit')}
            </button>
            <div className="flex justify-center gap-4 items-center flex-wrap">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                {resendLoading ? '...' : t('auth.verify.resend')}
              </button>
              <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
                {t('auth.verify.backToLogin')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  )
}
