import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useFamilyData } from '../data/FamilyData'
import { formatWhen } from '../lib/rewards'
import type { Child } from '../lib/tasks'

export default function History() {
  const { role, session } = useAuth()
  const { txns, children, loading } = useFamilyData()
  const [who, setWho] = useState('all')
  const byId = useMemo(() => new Map<string, Child>(children.map((c) => [c.id, c] as [string, Child])), [children])
  const list = role === 'parent' && who !== 'all' ? txns.filter((t) => t.child_id === who) : txns
  const myBalance = children.find((c) => c.id === session?.user.id)?.balance ?? 0

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold">История баллов</h1>

      {role === 'child' && (
        <div className="rounded-card bg-gradient-to-br from-brand to-brand-dark p-5 text-white shadow-card">
          <div className="text-sm opacity-80">Сейчас у меня</div>
          <div className="mt-1 font-display text-4xl font-semibold">⭐ {myBalance}</div>
        </div>
      )}

      {role === 'parent' && children.length > 1 && (
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {[{ id: 'all', name: 'Все' }, ...children].map((c) => (
            <button
              key={c.id}
              onClick={() => setWho(c.id)}
              className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm font-semibold transition ${
                who === c.id ? 'bg-brand text-white' : 'bg-white text-ink/70 shadow-card'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="h-32 animate-pulse rounded-card bg-ink/5" />
      ) : list.length === 0 ? (
        <p className="rounded-2xl bg-ink/5 p-6 text-center text-ink/60">Операций пока нет.</p>
      ) : (
        list.map((t) => (
          <div key={t.id} className="card flex items-center gap-3">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ${t.amount > 0 ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}>
              {t.amount > 0 ? '＋' : '－'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{t.title}</div>
              <div className="text-sm text-ink/50">
                {role === 'parent' && `${byId.get(t.child_id)?.name ?? 'Ребёнок'} · `}
                {formatWhen(t.created_at)}
              </div>
            </div>
            <div className={`shrink-0 font-display font-semibold ${t.amount > 0 ? 'text-ok' : 'text-warn'}`}>
              {t.amount > 0 ? '+' : '−'}
              {Math.abs(t.amount)} ⭐
            </div>
          </div>
        ))
      )}
    </div>
  )
}
