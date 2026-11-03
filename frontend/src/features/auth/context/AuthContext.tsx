import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'
import { getCurrentSession, signInWithEmail, signOutUser, signUpWithEmail } from '../services/authService'
import type { AuthContextValue, AuthResult, SignInInput, SignUpInput } from '../types/auth'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const initialiseSession = async () => {
      const { data, error } = await getCurrentSession()

      if (!isMounted) {
        return
      }

      if (error) {
        console.error('Failed to initialise auth session', error)
      }

      setSession(data.session)
      setUser(data.session?.user ?? null)
      setIsLoading(false)
    }

    void initialiseSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return
      }

      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (input: SignInInput): Promise<AuthResult> => {
    const { data, error } = await signInWithEmail(input)

    if (error) {
      return {
        error: error as Error,
      }
    }

    const nextUser = data.user

    setSession(data.session)
    setUser(nextUser)

    return {
      error: null,
    }
  }

  const signUp = async (input: SignUpInput): Promise<AuthResult & { session: Session | null }> => {
    const { data, error } = await signUpWithEmail(input)

    if (error) {
      return {
        error: error as Error,
        session: null,
      }
    }

    const nextSession = data.session

    setSession(nextSession)
    setUser(nextSession?.user ?? null)

    return {
      error: null,
      session: nextSession,
      needsEmailConfirmation: !nextSession,
    }
  }

  const signOut = async () => {
    const { error } = await signOutUser()

    if (error) {
      throw error
    }

    setSession(null)
    setUser(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      isLoading,
      signIn,
      signUp,
      signOut,
    }),
    [isLoading, session, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.')
  }

  return context
}
