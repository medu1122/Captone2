import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi, type AuthUser } from '../api/auth'

const AUTH_TOKEN_KEY = 'aimap_token'

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
  setUser: (user: AuthUser | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null)
  const [token, setTokenState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY)
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(!!token)

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, newToken)
    } catch {
      /* ignore */
    }
    setTokenState(newToken)
    setUserState(newUser)
  }, [])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    } catch {
      /* ignore */
    }
    setTokenState(null)
    setUserState(null)
  }, [])

  const setUser = useCallback((u: AuthUser | null) => {
    setUserState(u)
  }, [])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let cancelled = false
    authApi
      .me(token)
      .then(({ data, status }) => {
        if (cancelled) return
        if (status === 401) {
          try {
            localStorage.removeItem(AUTH_TOKEN_KEY)
          } catch {
            /* ignore */
          }
          setTokenState(null)
          setUserState(null)
          return
        }
        if (data?.success && data.user) setUserState(data.user)
        else setUserState(null)
      })
      .catch(() => {
        if (!cancelled) setUserState(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, login, logout, setUser }),
    [user, token, loading, login, logout, setUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
