import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLocale } from '../contexts/LocaleContext'
import type { AuthUser } from '../api/auth'

type UserMenuProps = {
  user: AuthUser
  onLogout: () => void
}

export default function UserMenu({ user, onLogout }: UserMenuProps) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-300" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-300 text-slate-600 text-sm font-medium">
            {user.name?.[0] ?? user.email?.[0] ?? '?'}
          </div>
        )}
        <span className="text-sm font-medium text-slate-700 truncate max-w-[140px]">{user.name || user.email}</span>
        <span className="text-slate-500 text-lg" aria-hidden>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 py-1 rounded-lg bg-white border border-slate-300 shadow z-50">
            <Link
              to="/dashboard"
              className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              {t('userMenu.dashboard')}
            </Link>
            <Link
              to="/profile"
              className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              {t('userMenu.profile')}
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
              className="block w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 text-left"
            >
              {t('userMenu.logout')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

