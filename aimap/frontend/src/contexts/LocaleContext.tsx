import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getStoredLocale,
  setStoredLocale,
  translations,
  type Locale,
} from '../i18n/translations'

type LocaleContextValue = {
  locale: Locale
  setLocale: (next: Locale) => void
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    setStoredLocale(next)
  }, [])

  const t = useCallback(
    (key: string) => {
      const map = translations[locale]
      return map[key] ?? translations.en[key] ?? key
    },
    [locale]
  )

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
