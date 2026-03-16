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
    setSuccess((data as { message?: string })?.message ?? t('auth.info.resetLinkSent'))
    const link = (data as { resetLink?: string })?.resetLink
    if (link) setResetLink(link)
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-300 rounded-lg p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">{t('auth.forgot.title')}</h1>
            <p className="text-sm text-slate-600">{t('auth.forgot.subtitle')}</p>
          </div>
          {error && (
            <p className="mb-4 text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="mb-4 text-sm text-green-400 bg-green-400/10 rounded-lg px-3 py-2">{success}</p>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('auth.forgot.email')}
              </label>
              <input
                id="forgot-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                placeholder="ban@example.com"
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
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
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
