import LanguageSwitcher from '../components/LanguageSwitcher'
import { useLocale } from '../contexts/LocaleContext'

export default function HomePage() {
  const { t } = useLocale()

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col antialiased selection:bg-primary/30 selection:text-primary overflow-x-hidden">
      {/* Navbar — 3 mục Features / How it works / Pricing căn giữa */}
      <header className="fixed top-0 left-0 right-0 z-50 glassmorphism px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">auto_awesome</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">AIMAP</span>
        </div>
        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
          <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors" href="#features">{t('nav.features')}</a>
          <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors" href="#how-it-works">{t('nav.howItWorks')}</a>
          <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors" href="#pricing">{t('nav.pricing')}</a>
        </nav>
        <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
          <LanguageSwitcher />
          <a className="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors" href="/login">{t('nav.logIn')}</a>
          <a href="/register" className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold py-2 px-5 rounded-full transition-all shadow-[0_0_15px_rgba(37,106,244,0.4)]">
            {t('nav.getStarted')}
          </a>
        </div>
      </header>

      <main className="flex-grow pt-24 mesh-gradient">
        {/* Hero Section */}
        <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-8">
            <span className="material-symbols-outlined text-sm">rocket_launch</span>
            <span>{t('hero.platformLive')}</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6 max-w-4xl">
            {t('hero.headline')}{' '}
            <br className="hidden md:block" />
            <span className="text-gradient">{t('hero.headlineHighlight')}</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl font-medium leading-relaxed">
            {t('hero.subheadline')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full sm:w-auto">
            <a href="/register" className="bg-primary hover:bg-primary/90 text-white text-base font-semibold py-3.5 px-8 rounded-full transition-all shadow-[0_0_20px_rgba(37,106,244,0.5)] flex items-center justify-center gap-2">
              {t('hero.startAutomating')}
              <span className="material-symbols-outlined">arrow_forward</span>
            </a>
            <button type="button" className="bg-surface-dark border border-border-dark hover:bg-border-dark text-slate-100 text-base font-semibold py-3.5 px-8 rounded-full transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">play_circle</span>
              {t('hero.watchDemo')}
            </button>
          </div>
          {/* Dashboard Mockup */}
          <div className="w-full max-w-5xl relative perspective-1000">
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent z-10" />
            <img
              alt="AI Dashboard showing marketing metrics and generated brand assets"
              className="w-full h-auto rounded-xl border border-border-dark shadow-2xl transform rotate-x-12 scale-105 opacity-80"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBcVWawT1KU4ceOsRet8lGVWPTPwHP9w5v0X50rJJ6BA90JdwB-sfdV5uk4qGnVtB7ZD23-v4eKw_eBhNE0aH26d3kR2W613z9QckkbzcBRJRLyPEIBkaWX8WVMP6xh7hNDISgblZvDD4IFtbjpsh6JmkDYyOsaaZVIhX7wuYE6HROaDJbV-Kv9tiMnfi_SKDvQ1-404C_3RAFfQMiQocvPTgaJOhVqAB1N115oO_0FT2W3png4805oPA6m4RlRQY9YpIEXzztP7YU"
            />
            <div className="absolute top-10 -left-10 bg-surface-dark border border-border-dark p-4 rounded-lg shadow-xl z-20 items-center gap-3 hidden md:flex">
              <div className="w-10 h-10 rounded bg-green-500/20 text-green-500 flex items-center justify-center">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t('hero.websiteGenerated')}</p>
                <p className="text-sm font-bold text-white">{t('hero.inSeconds')}</p>
              </div>
            </div>
            <div className="absolute bottom-20 -right-8 bg-surface-dark border border-border-dark p-4 rounded-lg shadow-xl z-20 items-center gap-3 hidden md:flex">
              <div className="w-10 h-10 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center">
                <span className="material-symbols-outlined">campaign</span>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t('hero.socialCampaign')}</p>
                <p className="text-sm font-bold text-white">{t('hero.scheduled')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Logo Ticker */}
        <section className="py-10 border-y border-border-dark bg-surface-dark/50">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">{t('trust.title')}</p>
            <div className="flex justify-center gap-12 flex-wrap opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              <span className="material-symbols-outlined text-4xl">storefront</span>
              <span className="material-symbols-outlined text-4xl">local_cafe</span>
              <span className="material-symbols-outlined text-4xl">fitness_center</span>
              <span className="material-symbols-outlined text-4xl">restaurant</span>
              <span className="material-symbols-outlined text-4xl">spa</span>
              <span className="material-symbols-outlined text-4xl">pets</span>
            </div>
          </div>
        </section>

        {/* Features (Bento Grid) */}
        <section className="py-32 px-6 max-w-7xl mx-auto" id="features">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('features.title')}</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">{t('features.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
            <div className="md:col-span-2 bg-surface-dark border border-border-dark rounded-2xl p-8 card-glow flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined">edit_document</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">{t('features.unifiedInput')}</h3>
                <p className="text-slate-400">{t('features.unifiedInputDesc')}</p>
              </div>
              <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl z-0 group-hover:bg-primary/20 transition-all duration-500" />
            </div>
            <div className="md:col-span-1 bg-surface-dark border border-border-dark rounded-2xl p-8 card-glow flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-bl from-purple-500/5 to-transparent z-0" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined">palette</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{t('features.aiBranding')}</h3>
                <p className="text-slate-400 text-sm">{t('features.aiBrandingDesc')}</p>
              </div>
            </div>
            <div className="md:col-span-1 bg-surface-dark border border-border-dark rounded-2xl p-8 card-glow flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-transparent z-0" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined">language</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{t('features.aiWebsite')}</h3>
                <p className="text-slate-400 text-sm">{t('features.aiWebsiteDesc')}</p>
              </div>
            </div>
            <div className="md:col-span-2 bg-surface-dark border border-border-dark rounded-2xl p-8 card-glow flex flex-col justify-between overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-tl from-green-500/5 to-transparent z-0" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined">share</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">{t('features.facebookPublish')}</h3>
                <p className="text-slate-400">{t('features.facebookPublishDesc')}</p>
                <div className="mt-auto pt-6 flex gap-2">
                  <div className="h-2 w-full bg-border-dark rounded-full overflow-hidden"><div className="h-full bg-green-500 w-1/3" /></div>
                  <div className="h-2 w-full bg-border-dark rounded-full overflow-hidden"><div className="h-full bg-green-500 w-2/3" /></div>
                  <div className="h-2 w-full bg-border-dark rounded-full overflow-hidden"><div className="h-full bg-green-500 w-full" /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 bg-surface-dark/30 border-y border-border-dark" id="how-it-works">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('how.title')}</h2>
              <p className="text-slate-400">{t('how.subtitle')}</p>
            </div>
            <div className="relative pl-8 md:pl-0">
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-border-dark -translate-x-1/2" />
              <div className="relative flex flex-col md:flex-row items-center justify-between mb-16 w-full">
                <div className="md:w-5/12 text-left md:text-right pr-0 md:pr-8 mb-4 md:mb-0 ml-8 md:ml-0">
                  <h3 className="text-xl font-bold mb-2">{t('how.step1')}</h3>
                  <p className="text-slate-400 text-sm">{t('how.step1Desc')}</p>
                </div>
                <div className="absolute left-0 md:left-1/2 w-8 h-8 rounded-full bg-background-dark border-2 border-primary flex items-center justify-center -translate-x-1/2 z-10">
                  <span className="text-primary text-xs font-bold">1</span>
                </div>
                <div className="md:w-5/12 pl-0 md:pl-8 ml-8 md:ml-0">
                  <div className="bg-surface-dark border border-border-dark p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <span className="material-symbols-outlined text-sm">chat</span>
                      <span className="text-xs font-mono">You</span>
                    </div>
                    <p className="text-sm">&quot;{t('how.exampleChat')}&quot;</p>
                  </div>
                </div>
              </div>
              <div className="relative flex flex-col md:flex-row items-center justify-between mb-16 w-full">
                <div className="md:w-5/12 text-left pr-0 md:pr-8 mb-4 md:mb-0 ml-8 md:ml-0 order-1 md:order-2">
                  <h3 className="text-xl font-bold mb-2">{t('how.step2')}</h3>
                  <p className="text-slate-400 text-sm">{t('how.step2Desc')}</p>
                </div>
                <div className="absolute left-0 md:left-1/2 w-8 h-8 rounded-full bg-background-dark border-2 border-purple-500 flex items-center justify-center -translate-x-1/2 z-10">
                  <span className="text-purple-500 text-xs font-bold">2</span>
                </div>
                <div className="md:w-5/12 pl-0 md:pl-8 ml-8 md:ml-0 order-2 md:order-1 flex justify-end">
                  <div className="flex gap-2 w-full">
                    <div className="flex-1 bg-surface-dark border border-border-dark h-20 rounded-xl flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">brush</span>
                    </div>
                    <div className="flex-1 bg-surface-dark border border-border-dark h-20 rounded-xl flex items-center justify-center text-purple-400">
                      <span className="material-symbols-outlined">code</span>
                    </div>
                    <div className="flex-1 bg-surface-dark border border-border-dark h-20 rounded-xl flex items-center justify-center text-green-400">
                      <span className="material-symbols-outlined">edit</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative flex flex-col md:flex-row items-center justify-between w-full">
                <div className="md:w-5/12 text-left md:text-right pr-0 md:pr-8 mb-4 md:mb-0 ml-8 md:ml-0">
                  <h3 className="text-xl font-bold mb-2">{t('how.step3')}</h3>
                  <p className="text-slate-400 text-sm">{t('how.step3Desc')}</p>
                </div>
                <div className="absolute left-0 md:left-1/2 w-8 h-8 rounded-full bg-primary shadow-[0_0_10px_rgba(37,106,244,0.8)] flex items-center justify-center -translate-x-1/2 z-10 text-white">
                  <span className="material-symbols-outlined text-sm">check</span>
                </div>
                <div className="md:w-5/12 pl-0 md:pl-8 ml-8 md:ml-0">
                  <a href="/register" className="w-full bg-primary/10 border border-primary/30 text-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors">
                    <span className="material-symbols-outlined">rocket_launch</span>
                    {t('how.goLive')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA / Pricing Hint */}
        <section className="py-32 px-6 max-w-5xl mx-auto" id="pricing">
          <div className="bg-gradient-to-br from-primary/20 via-purple-500/10 to-surface-dark border border-border-dark rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 mesh-gradient opacity-50" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-black mb-6">{t('cta.title')}</h2>
              <p className="text-slate-300 mb-10 text-lg max-w-2xl mx-auto">{t('cta.subtitle')}</p>
              <a href="/register" className="bg-white text-slate-900 hover:bg-slate-200 text-lg font-bold py-4 px-10 rounded-full transition-all shadow-lg inline-flex items-center justify-center gap-2">
                {t('cta.createAccount')}
                <span className="material-symbols-outlined">arrow_forward</span>
              </a>
              <p className="mt-4 text-sm text-slate-400">{t('cta.noCard')}</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background-dark border-t border-border-dark py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-80">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xs">auto_awesome</span>
            </div>
            <span className="font-bold text-lg">AIMAP</span>
          </div>
          <p className="text-sm text-slate-500 text-center md:text-left">
            {t('footer.copyright')}
          </p>
          <div className="flex items-center gap-4 text-slate-500">
            <a className="hover:text-white transition-colors" href="#"><span className="material-symbols-outlined">public</span></a>
            <a className="hover:text-white transition-colors" href="#"><span className="material-symbols-outlined">mail</span></a>
          </div>
        </div>
      </footer>
    </div>
  )
}
