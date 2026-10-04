import { useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useFamilyData } from '../data/FamilyData'
import { callRpc } from '../lib/actions'
import { humanError } from '../lib/errors'
import { REDEMPTION_UI, formatWhen, type Reward } from '../lib/rewards'
import { useOnline } from '../hooks/useOnline'

function RewardItem({ reward, available, requested, onSent }: { reward: Reward; available: number; requested: boolean; onSent: () => void }) {
  const online = useOnline()
  const { reload } = useFamilyData()
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const missing = reward.cost - available

  async function request() {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      await callRpc('request_reward', { p_reward_id: reward.id })
      onSent()
    } catch (e) {
      setError(humanError(e))
    } finally {
      lock.current = false
      setBusy(false)
      await reload()
    }
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-3xl">{reward.icon}</div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-snug">{reward.title}</h3>
          {reward.description && <p className="text-sm text-ink/60">{reward.description}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-star-soft px-3 py-1 font-display font-semibold text-star">⭐ {reward.cost}</span>
      </div>
      {requested ? (
        <button className="btn-soft" disabled>
          Запрос отправлен ⏳
        </button>
      ) : missing > 0 ? (
        <button className="btn-soft" disabled>
          Не хватает {missing} ⭐
        </button>
      ) : (
        <button className="btn-primary" onClick={request} disabled={busy || !online}>
          {busy ? 'Отправляем…' : 'Получить награду'}
        </button>
      )}
      {error && <p className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{error}</p>}
    </div>
  )
}

export default function ChildShop() {
  const { session } = useAuth()
  const { rewards, redemptions, children, loading } = useFamilyData()
  const [notice, setNotice] = useState<string | null>(null)
  const uid = session?.user.id
  const balance = children.find((c) => c.id === uid)?.balance ?? 0
  const mine = redemptions.filter((r) => r.child_id === uid)
  const pending = mine.filter((r) => r.status === 'pending')
  const available = balance - pending.reduce((sum, r) => sum + r.cost, 0)
  const shop = rewards.filter((r) => r.active)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold">Награды</h1>
      <div className="rounded-card bg-gradient-to-br from-brand to-brand-dark p-5 text-white shadow-card">
        <div className="text-sm opacity-80">Мои баллы</div>
        <div className="mt-1 font-display text-4xl font-semibold">⭐ {balance}</div>
        {pending.length > 0 && <div className="mt-1 text-sm opacity-80">Ждут выдачи: {balance - available} ⭐</div>}
      </div>
      {notice && <p className="rounded-2xl bg-ok-soft p-3 text-sm text-ok">{notice}</p>}

      {loading ? (
        <div className="h-32 animate-pulse rounded-card bg-ink/5" />
      ) : shop.length === 0 ? (
        <p className="rounded-2xl bg-ink/5 p-6 text-center text-ink/60">Родители ещё не добавили награды.</p>
      ) : (
        shop.map((r) => (
          <RewardItem
            key={r.id}
            reward={r}
            available={available}
            requested={pending.some((p) => p.reward_id === r.id)}
            onSent={() => setNotice('🎁 Запрос на награду отправлен родителю.')}
          />
        ))
      )}

      {mine.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Мои запросы</h2>
          {mine.slice(0, 8).map((r) => (
            <div key={r.id} className="card flex items-center gap-3">
              <div className="text-2xl">{r.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{r.title}</div>
                <div className="text-sm text-ink/50">{formatWhen(r.created_at)}</div>
                {r.status === 'rejected' && r.reject_reason && <div className="text-sm text-warn">{r.reject_reason}</div>}
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${REDEMPTION_UI[r.status].cls}`}>
                {REDEMPTION_UI[r.status].label}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
