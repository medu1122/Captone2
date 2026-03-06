import { Link } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useLocale } from '../contexts/LocaleContext'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useLocale()

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display min-h-screen flex flex-col antialiased selection:bg-primary/30 selection:text-primary">
      <header className="fixed top-0 left-0 right-0 z-50 glassmorphism px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">auto_awesome</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">AIMAP</span>
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors"
          >
            {t('auth.backHome')}
          </Link>
        </div>
      </header>
      <main className="flex-grow pt-24 mesh-gradient flex items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  )
}
