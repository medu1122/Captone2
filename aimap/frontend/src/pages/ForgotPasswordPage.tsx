import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import { useLocale } from '../contexts/LocaleContext'
import { authApi } from '../api/auth'

export default function ForgotPasswordPage() {
  const { t } = useLocale()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resetLink, setResetLink] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setResetLink('')
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    if (!email) return
    setLoading(true)
    const { data, error: err } = await authApi.forgotPassword({ email })
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    setSuccess((data as { message?: string })?.message ?? 'If the email exists, a reset link was sent.')
    const link = (data as { resetLink?: string })?.resetLink
    if (link) setResetLink(link)
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="bg-surface-dark border border-border-dark rounded-2xl p-8 card-glow shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">lock_reset</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{t('auth.forgot.title')}</h1>
              <p className="text-sm text-slate-400">{t('auth.forgot.subtitle')}</p>
            </div>
          </div>
          {error && (
            <p className="mb-4 text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="mb-4 text-sm text-green-400 bg-green-400/10 rounded-lg px-3 py-2">{success}</p>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.forgot.email')}
              </label>
              <input
                id="forgot-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-background-dark border border-border-dark text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="you@example.com"
              />
            </div>
            {resetLink && (
              <p className="text-sm text-slate-400 break-all">
                Dev reset link: <a href={resetLink} className="text-primary hover:underline">{resetLink}</a>
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-full transition-all shadow-[0_0_15px_rgba(37,106,244,0.4)]"
            >
              {loading ? '...' : t('auth.forgot.submit')}
            </button>
          </form>
          <p className="mt-6 text-center">
            <Link to="/login" className="text-sm text-slate-400 hover:text-primary transition-colors">
              {t('auth.forgot.backToLogin')}
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
