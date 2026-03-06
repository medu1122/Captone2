import { useState } from 'react'
import { useLocale } from '../contexts/LocaleContext'

interface PasswordInputProps {
  id: string
  name: string
  required?: boolean
  autoComplete?: string
  minLength?: number
  placeholder?: string
  className?: string
  'aria-label'?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function PasswordInput({
  id,
  name,
  required,
  autoComplete = 'new-password',
  minLength,
  placeholder,
  className = '',
  'aria-label': ariaLabel,
  onChange,
}: PasswordInputProps) {
  const { t } = useLocale()
  const [visible, setVisible] = useState(false)
  const baseClass =
    'w-full px-4 py-3 pr-12 rounded-xl bg-background-dark border border-border-dark text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary'
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        placeholder={placeholder}
        className={`${baseClass} ${className}`.trim()}
        aria-label={ariaLabel}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 rounded"
        tabIndex={-1}
        aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
      >
        <span className="material-symbols-outlined text-xl">
          {visible ? 'visibility_off' : 'visibility'}
        </span>
      </button>
    </div>
  )
}
