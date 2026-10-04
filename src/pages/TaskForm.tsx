import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { humanError } from '../lib/errors'
import { useAuth } from '../auth/AuthProvider'
import { useFamilyData } from '../data/FamilyData'
import { useOnline } from '../hooks/useOnline'
import { toLocalInput, type Child, type Repeat, type Task } from '../lib/tasks'
import Avatar from '../components/Avatar'

const REPEATS: { key: Repeat; label: string }[] = [
  { key: 'none', label: 'Не повторять' },
  { key: 'daily', label: 'Каждый день' },
  { key: 'weekdays', label: 'По будням' },
  { key: 'weekly', label: 'Раз в неделю' },
  { key: 'custom', label: 'Выбрать дни' },
]
const DAYS: { n: number; label: string }[] = [
  { n: 1, label: 'Пн' },
  { n: 2, label: 'Вт' },
  { n: 3, label: 'Ср' },
  { n: 4, label: 'Чт' },
  { n: 5, label: 'Пт' },
  { n: 6, label: 'Сб' },
  { n: 0, label: 'Вс' },
]
const POINTS = [10, 20, 30, 50]

function at(daysAhead: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(hour, 0, 0, 0)
  return toLocalInput(d.toISOString())
}

export default function TaskForm() {
  const { id } = useParams()
  const { tasks, children, loading } = useFamilyData()
  if (loading) return <div className="h-40 animate-pulse rounded-card bg-ink/5" />
  const existing = id ? tasks.find((t) => t.id === id) : undefined
  if (id && !existing) return <p className="rounded-2xl bg-ink/5 p-6 text-center text-ink/60">Задание не найдено.</p>
  return <Form existing={existing} kids={children} />
}

function Form({ existing, kids }: { existing?: Task; kids: Child[] }) {
  const nav = useNavigate()
  const online = useOnline()
  const { family, session } = useAuth()
  const { reload } = useFamilyData()

  const [childId, setChildId] = useState(existing?.assigned_to ?? (kids.length === 1 ? kids[0].id : ''))
  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [points, setPoints] = useState(String(existing?.points ?? 20))
  const [due, setDue] = useState(existing?.due_at ? toLocalInput(existing.due_at) : at(0, 18))
  const [repeat, setRepeat] = useState<Repeat>(existing?.repeat ?? 'none')
  const [days, setDays] = useState<number[]>(existing?.repeat_days ?? [])
  const [priority, setPriority] = useState(existing?.priority === 1)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    if (busy || !online || !family || !session) return
    const pts = Number(points)
    if (!childId) return setError('Выберите, для кого задание.')
    if (!Number.isInteger(pts) || pts < 1) return setError('Укажите количество баллов.')
    if (repeat === 'custom' && days.length === 0) return setError('Выберите дни повторения.')
    setBusy(true)
    setError(null)
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      assigned_to: childId,
      points: pts,
      due_at: due ? new Date(due).toISOString() : null,
      repeat,
      repeat_days: repeat === 'custom' ? days : [],
      priority: priority ? 1 : 0,
    }
    const { error } = existing
      ? await supabase.from('tasks').update(payload).eq('id', existing.id)
      : await supabase.from('tasks').insert({ ...payload, family_id: family.id, created_by: session.user.id })
    if (error) {
      setError(humanError(error))
      setBusy(false)
      return
    }
    await reload()
    nav('/tasks', { replace: true })
  }

  async function remove() {
    if (!existing || busy || !online) return
    setBusy(true)
    const { error } = await supabase.from('tasks').delete().eq('id', existing.id)
    if (error) {
      setError(humanError(error))
      setBusy(false)
      return
    }
    await reload()
    nav('/tasks', { replace: true })
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">{existing ? 'Задание' : 'Новое задание'}</h1>
        <button type="button" onClick={() => nav(-1)} className="min-h-[44px] px-2 text-ink/60">
          Закрыть
        </button>
      </div>

      <section className="flex flex-col gap-2">
        <label className="font-semibold">Для кого</label>
        {kids.length === 0 ? (
          <p className="rounded-2xl bg-ink/5 p-4 text-ink/60">Сначала пригласите ребёнка во вкладке «Семья».</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {kids.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setChildId(k.id)}
                className={`flex min-h-[48px] items-center gap-2 rounded-full py-1 pl-1 pr-4 font-medium transition ${
                  childId === k.id ? 'bg-brand text-white' : 'bg-white text-ink shadow-card'
                }`}
              >
                <Avatar name={k.name} url={k.avatar_url} size={40} />
                {k.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <label className="font-semibold" htmlFor="t-title">
          Название
        </label>
        <input id="t-title" className="input" placeholder="Например, убрать комнату" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} />
        <textarea className="input min-h-[96px] py-3" placeholder="Описание (необязательно)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
      </section>

      <section className="flex flex-col gap-2">
        <label className="font-semibold">Награда</label>
        <div className="flex flex-wrap gap-2">
          {POINTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPoints(String(p))}
              className={`min-h-[44px] rounded-full px-4 font-semibold transition ${
                points === String(p) ? 'bg-star text-white' : 'bg-white text-ink/70 shadow-card'
              }`}
            >
              ⭐ {p}
            </button>
          ))}
          <input
            className="input w-28"
            inputMode="numeric"
            type="number"
            min={1}
            max={10000}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            aria-label="Баллы"
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <label className="font-semibold">Срок</label>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Сегодня 18:00', value: at(0, 18) },
            { label: 'Завтра 18:00', value: at(1, 18) },
            { label: 'Без срока', value: '' },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setDue(o.value)}
              className={`min-h-[44px] rounded-full px-4 text-sm font-semibold transition ${
                due === o.value ? 'bg-brand text-white' : 'bg-white text-ink/70 shadow-card'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <input className="input" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
      </section>

      <section className="flex flex-col gap-2">
        <label className="font-semibold">Повторение</label>
        <div className="flex flex-wrap gap-2">
          {REPEATS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRepeat(r.key)}
              className={`min-h-[44px] rounded-full px-4 text-sm font-semibold transition ${
                repeat === r.key ? 'bg-brand text-white' : 'bg-white text-ink/70 shadow-card'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {repeat === 'custom' && (
          <div className="flex gap-1.5">
            {DAYS.map((d) => (
              <button
                key={d.n}
                type="button"
                onClick={() => setDays((cur) => (cur.includes(d.n) ? cur.filter((x) => x !== d.n) : [...cur, d.n]))}
                className={`grid h-11 flex-1 place-items-center rounded-xl text-sm font-semibold transition ${
                  days.includes(d.n) ? 'bg-brand text-white' : 'bg-white text-ink/70 shadow-card'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
        {repeat !== 'none' && (
          <p className="text-sm text-ink/50">Следующее задание появится, когда вы подтвердите это.</p>
        )}
      </section>

      <button type="button" onClick={() => setPriority((p) => !p)} className="flex min-h-[52px] items-center justify-between rounded-2xl bg-white px-4 shadow-card">
        <span className="font-medium">🔥 Важное задание</span>
        <span className={`h-7 w-12 rounded-full p-1 transition ${priority ? 'bg-brand' : 'bg-ink/15'}`}>
          <span className={`block h-5 w-5 rounded-full bg-white transition ${priority ? 'translate-x-5' : ''}`} />
        </span>
      </button>

      {error && <p className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{error}</p>}
      <button className="btn-primary" disabled={busy || !online || kids.length === 0}>
        {busy ? 'Сохраняем…' : existing ? 'Сохранить' : 'Создать задание'}
      </button>

      {existing &&
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
            Удалить задание
          </button>
        ))}
    </form>
  )
}
