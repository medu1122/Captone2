import { useLocale } from '../contexts/LocaleContext'
import type { Locale } from '../i18n/translations'

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <div className="flex items-center rounded-full border border-border-dark bg-surface-dark/80 p-0.5">
      {(['en', 'vi'] as const).map((loc: Locale) => (
        <button
          key={loc}
          type="button"
          onClick={() => setLocale(loc)}
          className={`min-w-[2.25rem] rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            locale === loc
              ? 'bg-primary text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {loc === 'en' ? 'EN' : 'VN'}
        </button>
      ))}
    </div>
  )
}
