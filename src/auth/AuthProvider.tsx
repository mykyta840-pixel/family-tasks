import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Family, Profile, Role } from '../lib/types'
import { detachDevice } from '../lib/push'

interface AuthState {
  session: Session | null
  profile: Profile | null
  family: Family | null
  role: Role | null
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth нужно вызывать внутри AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => undefined) // нет сети: считаем, что входа нет, но экран не зависает
      .finally(() => setReady(true))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id ?? null

  const load = useCallback(async () => {
    if (!uid) {
      setProfile(null)
      setFamily(null)
      setRole(null)
      return
    }
    const [p, m] = await Promise.all([
      supabase.from('profiles').select('id, display_name, avatar_url, bio, language, push_test_done_at').eq('id', uid).maybeSingle(),
      supabase.from('family_members').select('role, family:families(id, name)').eq('user_id', uid).maybeSingle(),
    ])
    if (p.error || m.error) return // при сбое сети оставляем прежние данные
    setProfile(p.data as Profile | null)
    const mem = m.data as { role: Role; family: Family | null } | null
    setFamily(mem?.family ?? null)
    setRole(mem?.role ?? null)
  }, [uid])

  useEffect(() => {
    let alive = true
    load().finally(() => alive && setLoadedFor(uid))
    return () => {
      alive = false
    }
  }, [load, uid])

  // Родитель сменил моё имя/фото/язык: подхватываем сразу, не дожидаясь возврата в приложение
  useEffect(() => {
    if (!uid) return
    const channel = supabase
      .channel(`me-${uid}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` }, () => void load())
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [uid, load])

  // Возвращение сети или в приложение: тихо обновляем данные
  useEffect(() => {
    const refetch = () => {
      if (document.visibilityState === 'visible') void load()
    }
    window.addEventListener('online', refetch)
    document.addEventListener('visibilitychange', refetch)
    return () => {
      window.removeEventListener('online', refetch)
      document.removeEventListener('visibilitychange', refetch)
    }
  }, [load])

  const value: AuthState = {
    session,
    profile,
    family,
    role,
    loading: !ready || (uid !== null && loadedFor !== uid),
    refresh: load,
    signOut: async () => {
      await detachDevice().catch(() => undefined) // устройство больше не получает push этого аккаунта
      await supabase.auth.signOut()
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
