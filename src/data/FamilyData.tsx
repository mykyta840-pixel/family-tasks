import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Child, Task } from '../lib/tasks'
import type { Redemption, Reward, Txn } from '../lib/rewards'

interface Data {
  tasks: Task[]
  children: Child[]
  rewards: Reward[]
  redemptions: Redemption[]
  txns: Txn[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  now: number // обновляется раз в минуту, чтобы «Просрочено» появлялось само
}

const Ctx = createContext<Data | null>(null)

export function useFamilyData(): Data {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useFamilyData нужно вызывать внутри FamilyDataProvider')
  return ctx
}

interface MemberRow {
  user_id: string
  profiles: { display_name: string; avatar_url: string | null } | null
}

export function FamilyDataProvider({ familyId, children: content }: { familyId: string; children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [kids, setKids] = useState<Child[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [txns, setTxns] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(t)
  }, [])

  const load = useCallback(async () => {
    const [t, m, b, rw, rd, tx] = await Promise.all([
      supabase.from('tasks').select('*').eq('family_id', familyId).order('due_at', { ascending: true, nullsFirst: false }),
      supabase.from('family_members').select('user_id, profiles(display_name, avatar_url)').eq('family_id', familyId).eq('role', 'child'),
      supabase.from('child_balances').select('child_id, balance').eq('family_id', familyId),
      supabase.from('rewards').select('*').eq('family_id', familyId).order('cost', { ascending: true }),
      supabase.from('reward_redemptions').select('*').eq('family_id', familyId).order('created_at', { ascending: false }).limit(100),
      supabase.from('points_transactions').select('id, child_id, amount, kind, title, created_at').eq('family_id', familyId).order('created_at', { ascending: false }).limit(100),
    ])
    if (t.error || m.error || b.error || rw.error || rd.error || tx.error) {
      setError('Не удалось обновить данные. Проверьте интернет.')
      setLoading(false)
      return
    }
    const balances = new Map<string, number>((b.data ?? []).map((r) => [r.child_id as string, r.balance as number]))
    setTasks((t.data ?? []) as Task[])
    setRewards((rw.data ?? []) as Reward[])
    setRedemptions((rd.data ?? []) as Redemption[])
    setTxns((tx.data ?? []) as Txn[])
    setKids(
      ((m.data ?? []) as unknown as MemberRow[]).map((r) => ({
        id: r.user_id,
        name: r.profiles?.display_name ?? 'Ребёнок',
        avatar_url: r.profiles?.avatar_url ?? null,
        balance: balances.get(r.user_id) ?? 0,
      })),
    )
    setError(null)
    setLoading(false)
  }, [familyId])

  // Realtime: изменения заданий, баллов, наград и состава семьи сразу появляются на всех телефонах.
  // После потери и возврата связи подписка восстанавливается сама и данные перезагружаются.
  useEffect(() => {
    let timer: number | undefined
    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void load(), 150)
    }
    void load()
    const channel = supabase.channel(`fam-${familyId}-${Math.random().toString(36).slice(2)}`)
    for (const table of ['tasks', 'points_transactions', 'family_members', 'rewards', 'reward_redemptions']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `family_id=eq.${familyId}` }, schedule)
    }
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') schedule()
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
  }, [familyId, load])

  return (
    <Ctx.Provider value={{ tasks, children: kids, rewards, redemptions, txns, loading, error, reload: load, now }}>
      {content}
    </Ctx.Provider>
  )
}
