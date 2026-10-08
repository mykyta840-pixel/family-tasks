import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, urlAuth } from '../lib/supabase'
import type { Family, Profile, Role } from '../lib/types'
import { detachDevice } from '../lib/push'

interface AuthState {
  session: Session | null
  profile: Profile | null
  family: Family | null
  role: Role | null
  loading: boolean
  /** Вход без почты и пароля (ребёнок по коду): такой аккаунт держится только на этом устройстве */
  isAnonymous: boolean
  /** Идёт вход по коду: экран входа не должен исчезать, пока сессия переключается */
  joining: boolean
  setJoining: (v: boolean) => void
  /** Человек открыл ссылку «восстановить пароль» и должен задать новый пароль, прежде чем пользоваться приложением */
  recovery: boolean
  finishRecovery: () => void
  /** Перечитать профиль и семью. forUid нужен сразу после смены входа (регистрация родителя по коду), пока экран ещё не обновился. */
  refresh: (forUid?: string) => Promise<void>
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
  const [recovery, setRecovery] = useState(urlAuth.recovery)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => undefined) // нет сети: считаем, что входа нет, но экран не зависает
      .finally(() => setReady(true))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') setRecovery(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Ссылка из письма не открыла сессию (устарела): флаг «задайте новый пароль» не должен дожидаться следующего входа
  useEffect(() => {
    if (ready && !session) setRecovery(false)
  }, [ready, session])

  const uid = session?.user.id ?? null
  const isAnonymous = Boolean((session?.user as { is_anonymous?: boolean } | undefined)?.is_anonymous)

  // Свежим считается только последний запрос: поздний ответ на старый запрос не должен затереть новые данные
  const seq = useRef(0)
  const loadFor = useCallback(async (id: string | null) => {
    const mine = ++seq.current
    if (!id) {
      setProfile(null)
      setFamily(null)
      setRole(null)
      return
    }
    const [p, m] = await Promise.all([
      supabase.from('profiles').select('id, display_name, avatar_url, bio, language, push_test_done_at').eq('id', id).maybeSingle(),
      supabase.from('family_members').select('role, family:families(id, name)').eq('user_id', id).maybeSingle(),
    ])
    if (mine !== seq.current) return // за это время запросили данные заново
    if (p.error || m.error) return // при сбое сети оставляем прежние данные
    setProfile(p.data as Profile | null)
    const mem = m.data as { role: Role; family: Family | null } | null
    setFamily(mem?.family ?? null)
    setRole(mem?.role ?? null)
  }, [])
  const load = useCallback(() => loadFor(uid), [loadFor, uid])
  // Адрес функции меняется только вместе со сменой входа (как раньше у load): на неё подписаны эффекты в других местах
  const refresh = useCallback((forUid?: string) => (forUid ? loadFor(forUid) : load()), [loadFor, load])

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
    isAnonymous,
    joining,
    setJoining,
    recovery,
    finishRecovery: () => setRecovery(false),
    refresh,
    signOut: async () => {
      await detachDevice().catch(() => undefined) // устройство больше не получает push этого аккаунта
      await supabase.auth.signOut()
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
