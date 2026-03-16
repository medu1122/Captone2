import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { authApi, type AuthUser } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../contexts/LocaleContext'
export default function ProfilePage() {
  const { user, token, setUser } = useAuth()
  const { t } = useLocale()

  const [profile, setProfile] = useState<AuthUser | null>(user)
  const [isEditing, setIsEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadMe() {
      if (!token) return
      const { data } = await authApi.me(token)
      if (!cancelled && data?.success && data.user) {
        setProfile(data.user)
        setUser(data.user)
      }
    }
    if (!profile && token) {
      loadMe()
    }
    return () => {
      cancelled = true
    }
  }, [token, profile, setUser])

  if (!profile) return null

  const loginEmail = profile.loginEmail || profile.email

  function handleFieldChange<K extends keyof AuthUser>(key: K, value: AuthUser[K]) {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token || !profile) return
    setSavingProfile(true)
    setSuccessMessage(null)
    setErrorMessage(null)
    const body = {
      name: profile.name,
      phone: profile.phone,
      avatarUrl: profile.avatarUrl,
      address: profile.address,
      city: profile.city,
      district: profile.district,
      country: profile.country,
      postalCode: profile.postalCode,
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      companyName: profile.companyName,
      bio: profile.bio,
      timezone: profile.timezone,
      locale: profile.locale,
    }
    const { data, error } = await authApi.updateMe(token, body)
    if (error || !data?.success) {
      setErrorMessage((data as { error?: string })?.error ?? error ?? t('profile.saveError'))
    } else {
      setSuccessMessage(t('profile.saveSuccess'))
      setUser({ ...(profile as AuthUser) })
      setIsEditing(false)
    }
    setSavingProfile(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Account overview: left = avatar + info, right = Change password */}
      <div className="bg-white border border-slate-300 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className="w-20 h-20 rounded-full object-cover border border-slate-300"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border border-slate-300 text-slate-600 text-2xl font-semibold">
                {profile.name?.[0] ?? loginEmail?.[0] ?? '?'}
              </div>
            )}
            <div className="space-y-1">
              <h1 className="text-lg font-semibold text-slate-900">{t('profile.title')}</h1>
              <p className="text-xl font-semibold text-slate-900">
                {profile.name || loginEmail}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-medium">{t('profile.loginEmailLabel')}: </span>
                {loginEmail}
              </p>
              <p className="text-xs text-slate-500">{t('profile.subtitle')}</p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Link
              to="/change-password"
              className="inline-block px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
            >
              {t('profile.changePassword')}
            </Link>
          </div>
        </div>
      </div>

      {/* Personal information */}
      <div className="bg-white border border-slate-300 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              {t('profile.personalInfoTitle')}
            </h2>
            <p className="text-xs text-slate-500">
              {t('profile.personalInfoSubtitle')}
            </p>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-block px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 flex-shrink-0"
            >
              {t('profile.editProfile')}
            </button>
          )}
        </div>
        <form className="space-y-5" onSubmit={handleSaveProfile}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('profile.nameLabel')}
              </label>
              <input
                type="text"
                required
                readOnly={!isEditing}
                className={`w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 ${!isEditing ? 'bg-slate-50 cursor-default' : 'bg-white'}`}
                value={profile.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('profile.phoneLabel')}
              </label>
              <input
                type="tel"
                readOnly={!isEditing}
                className={`w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 ${!isEditing ? 'bg-slate-50 cursor-default' : 'bg-white'}`}
                value={profile.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('profile.companyNameLabel')}
              </label>
              <input
                type="text"
                readOnly={!isEditing}
                className={`w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 ${!isEditing ? 'bg-slate-50 cursor-default' : 'bg-white'}`}
                value={profile.companyName || ''}
                onChange={(e) => handleFieldChange('companyName', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('profile.addressLabel')}
            </label>
            <textarea
              rows={2}
              readOnly={!isEditing}
              className={`w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 min-h-[80px] ${!isEditing ? 'bg-slate-50 cursor-default' : 'bg-white'}`}
              value={profile.address || ''}
              onChange={(e) => handleFieldChange('address', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('profile.cityLabel')}
              </label>
              <input
                type="text"
                readOnly={!isEditing}
                className={`w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 ${!isEditing ? 'bg-slate-50 cursor-default' : 'bg-white'}`}
                value={profile.city || ''}
                onChange={(e) => handleFieldChange('city', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('profile.districtLabel')}
              </label>
              <input
                type="text"
                readOnly={!isEditing}
                className={`w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 ${!isEditing ? 'bg-slate-50 cursor-default' : 'bg-white'}`}
                value={profile.district || ''}
                onChange={(e) => handleFieldChange('district', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('profile.postalCodeLabel')}
              </label>
              <input
                type="text"
                readOnly={!isEditing}
                className={`w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 ${!isEditing ? 'bg-slate-50 cursor-default' : 'bg-white'}`}
                value={profile.postalCode || ''}
                onChange={(e) => handleFieldChange('postalCode', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('profile.countryLabel')}
              </label>
              <input
                type="text"
                readOnly={!isEditing}
                className={`w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 ${!isEditing ? 'bg-slate-50 cursor-default' : 'bg-white'}`}
                value={profile.country || 'Vietnam'}
                onChange={(e) => handleFieldChange('country', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('profile.timezoneLabel')}
              </label>
              <input
                type="text"
                readOnly={!isEditing}
                className={`w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 ${!isEditing ? 'bg-slate-50 cursor-default' : 'bg-white'}`}
                value={profile.timezone || 'Asia/Ho_Chi_Minh'}
                onChange={(e) => handleFieldChange('timezone', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('profile.bioLabel')}
            </label>
            <textarea
              rows={3}
              readOnly={!isEditing}
              className={`w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 ${!isEditing ? 'bg-slate-50 cursor-default' : 'bg-white'}`}
              value={profile.bio || ''}
              onChange={(e) => handleFieldChange('bio', e.target.value)}
            />
          </div>

          {errorMessage && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              {successMessage}
            </p>
          )}

          {isEditing && (
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setProfile(user ?? profile)
                }}
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
              >
                {t('profile.cancelButton')}
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
              >
                {savingProfile ? '...' : t('profile.savePersonalInfo')}
              </button>
            </div>
          )}
        </form>
      </div>

    </div>
  )
}

