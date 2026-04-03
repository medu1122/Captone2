import LanguageSwitcher from '../components/LanguageSwitcher'
import { useAuth } from '../contexts/AuthContext'
import { useLocale } from '../contexts/LocaleContext'
import UserMenu from '../components/UserMenu'

export default function HomePage() {
  const { t } = useLocale()
  const { user, logout } = useAuth()
  return (
    <div className="bg-white text-slate-900 min-h-screen flex flex-col selection:bg-primary/30 selection:text-primary overflow-x-hidden">
      {/* Header: white, border-bottom */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-300 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-shrink-0">
          <img
            src="/icons/logo-aimap.png"
            alt="AIMAP logo"
            className="h-12 w-auto"
          />
          <span className="font-bold text-xl tracking-tight text-slate-900">AIMAP</span>
        </div>
        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
          <a className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors" href="#features">{t('nav.features')}</a>
          <a className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors" href="#pricing">{t('nav.pricing')}</a>
        </nav>
        <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
          <LanguageSwitcher />
          {user ? (
            <UserMenu user={user} onLogout={logout} />
          ) : (
            <>
              <a className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors" href="/login">{t('nav.logIn')}</a>
              <a href="/register" className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold py-2 px-5 rounded-lg transition-colors">
                {t('nav.getStarted')}
              </a>
            </>
          )}
        </div>
      </header>

      <main className="flex-grow pt-24 bg-white">
        {/* Hero: 2 columns — left text, right pipeline diagram */}
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4">
              {t('hero.headline')}
            </h1>
            <p className="text-base md:text-lg text-slate-600 mb-8 max-w-xl mx-auto lg:mx-0">
              {t('hero.subheadline')}
            </p>
            <div className="flex justify-center lg:justify-start">
              <a href="/register" className="bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-6 rounded-lg border border-slate-400 transition-colors inline-flex items-center justify-center gap-2">
                {t('hero.startAutomating')} →
              </a>
            </div>
          </div>
          {/* Pipeline diagram: Store → Branding → Website → Facebook */}
          <div className="flex-1 w-full max-w-md flex items-center justify-center">
            <div className="bg-white border border-slate-300 rounded-lg p-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">{t('hero.pipelineLabel')}</p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center bg-slate-50">
                    <img src="/icons/store.png" alt="" className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-800">{t('hero.stepStore')}</span>
                </div>
                <div className="flex justify-center text-slate-400">↓</div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center bg-slate-50">
                    <img src="/icons/branding.png" alt="" className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-800">{t('hero.stepBranding')}</span>
                </div>
                <div className="flex justify-center text-slate-400">↓</div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center bg-slate-50">
                    <img src="/icons/website.png" alt="" className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-800">{t('hero.stepWebsite')}</span>
                </div>
                <div className="flex justify-center text-slate-400">↓</div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center bg-slate-50">
                    <img src="/icons/social.png" alt="" className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-800">{t('hero.stepFacebook')}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust / for whom */}
        <section className="py-8 border-y border-slate-300 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-sm font-medium text-slate-500">{t('trust.title')}</p>
          </div>
        </section>

        {/* Features: 4 simple cards */}
        <section className="py-20 px-6 max-w-7xl mx-auto" id="features">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{t('features.title')}</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-sm">{t('features.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-300 rounded-lg p-6">
              <div className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center mb-4 bg-slate-50">
                <img src="/icons/store.png" alt="" className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('features.unifiedInput')}</h3>
              <p className="text-slate-600 text-sm">{t('features.unifiedInputDesc')}</p>
            </div>
            <div className="bg-white border border-slate-300 rounded-lg p-6">
              <div className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center mb-4 bg-slate-50">
                <img src="/icons/branding.png" alt="" className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('features.aiBranding')}</h3>
              <p className="text-slate-600 text-sm">{t('features.aiBrandingDesc')}</p>
            </div>
            <div className="bg-white border border-slate-300 rounded-lg p-6">
              <div className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center mb-4 bg-slate-50">
                <img src="/icons/website.png" alt="" className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('features.aiWebsite')}</h3>
              <p className="text-slate-600 text-sm">{t('features.aiWebsiteDesc')}</p>
            </div>
            <div className="bg-white border border-slate-300 rounded-lg p-6">
              <div className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center mb-4 bg-slate-50">
                <img src="/icons/social.png" alt="" className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('features.facebookPublish')}</h3>
              <p className="text-slate-600 text-sm">{t('features.facebookPublishDesc')}</p>
            </div>
          </div>
        </section>

        {/* CTA / Pricing */}
        <section className="py-20 px-6 max-w-4xl mx-auto" id="pricing">
          <div className="bg-white border border-slate-300 rounded-lg p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">{t('cta.title')}</h2>
            <p className="text-slate-600 mb-6 text-sm max-w-xl mx-auto">{t('cta.subtitle')}</p>
            <a href="/register" className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-8 rounded-lg border border-slate-400 transition-colors">
              {t('cta.createAccount')} →
            </a>
          </div>
        </section>
      </main>

      {/* Footer: flat */}
      <footer className="bg-white border-t border-slate-300 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <img src="/icons/logo-aimap.png" alt="AIMAP logo" className="h-6 w-auto" />
            <span className="font-bold text-slate-900">AIMAP</span>
          </div>
          <a href="/privacy-policy" className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
            {t('footer.privacy')}
          </a>
          <p className="text-sm text-slate-500 text-center sm:text-left">{t('footer.copyright')}</p>
        </div>
      </footer>
    </div>
  )
}
