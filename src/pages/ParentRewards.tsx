import { useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { humanError } from '../lib/errors'
import { useAuth } from '../auth/AuthProvider'
import { useFamilyData } from '../data/FamilyData'
import { useOnline } from '../hooks/useOnline'
import { ICONS, REDEMPTION_UI, formatWhen, type Reward } from '../lib/rewards'
import type { Child } from '../lib/tasks'
import Avatar from '../components/Avatar'
import Sheet from '../components/Sheet'
import RedemptionActions from '../components/RedemptionActions'

const COSTS = [40, 50, 90, 100, 150]

function RewardEditor({ reward, onClose }: { reward?: Reward; onClose: () => void }) {
  const online = useOnline()
  const { family, session } = useAuth()
  const { reload } = useFamilyData()
  const [icon, setIcon] = useState(reward?.icon ?? '🎁')
  const [title, setTitle] = useState(reward?.title ?? '')
  const [description, setDescription] = useState(reward?.description ?? '')
  const [cost, setCost] = useState(String(reward?.cost ?? 50))
  const [active, setActive] = useState(reward?.active ?? true)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (busy || !online || !family || !session) return
    const price = Number(cost)
    if (!Number.isInteger(price) || price < 1) return setError('Укажите стоимость в баллах.')
    setBusy(true)
    setError(null)
    const payload = { title: title.trim(), description: description.trim() || null, icon, cost: price, active }
    const { error } = reward
      ? await supabase.from('rewards').update(payload).eq('id', reward.id)
      : await supabase.from('rewards').insert({ ...payload, family_id: family.id, created_by: session.user.id })
    if (error) {
      setError(humanError(error))
      setBusy(false)
      return
    }
    await reload()
    onClose()
  }

  async function remove() {
    if (!reward || busy || !online) return
    setBusy(true)
    const { error } = await supabase.from('rewards').delete().eq('id', reward.id)
    if (error) {
      setError(humanError(error))
      setBusy(false)
      return
    }
    await reload()
    onClose()
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">{reward ? 'Награда' : 'Новая награда'}</h2>
        <button type="button" onClick={onClose} className="min-h-[44px] px-2 text-ink/60">
          Закрыть
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {ICONS.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIcon(i)}
            className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl transition ${
              icon === i ? 'bg-brand-soft ring-2 ring-brand' : 'bg-white shadow-card'
            }`}
          >
            {i}
          </button>
        ))}
      </div>
      <input className="input" placeholder="Например, 30 минут компьютера" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
      <input className="input" placeholder="Описание (необязательно)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
      <div className="flex flex-wrap gap-2">
        {COSTS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCost(String(c))}
            className={`min-h-[44px] rounded-full px-4 font-semibold transition ${
              cost === String(c) ? 'bg-star text-white' : 'bg-white text-ink/70 shadow-card'
            }`}
          >
            ⭐ {c}
          </button>
        ))}
        <input className="input w-28" type="number" inputMode="numeric" min={1} max={100000} value={cost} onChange={(e) => setCost(e.target.value)} aria-label="Стоимость" />
      </div>
      <button type="button" onClick={() => setActive((a) => !a)} className="flex min-h-[52px] items-center justify-between rounded-2xl bg-white px-4 shadow-card">
        <span className="font-medium">Показывать детям</span>
        <span className={`h-7 w-12 rounded-full p-1 transition ${active ? 'bg-brand' : 'bg-ink/15'}`}>
          <span className={`block h-5 w-5 rounded-full bg-white transition ${active ? 'translate-x-5' : ''}`} />
        </span>
      </button>
      {error && <p className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{error}</p>}
      <button className="btn-primary" disabled={busy || !online}>
        {busy ? 'Сохраняем…' : 'Сохранить'}
      </button>
      {reward &&
        (confirmDelete ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-soft px-3" onClick={() => setConfirmDelete(false)}>
              Не удалять
            </button>
            <button type="button" className="btn-danger px-3" onClick={remove} disabled={busy || !online}>
              Да, удалить
            </button>
          </div>
        ) : (
          <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
            Удалить награду
          </button>
        ))}
    </form>
  )
}

export default function ParentRewards() {
  const { rewards, redemptions, children, loading, reload } = useFamilyData()
  const [editing, setEditing] = useState<Reward | 'new' | null>(null)
  const byId = useMemo(() => new Map<string, Child>(children.map((c) => [c.id, c] as [string, Child])), [children])
  const pending = redemptions.filter((r) => r.status === 'pending')
  const recent = redemptions.filter((r) => r.status !== 'pending').slice(0, 5)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Награды</h1>
        <button className="btn-primary min-h-[44px] px-4 text-sm" onClick={() => setEditing('new')}>
          ➕ Новая
        </button>
      </div>

      {pending.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Запросы на награды</h2>
          {pending.map((r) => {
            const kid = byId.get(r.child_id)
            return (
              <div key={r.id} className="card flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  {kid && <Avatar name={kid.name} url={kid.avatar_url} size={36} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-ink/60">{kid?.name ?? 'Ребёнок'} хочет</div>
                    <div className="font-semibold">
                      {r.icon} {r.title}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-star-soft px-3 py-1 font-display font-semibold text-star">⭐ {r.cost}</span>
                </div>
                <RedemptionActions id={r.id} onDone={() => void reload()} />
              </div>
            )
          })}
        </>
      )}

      <h2 className="text-lg font-semibold">Магазин наград</h2>
      {loading ? (
        <div className="h-32 animate-pulse rounded-card bg-ink/5" />
      ) : rewards.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <div className="text-4xl">🎁</div>
          <p className="text-ink/60">Добавьте первую награду, и дети смогут менять на неё баллы.</p>
          <button className="btn-primary w-full" onClick={() => setEditing('new')}>
            Создать награду
          </button>
        </div>
      ) : (
        rewards.map((r) => (
          <div key={r.id} role="button" tabIndex={0} onClick={() => setEditing(r)} className="card flex cursor-pointer items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-2xl">{r.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{r.title}</div>
              {!r.active && <div className="text-sm text-ink/50">Скрыто от детей</div>}
            </div>
            <span className="shrink-0 rounded-full bg-star-soft px-3 py-1 font-display font-semibold text-star">⭐ {r.cost}</span>
          </div>
        ))
      )}

      {recent.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Недавние запросы</h2>
          {recent.map((r) => (
            <div key={r.id} className="card flex items-center gap-3">
              <div className="text-2xl">{r.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{r.title}</div>
                <div className="text-sm text-ink/50">
                  {byId.get(r.child_id)?.name ?? 'Ребёнок'} · {formatWhen(r.created_at)}
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${REDEMPTION_UI[r.status].cls}`}>
                {REDEMPTION_UI[r.status].label}
              </span>
            </div>
          ))}
        </>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)}>
        {editing !== null && (
          <RewardEditor key={editing === 'new' ? 'new' : editing.id} reward={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
        )}
      </Sheet>
    </div>
  )
}
