import { useState } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import { useLocale } from '../contexts/LocaleContext'
import { authApi } from '../api/auth'

export default function VerifyPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const tokenFromUrl = searchParams.get('token')
  const tokenFromState = (location.state as { verificationToken?: string } | null)?.verificationToken
  const token = tokenFromUrl ?? tokenFromState

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) {
      setError('No verification token. Please use the link from your email or complete registration.')
      return
    }
    setError('')
    setLoading(true)
    const { data, error: err } = await authApi.verify({ token })
    setLoading(false)
    if (err || !data?.success) {
      setError((data as { error?: string })?.error ?? err ?? 'Verification failed')
      return
    }
    navigate((data as { redirectTo?: string }).redirectTo ?? '/login', { replace: true })
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
          {!token && (
            <p className="mb-4 text-sm text-amber-400">
              Use the link from your email, or complete registration to receive a verification link.
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <button
              type="submit"
              disabled={loading || !token}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-full transition-all shadow-[0_0_15px_rgba(37,106,244,0.4)]"
            >
              {loading ? '...' : t('auth.verify.submit')}
            </button>
            <div className="flex justify-center gap-4">
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
