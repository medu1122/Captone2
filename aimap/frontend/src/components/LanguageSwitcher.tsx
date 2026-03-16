import { useLocale } from '../contexts/LocaleContext'
import type { Locale } from '../i18n/translations'

const FLAG_SRC: Record<Locale, string> = {
  en: '/icons/flag-en.png',
  vi: '/icons/flag-vn.png',
}

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <div className="flex items-center rounded-full border border-slate-300 bg-white p-0.5">
      {(['en', 'vi'] as const).map((loc: Locale) => (
        <button
          key={loc}
          type="button"
          onClick={() => setLocale(loc)}
          className={`flex items-center gap-1.5 min-w-[2.7rem] rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            locale === loc
              ? 'bg-slate-800 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <img
            src={FLAG_SRC[loc]}
            alt={loc === 'en' ? 'English' : 'Tiếng Việt'}
            className="w-3.5 h-3.5 rounded-sm"
          />
          <span>{loc === 'en' ? 'EN' : 'VN'}</span>
        </button>
      ))}
    </div>
  )
}
