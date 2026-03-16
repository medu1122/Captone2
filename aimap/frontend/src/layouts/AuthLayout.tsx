import { Link } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useLocale } from '../contexts/LocaleContext'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useLocale()

  return (
    <div className="bg-white text-slate-900 min-h-screen flex flex-col selection:bg-primary/30 selection:text-primary">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-300 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <img src="/icons/logo-aimap.png" alt="AIMAP logo" className="h-12 w-auto" />
          <span className="font-bold text-xl tracking-tight text-slate-900">AIMAP</span>
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            {t('auth.backHome')}
          </Link>
        </div>
      </header>
      <main className="flex-grow pt-24 flex items-center justify-center px-4 py-12 bg-white">
        {children}
      </main>
    </div>
  )
}
