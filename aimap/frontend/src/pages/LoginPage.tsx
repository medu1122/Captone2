import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import { useLocale } from '../contexts/LocaleContext'
import { authApi } from '../api/auth'

const AUTH_TOKEN_KEY = 'aimap_token'

export default function LoginPage() {
  const { t } = useLocale()
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
      setError((data as { error?: string })?.error ?? err ?? 'Login failed')
      return
    }
    if (data.token) {
      try {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token)
      } catch {
        /* ignore */
      }
    }
    navigate(data.redirectTo ?? '/', { replace: true })
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="bg-surface-dark border border-border-dark rounded-2xl p-8 card-glow shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">login</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{t('auth.login.title')}</h1>
              <p className="text-sm text-slate-400">{t('auth.login.subtitle')}</p>
            </div>
          </div>
          {error && (
            <p className="mb-4 text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.login.email')}
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-background-dark border border-border-dark text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.login.password')}
              </label>
              <input
                id="login-password"
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl bg-background-dark border border-border-dark text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
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
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-full transition-all shadow-[0_0_15px_rgba(37,106,244,0.4)]"
            >
              {loading ? '...' : t('auth.login.submit')}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">
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
