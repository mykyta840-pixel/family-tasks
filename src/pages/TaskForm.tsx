import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Flame, ImagePlus, Loader2, Star, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { humanError } from '../lib/errors'
import { useAuth } from '../auth/AuthProvider'
import { useFamilyData } from '../data/FamilyData'
import { useOnline } from '../hooks/useOnline'
import { toLocalInput, type Child, type Repeat, type Task } from '../lib/tasks'
import { useI18n } from '../i18n'
import Avatar from '../components/Avatar'
import { TaskImage } from '../components/NoteCard'
import { removeTaskImage, uploadTaskImage } from '../lib/taskImage'

const REPEATS: Repeat[] = ['none', 'daily', 'weekdays', 'weekly', 'custom']
const DAYS = [1, 2, 3, 4, 5, 6, 0] // Пн ... Вс (0 = воскресенье)
const POINTS = [10, 20, 30, 50]

// Единый вид «чипов» выбора
const chip = (active: boolean, accent: 'brand' | 'star' = 'brand') =>
  `min-h-[44px] rounded-full border px-4 text-sm font-semibold transition duration-fast active:scale-95 ${
    active
      ? accent === 'star'
        ? 'border-star bg-star text-on-brand'
        : 'border-brand bg-brand text-on-brand shadow-glow'
      : 'border-ink/10 bg-surface/70 text-ink/70'
  }`
const LABEL = 'text-sm font-semibold uppercase tracking-wide text-ink/60'

function at(daysAhead: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(hour, 0, 0, 0)
  return toLocalInput(d.toISOString())
}

export default function TaskForm() {
  const { t } = useI18n()
  const { id } = useParams()
  const { tasks, children, loading } = useFamilyData()
  if (loading) return <div className="skeleton h-64" />
  const existing = id ? tasks.find((x) => x.id === id) : undefined
  if (id && !existing) return <p className="glass rounded-card p-6 text-center text-ink/60">{t('form.notFound')}</p>
  return <Form existing={existing} kids={children} />
}

