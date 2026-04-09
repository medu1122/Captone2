import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import PasswordInput from '../components/PasswordInput'
import { useLocale } from '../contexts/LocaleContext'
import { authApi, type RegisterResponse } from '../api/auth'

function getPasswordStrength(pwd: string): 'weak' | 'medium' | 'strong' {
  if (!pwd) return 'weak'
  let score = 0
  if (pwd.length >= 6) score++
  if (pwd.length >= 10) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++
  if (score <= 2) return 'weak'
  if (score <= 4) return 'medium'
  return 'strong'
}

export default function RegisterPage() {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const strength = useMemo(() => getPasswordStrength(password), [password])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    const passwordValue = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value
    if (passwordValue !== confirmPassword) {
      setError(t('auth.register.passwordsDoNotMatch'))
      return
    }
    if (passwordValue.length < 6) {
      setError(t('auth.register.passwordMinLength'))
      return
    }
    if (!name || !email || !passwordValue) return
    setLoading(true)
    const { data, error: err } = await authApi.register({ email, password: passwordValue, name })
    setLoading(false)
    if (err || !data?.success) {
      setError((data as { error?: string })?.error ?? err ?? t('auth.error.registerFailed'))
      return
    }
    navigate('/verify', {
      state: { verificationEmail: (data as RegisterResponse).email },
      replace: true,
    })
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-300 rounded-none p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">{t('auth.register.title')}</h1>
            <p className="text-sm text-slate-600">{t('')}</p>
          </div>
          {error && (
            <p className="mb-4 text-sm text-red-400 bg-red-400/10 rounded-none px-3 py-2">{error}</p>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('auth.register.name')}
              </label>
              <input
                id="register-name"
                type="text"
                name="name"
                required
                autoComplete="name"
                className="w-full px-4 py-3 rounded-none bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('auth.register.email')}
              </label>
              <input
                id="register-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-none bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                placeholder="nguoidung@example.com"
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('auth.register.password')}
              </label>
              <PasswordInput
                id="register-password"
                name="password"
                required
                minLength={6}
                autoComplete="new-password"
                onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
              />
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-none bg-slate-200 dark:bg-slate-600 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      strength === 'weak'
                        ? 'w-1/3 bg-red-500'
                        : strength === 'medium'
                          ? 'w-2/3 bg-amber-500'
                          : 'w-full bg-green-500'
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-medium ${
                    strength === 'weak'
                      ? 'text-red-400'
                      : strength === 'medium'
                        ? 'text-amber-400'
                        : 'text-green-400'
                  }`}
                >
                  {t(`auth.passwordStrength.${strength}`)}
                </span>
              </div>
            </div>
            <div>
              <label htmlFor="register-confirm" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('auth.register.confirmPassword')}
              </label>
              <PasswordInput
                id="register-confirm"
                name="confirmPassword"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-none transition-colors"
            >
              {loading ? '...' : t('auth.register.submit')}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
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
