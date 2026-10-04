import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export interface Notice {
  id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}

interface Ctx {
  items: Notice[]
  unread: number
  toast: Notice | null
  dismissToast: () => void
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  remove: (id: string) => Promise<void>
  clearAll: () => Promise<void>
}

const NotificationsCtx = createContext<Ctx | null>(null)

export function useNotifications(): Ctx {
  const ctx = useContext(NotificationsCtx)
  if (!ctx) throw new Error('useNotifications нужно вызывать внутри NotificationsProvider')
  return ctx
}

const FIELDS = 'id, type, title, body, data, read_at, created_at'

export function NotificationsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [items, setItems] = useState<Notice[]>([])
  const [toast, setToast] = useState<Notice | null>(null)
  const seen = useRef<Set<string>>(new Set())
  const first = useRef(true)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select(FIELDS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error || !data) return // при сбое сети оставляем прежний список
    const list = data as Notice[]
    list.forEach((n) => seen.current.add(n.id))
    setItems(list)
  }, [userId])

  // Realtime: новое уведомление появляется сразу и показывается всплывающей плашкой.
  useEffect(() => {
    let timer: number | undefined
    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void load(), 150)
    }
    void load().then(() => {
      first.current = false
    })
    const channel = supabase.channel(`notif-${userId}-${Math.random().toString(36).slice(2)}`)
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => {
        const n = payload.new as Notice
        if (!n?.id || seen.current.has(n.id)) return
        seen.current.add(n.id)
        setItems((prev) => [n, ...prev.filter((p) => p.id !== n.id)].slice(0, 50))
        if (!first.current) setToast(n)
      },
    )
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      schedule,
    )
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') schedule() // подхватываем то, что пришло, пока не было связи
    })
    const onVisible = () => {
      if (document.visibilityState === 'visible') schedule()
    }
    window.addEventListener('online', schedule)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('online', schedule)
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [userId, load])

  // Плашка сама исчезает через 5 секунд
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(t)
  }, [toast])

  const markRead = useCallback(
    async (id: string) => {
      const now = new Date().toISOString()
      setItems((prev) => prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: now } : n)))
      const { error } = await supabase.from('notifications').update({ read_at: now }).eq('id', id).is('read_at', null)
      if (error) void load()
    },
    [load],
  )

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })))
    const { error } = await supabase.from('notifications').update({ read_at: now }).eq('user_id', userId).is('read_at', null)
    if (error) void load()
  }, [userId, load])

  const remove = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((n) => n.id !== id))
      const { error } = await supabase.from('notifications').delete().eq('id', id)
      if (error) void load()
    },
    [load],
  )

  const clearAll = useCallback(async () => {
    setItems([])
    const { error } = await supabase.from('notifications').delete().eq('user_id', userId)
    if (error) void load()
  }, [userId, load])

  const unread = items.filter((n) => !n.read_at).length

  return (
    <NotificationsCtx.Provider
      value={{ items, unread, toast, dismissToast: () => setToast(null), markRead, markAllRead, remove, clearAll }}
    >
      {children}
    </NotificationsCtx.Provider>
  )
}
