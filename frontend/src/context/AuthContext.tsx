import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import { setLastEmail } from '../lib/lastEmail'
import type { User } from '../types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  /** Creates the account; the user must confirm their email before signing in. */
  register: (email: string, password: string) => Promise<void>
  loginWithGoogle: (credential: string, link?: boolean) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Replaces the signed-in user after a settings change. */
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // Remember who signed in on this device to prefill the login form next time.
  useEffect(() => {
    if (user) setLastEmail(user.email)
  }, [user])

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await api.login(email, password)
    setUser(user)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    await api.register(email, password)
  }, [])

  const loginWithGoogle = useCallback(async (credential: string, link = false) => {
    const { user } = await api.google(credential, link)
    setUser(user)
  }, [])

  const verifyEmail = useCallback(async (token: string) => {
    const { user } = await api.verifyEmail(token)
    setUser(user)
  }, [])

  const resetPassword = useCallback(async (token: string, password: string) => {
    const { user } = await api.resetPassword(token, password)
    setUser(user)
  }, [])

  const logout = useCallback(async () => {
    await api.logout().catch(() => {})
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, loginWithGoogle, verifyEmail, resetPassword, logout, setUser }),
    [user, loading, login, register, loginWithGoogle, verifyEmail, resetPassword, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