function Form({ existing, kids }: { existing?: Task; kids: Child[] }) {
  const { t } = useI18n()
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
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dropImage, setDropImage] = useState(false)
  const shownImage = preview ?? (dropImage ? null : existing?.image_url ?? null)

  // Предпросмотр выбранного файла; ссылку освобождаем, когда она не нужна
  useEffect(() => {
    if (!imageFile) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(imageFile)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImageFile(file)
    setDropImage(false)
  }

  function onRemoveImage() {
    setImageFile(null)
    setDropImage(true)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (busy || !online || !family || !session) return
    const pts = Number(points)
    if (!childId) return setError(t('form.errChild'))
    if (!Number.isInteger(pts) || pts < 1) return setError(t('form.errPoints'))
    if (repeat === 'custom' && days.length === 0) return setError(t('form.errDays'))
    setBusy(true)
    setError(null)
    let newUrl: string | null = null
    if (imageFile) {
      try {
        newUrl = await uploadTaskImage(family.id, imageFile)
      } catch (err) {
        setError(humanError(err, t))
        setBusy(false)
        return
      }
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      assigned_to: childId,
      points: pts,
      due_at: due ? new Date(due).toISOString() : null,
      repeat,
      repeat_days: repeat === 'custom' ? days : [],
      priority: priority ? 1 : 0,
      // image_url добавляем, только если картинку меняли или убрали; иначе остаётся прежняя
      ...(newUrl ? { image_url: newUrl } : dropImage ? { image_url: null } : {}),
    }
    const { error } = existing
      ? await supabase.from('tasks').update(payload).eq('id', existing.id)
      : await supabase.from('tasks').insert({ ...payload, family_id: family.id, created_by: session.user.id })
    if (error) {
      if (newUrl) void removeTaskImage(newUrl) // задание не сохранилось, новый файл не нужен
      setError(humanError(error, t))
      setBusy(false)
      return
    }
    if ((newUrl || dropImage) && existing?.image_url) void removeTaskImage(existing.image_url) // старый файл больше не нужен
    await reload()
    nav('/tasks', { replace: true })
  }

  async function remove() {
    if (!existing || busy || !online) return
    setBusy(true)
    const { error } = await supabase.from('tasks').delete().eq('id', existing.id)
    if (error) {
      setError(humanError(error, t))
      setBusy(false)
      return
    }
    if (existing.image_url) void removeTaskImage(existing.image_url)
    await reload()
    nav('/tasks', { replace: true })
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">{existing ? t('form.editTitle') : t('form.newTitle')}</h1>
        <button type="button" onClick={() => nav(-1)} className="btn-icon" aria-label={t('form.close')}>
          <X size={20} aria-hidden />
        </button>
      </div>

      <section className="card flex flex-col gap-3">
        <h2 className={LABEL}>{t('form.who')}</h2>
        {kids.length === 0 ? (
          <p className="text-ink/60">{t('form.noKids')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {kids.map((k) => (
              <button
                key={k.id}
                type="button"
                aria-pressed={childId === k.id}
                onClick={() => setChildId(k.id)}
                className={`flex min-h-[48px] items-center gap-2 rounded-full border py-1 pl-1 pr-4 font-medium transition duration-fast active:scale-95 ${
                  childId === k.id ? 'border-brand bg-brand text-on-brand shadow-glow' : 'border-ink/10 bg-surface/70 text-ink'
                }`}
              >
                <Avatar name={k.name} url={k.avatar_url} size={40} />
                {k.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card flex flex-col gap-3">
        <label className={LABEL} htmlFor="t-title">
          {t('form.name')}
        </label>
        <input id="t-title" className="input" placeholder={t('form.namePh')} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} />
        <textarea className="input min-h-[96px] py-3" placeholder={t('form.descPh')} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} aria-label={t('form.descPh')} />
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className={LABEL}>{t('form.image')}</h2>
        {shownImage && <TaskImage url={shownImage} className="aspect-[16/10] w-full rounded-card" iconSize={48} />}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
        <div className={`grid gap-2 ${shownImage ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <button type="button" className="btn-soft px-3" disabled={busy || !online} onClick={() => fileRef.current?.click()}>
            <ImagePlus size={18} aria-hidden /> {shownImage ? t('form.imageChange') : t('form.imageAdd')}
          </button>
          {shownImage && (
            <button type="button" className="btn-danger px-3" disabled={busy} onClick={onRemoveImage}>
              <Trash2 size={18} aria-hidden /> {t('form.imageRemove')}
            </button>
          )}
        </div>
        <p className="text-sm text-ink/50">{t('form.imageHint')}</p>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className={LABEL}>{t('form.reward')}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {POINTS.map((p) => (
            <button key={p} type="button" aria-pressed={points === String(p)} onClick={() => setPoints(String(p))} className={`${chip(points === String(p), 'star')} inline-flex items-center gap-1`}>
              <Star size={14} fill="currentColor" aria-hidden /> {p}
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
            aria-label={t('form.points')}
          />
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className={LABEL}>{t('form.due')}</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: t('form.dueToday'), value: at(0, 18) },
            { label: t('form.dueTomorrow'), value: at(1, 18) },
            { label: t('form.dueNone'), value: '' },
          ].map((o) => (
            <button key={o.label} type="button" aria-pressed={due === o.value} onClick={() => setDue(o.value)} className={chip(due === o.value)}>
              {o.label}
            </button>
          ))}
        </div>
        <input className="input" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} aria-label={t('form.due')} />
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className={LABEL}>{t('form.repeat')}</h2>
        <div className="flex flex-wrap gap-2">
          {REPEATS.map((r) => (
            <button key={r} type="button" aria-pressed={repeat === r} onClick={() => setRepeat(r)} className={chip(repeat === r)}>
              {t(`repeat.${r}`)}
            </button>
          ))}
        </div>
        {repeat === 'custom' && (
          <div className="flex gap-1.5">
            {DAYS.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={days.includes(n)}
                onClick={() => setDays((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]))}
                className={`grid h-11 flex-1 place-items-center rounded-ctl border text-sm font-semibold transition duration-fast active:scale-95 ${
                  days.includes(n) ? 'border-brand bg-brand text-on-brand shadow-glow' : 'border-ink/10 bg-surface/70 text-ink/70'
                }`}
              >
                {t(`day.${n}`)}
              </button>
            ))}
          </div>
        )}
        {repeat !== 'none' && <p className="text-sm text-ink/50">{t('form.repeatHint')}</p>}
      </section>

      <button
        type="button"
        role="switch"
        aria-checked={priority}
        onClick={() => setPriority((p) => !p)}
        className="card flex min-h-[56px] items-center justify-between"
      >
        <span className="inline-flex items-center gap-2 font-medium">
          <Flame size={20} className="text-star" aria-hidden /> {t('form.important')}
        </span>
        <span className={`h-7 w-12 rounded-full p-1 transition duration-base ${priority ? 'bg-brand' : 'bg-ink/15'}`}>
          <span className={`block h-5 w-5 rounded-full bg-on-brand transition duration-base ${priority ? 'translate-x-5' : ''}`} />
        </span>
      </button>

      {error && (
        <p role="alert" className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
          {error}
        </p>
      )}
      <button className="btn-primary" disabled={busy || !online || kids.length === 0}>
        {busy && <Loader2 size={18} className="animate-spin" aria-hidden />}
        {busy ? t('form.saving') : existing ? t('form.save') : t('form.create')}
      </button>

      {existing &&
        (confirmDelete ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-soft px-3" onClick={() => setConfirmDelete(false)}>
              {t('form.keep')}
            </button>
            <button type="button" className="btn-danger px-3" onClick={remove} disabled={busy || !online}>
              {t('form.confirmDelete')}
            </button>
          </div>
        ) : (
          <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={18} aria-hidden /> {t('form.delete')}
          </button>
        ))}
    </form>
  )
}
