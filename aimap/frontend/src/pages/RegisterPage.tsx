import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import { useLocale } from '../contexts/LocaleContext'
import { authApi } from '../api/auth'

export default function RegisterPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!name || !email || !password) return
    setLoading(true)
    const { data, error: err } = await authApi.register({ email, password, name })
    setLoading(false)
    if (err || !data?.success) {
      setError((data as { error?: string })?.error ?? err ?? 'Registration failed')
      return
    }
    const token = (data as { verificationToken?: string }).verificationToken
    navigate('/verify', { state: token ? { verificationToken: token } : undefined, replace: true })
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="bg-surface-dark border border-border-dark rounded-2xl p-8 card-glow shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">person_add</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{t('auth.register.title')}</h1>
              <p className="text-sm text-slate-400">{t('auth.register.subtitle')}</p>
            </div>
          </div>
          {error && (
            <p className="mb-4 text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.register.name')}
              </label>
              <input
                id="register-name"
                type="text"
                name="name"
                required
                autoComplete="name"
                className="w-full px-4 py-3 rounded-xl bg-background-dark border border-border-dark text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.register.email')}
              </label>
              <input
                id="register-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-background-dark border border-border-dark text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.register.password')}
              </label>
              <input
                id="register-password"
                type="password"
                name="password"
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl bg-background-dark border border-border-dark text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="register-confirm" className="block text-sm font-medium text-slate-300 mb-2">
                {t('auth.register.confirmPassword')}
              </label>
              <input
                id="register-confirm"
                type="password"
                name="confirmPassword"
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl bg-background-dark border border-border-dark text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-full transition-all shadow-[0_0_15px_rgba(37,106,244,0.4)]"
            >
              {loading ? '...' : t('auth.register.submit')}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">
            {t('auth.register.hasAccount')}{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              {t('auth.register.logIn')}
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
