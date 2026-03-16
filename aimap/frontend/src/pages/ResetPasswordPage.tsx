import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import PasswordInput from '../components/PasswordInput'
import { useLocale } from '../contexts/LocaleContext'
import { authApi } from '../api/auth'

export default function ResetPasswordPage() {
  const { t } = useLocale()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) return
    setError('')
    const form = e.currentTarget
    const newPassword = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value
    if (newPassword !== confirmPassword) {
      setError(t('auth.reset.passwordsDoNotMatch'))
      return
    }
    if (newPassword.length < 6) {
      setError(t('auth.reset.passwordMinLength'))
      return
    }
    setLoading(true)
    const { data, error: err } = await authApi.resetPassword({ token, newPassword })
    setLoading(false)
    if (err || !(data as { success?: boolean })?.success) {
      setError((data as { error?: string })?.error ?? err ?? t('auth.error.resetFailed'))
      return
    }
    setSuccess(true)
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-300 rounded-lg p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">{t('auth.reset.title')}</h1>
            <p className="text-sm text-slate-600">{t('auth.reset.subtitle')}</p>
          </div>
          {!token && (
            <p className="mb-4 text-sm text-amber-400">
              {t('auth.reset.missingToken')}
            </p>
          )}
          {error && (
            <p className="mb-4 text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="mb-4 text-sm text-green-400 bg-green-400/10 rounded-lg px-3 py-2">
              {t('auth.reset.passwordUpdated')} <Link to="/login" className="underline">{t('auth.login.submit')}</Link>
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <input type="hidden" name="token" value={token ?? ''} />
            <div>
              <label htmlFor="reset-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('auth.reset.password')}
              </label>
              <PasswordInput
                id="reset-password"
                name="password"
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <div>
              <label htmlFor="reset-confirm" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('auth.reset.confirmPassword')}
              </label>
              <PasswordInput
                id="reset-confirm"
                name="confirmPassword"
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={!token || loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? '...' : t('auth.reset.submit')}
            </button>
          </form>
          <p className="mt-6 text-center">
            <Link to="/login" className="text-sm text-slate-400 hover:text-primary transition-colors">
              {t('auth.reset.backToLogin')}
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
