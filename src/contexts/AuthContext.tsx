import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import supabase from '../lib/supabase'
const Context = createContext<{ session: Session | null; loading: boolean }>({
  session: null,
  loading: true,
})
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setSession(data.session)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (active) {
        setSession(s)
        setLoading(false)
      }
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])
  return (
    <Context.Provider value={{ session, loading }}>{children}</Context.Provider>
  )
}
export const useAuth = () => useContext(Context)
