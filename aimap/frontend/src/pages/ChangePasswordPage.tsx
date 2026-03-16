import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../layouts/AuthLayout'
import PasswordInput from '../components/PasswordInput'
import { useLocale } from '../contexts/LocaleContext'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/auth'

export default function ChangePasswordPage() {
  const { t } = useLocale()
  const { token, logout } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [emailMasked, setEmailMasked] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) return
    setError('')
    setSuccess('')
    if (newPassword !== confirmNewPassword) {
      setError(t('changePassword.error.mismatch'))
      return
    }
    if (newPassword.length < 6) {
      setError(t('changePassword.error.minLength'))
      return
    }
    setLoading(true)
    const { data, error: err } = await authApi.changePasswordRequest(token, {
      currentPassword,
      newPassword,
    })
    setLoading(false)
    if (err || !data?.success) {
      setError((data as { error?: string })?.error ?? err ?? t('changePassword.error.requestFailed'))
      return
    }
    setEmailMasked((data as { emailMasked?: string })?.emailMasked ?? null)
    setSuccess((data as { message?: string })?.message ?? t('changePassword.info.codeSent'))
    setStep(2)
  }

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) return
    setError('')
    setSuccess('')
    if (!code || code.trim().length !== 6) {
      setError(t('changePassword.error.codeFormat'))
      return
    }
    setLoading(true)
    const { data, error: err } = await authApi.changePasswordConfirm(token, {
      code: code.trim(),
      newPassword,
    })
    setLoading(false)
    if (err || !data?.success) {
      setError((data as { error?: string })?.error ?? err ?? t('changePassword.error.confirmFailed'))
      return
    }
    setSuccess(t('changePassword.success'))
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-300 rounded-lg p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">
              {t('changePassword.title')}
            </h1>
            <p className="text-sm text-slate-600">
              {t('changePassword.subtitle')}
            </p>
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="mb-4 text-sm text-green-400 bg-green-400/10 rounded-lg px-3 py-2">
              {success}
            </p>
          )}

          {step === 1 && (
            <form onSubmit={handleRequest} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('changePassword.current')}
                </label>
                <PasswordInput
                  id="current-password"
                  name="currentPassword"
                  required
                  autoComplete="current-password"
                  onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('changePassword.new')}
                </label>
                <PasswordInput
                  id="new-password"
                  name="newPassword"
                  required
                  autoComplete="new-password"
                  minLength={6}
                  onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('changePassword.confirm')}
                </label>
                <PasswordInput
                  id="confirm-new-password"
                  name="confirmNewPassword"
                  required
                  autoComplete="new-password"
                  minLength={6}
                  onChange={(e) => setConfirmNewPassword((e.target as HTMLInputElement).value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? '...' : t('changePassword.requestSubmit')}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleConfirm} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('changePassword.codeTitle')}
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  {t('changePassword.codeSubtitle').replace('{email}', emailMasked || '')}
                </p>
                <input
                  id="change-password-code"
                  type="text"
                  name="code"
                  required
                  maxLength={6}
                  inputMode="numeric"
                  pattern="\d{6}"
                  className="w-full px-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-center text-lg tracking-widest"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? '...' : t('changePassword.confirmSubmit')}
              </button>
            </form>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}

