import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import PasswordInput from '../components/PasswordInput'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../contexts/LocaleContext'
import AuthLayout from '../layouts/AuthLayout'

export default function LoginPage() {
  const { t } = useLocale()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    if (!email || !password) return
    setLoading(true)
    const { data, error: err } = await authApi.login({ email, password })
    setLoading(false)
    if (err || !data?.success) {
      const msg = (data as { error?: string })?.error ?? err
      if (msg === 'Invalid email or password') {
        setError(t('auth.error.invalidCredentials'))
      } else {
        setError(msg ?? t('auth.error.loginFailed'))
      }
      return
    }
    if (data.token && data.user) {
      login(data.token, data.user)
    }
    navigate(data.redirectTo ?? '/dashboard', { replace: true })
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-300 rounded-lg p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">{t('auth.login.title')}</h1>
            <p className="text-sm text-slate-600">{t('auth.login.subtitle')}</p>
          </div>
          {error && (
            <p className="mb-4 text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('auth.login.email')}
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                placeholder="ban@example.com"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('auth.login.password')}
              </label>
              <PasswordInput
                id="login-password"
                name="password"
                required
                autoComplete="current-password"
              />
            </div>
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                {t('auth.login.forgotPassword')}
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? '...' : t('auth.login.submit')}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            {t('auth.login.noAccount')}{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              {t('auth.login.signUp')}
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
