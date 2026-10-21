import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth, api, type AuthUser } from '../lib/api'
import type { Profile } from '../types/database.types'

interface AuthContextValue {
  user: AuthUser | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auth.getUser().then((u) => {
      setUser(u)
      setLoading(false)
    })

    const unsubscribe = auth.onChange((u) => setUser(u))
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    let cancelled = false
    api.getProfile(user.id).then((p) => {
      if (!cancelled) setProfile(p)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  async function signInWithGoogle() {
    await auth.signInWithGoogle()
  }

  async function signOut() {
    await auth.signOut()
    setProfile(null)
  }

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
