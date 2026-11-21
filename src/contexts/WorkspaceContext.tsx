import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { useAuth } from './AuthContext'
import type { Workspace } from '../lib/planner'
import supabase from '../lib/supabase'
type Mutation = Record<string, unknown>
type Ctx = {
  data: Workspace | null
  error: string
  saving: boolean
  reload: () => Promise<void>
  save: (body: Mutation, message: string, method?: string) => Promise<boolean>
  notify: (message: string, error?: boolean) => void
}
const Context = createContext<Ctx>(null!)
function guestKey() {
  let k = localStorage.getItem('leanmonth.private-workspace')
  if (!k || !/^[a-f0-9]{64}$/.test(k)) {
    k = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('')
    localStorage.setItem('leanmonth.private-workspace', k)
  }
  return k
}
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth(),
    [data, setData] = useState<Workspace | null>(null),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false),
    [toast, setToast] = useState<{ message: string; error: boolean } | null>(
      null,
    )
  const live = useRef(true),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    busy = useRef(false)
  const userId = session?.user.id
  const request = useCallback(
    async (method = 'GET', body?: Mutation) => {
      const { data: auth } = await supabase.auth.getSession()
      if (auth.session?.user.id !== userId)
        throw new Error('Your account has changed. Reopen this workspace.')
      const res = await fetch('/api/workspace', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: auth.session
            ? `Bearer ${auth.session.access_token}`
            : `Guest ${guestKey()}`,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: 'no-store',
      })
      const value = await res
        .json()
        .catch(() => ({
          error: 'The planner could not connect. Please try again.',
        }))
      if (!res.ok)
        throw Object.assign(
          new Error(value.error || 'Unable to save your changes.'),
          { status: res.status },
        )
      return value as Workspace
    },
    [userId],
  )
  const reload = useCallback(async () => {
    try {
      const d = await request()
      if (live.current) {
        setData(d)
        setError('')
      }
    } catch (e) {
      if (live.current)
        setError(
          e instanceof Error
            ? e.message
            : 'Unable to connect to your workspace.',
        )
    }
  }, [request])
  useEffect(() => {
    live.current = true
    const start = window.setTimeout(() => { void reload() }, 0)
    return () => {
      live.current = false
      window.clearTimeout(start)
      clearTimeout(timer.current)
    }
  }, [reload])
  const notify = useCallback((message: string, isError = false) => {
    clearTimeout(timer.current)
    setToast({ message, error: isError })
    timer.current = setTimeout(() => setToast(null), isError ? 7500 : 4000)
  }, [])
  const save = async (body: Mutation, message: string, method = 'PUT') => {
    if (!data || busy.current) return false
    busy.current = true
    setSaving(true)
    try {
      const updated = await request(method, {
        ...body,
        revision: data.revision,
      })
      if (!live.current) return false
      setData(updated)
      await reload()
      if (live.current) notify(message)
      return true
    } catch (e) {
      if (live.current) {
        if ((e as { status?: number }).status === 409) await reload()
        notify(
          e instanceof Error ? e.message : 'Changes could not be saved.',
          true,
        )
      }
      return false
    } finally {
      busy.current = false
      if (live.current) setSaving(false)
    }
  }
  return (
    <Context.Provider value={{ data, error, saving, save, reload, notify }}>
      {children}
      {toast && (
        <div
          className={`toast ${toast.error ? 'toast-error' : ''}`}
          role={toast.error ? 'alert' : 'status'}
        >
          {toast.error ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
          <button
            className="icon-btn"
            aria-label="Dismiss message"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </Context.Provider>
  )
}
export const useWorkspace = () => useContext(Context)
export function usePlan() {
  return useWorkspace().data!
}
