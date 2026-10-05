import { useMemo, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, EyeOff, Gift, Hourglass, Loader2, Plus, Star, Trash2, X, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { humanError } from '../lib/errors'
import { useAuth } from '../auth/AuthProvider'
import { useFamilyData } from '../data/FamilyData'
import { useOnline } from '../hooks/useOnline'
import { useI18n } from '../i18n'
import RewardIcon from '../components/RewardIcon'
import { ICONS, REDEMPTION_UI, formatWhenI18n, type Reward } from '../lib/rewards'
import type { Child } from '../lib/tasks'
import Avatar from '../components/Avatar'
import Sheet from '../components/Sheet'
import RedemptionActions from '../components/RedemptionActions'

const COSTS = [40, 50, 90, 100, 150]
const RED_ICON = { pending: Hourglass, approved: CheckCircle2, rejected: XCircle }
const LABEL = 'text-sm font-semibold uppercase tracking-wide text-ink/60'

const chip = (active: boolean) =>
  `inline-flex min-h-[44px] items-center gap-1 rounded-full border px-4 text-sm font-semibold transition duration-fast active:scale-95 ${
    active ? 'border-star bg-star text-on-brand' : 'border-ink/10 bg-surface/70 text-ink/70'
  }`

function RewardEditor({ reward, onClose }: { reward?: Reward; onClose: () => void }) {
  const { t } = useI18n()
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
    if (!Number.isInteger(price) || price < 1) return setError(t('rew.errCost'))
    setBusy(true)
    setError(null)
    const payload = { title: title.trim(), description: description.trim() || null, icon, cost: price, active }
    const { error } = reward
      ? await supabase.from('rewards').update(payload).eq('id', reward.id)
      : await supabase.from('rewards').insert({ ...payload, family_id: family.id, created_by: session.user.id })
    if (error) {
      setError(humanError(error, t))
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
      setError(humanError(error, t))
      setBusy(false)
      return
    }
    await reload()
    onClose()
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">{reward ? t('rew.editTitle') : t('rew.newTitle')}</h2>
        <button type="button" onClick={onClose} className="btn-icon" aria-label={t('form.close')}>
          <X size={20} aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className={LABEL}>{t('rew.icon')}</span>
        <div className="flex flex-wrap gap-2">
          {ICONS.map((i) => (
            <button
              key={i}
              type="button"
              aria-pressed={icon === i}
              onClick={() => setIcon(i)}
              className={`grid h-12 w-12 place-items-center rounded-ctl border transition duration-fast active:scale-95 ${
                icon === i ? 'border-brand bg-brand-soft text-brand shadow-glow' : 'border-ink/10 bg-surface/70 text-ink/70'
              }`}
            >
              <RewardIcon icon={i} size={22} />
            </button>
          ))}
        </div>
      </div>

      <input className="input" placeholder={t('rew.titlePh')} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} aria-label={t('form.name')} />
      <input className="input" placeholder={t('rew.descPh')} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} aria-label={t('rew.descPh')} />

      <div className="flex flex-col gap-2">
        <span className={LABEL}>{t('rew.cost')}</span>
        <div className="flex flex-wrap items-center gap-2">
          {COSTS.map((c) => (
            <button key={c} type="button" aria-pressed={cost === String(c)} onClick={() => setCost(String(c))} className={chip(cost === String(c))}>
              <Star size={14} fill="currentColor" aria-hidden /> {c}
            </button>
          ))}
          <input className="input w-28" type="number" inputMode="numeric" min={1} max={100000} value={cost} onChange={(e) => setCost(e.target.value)} aria-label={t('rew.cost')} />
        </div>
      </div>

      <button type="button" role="switch" aria-checked={active} onClick={() => setActive((a) => !a)} className="card flex min-h-[56px] items-center justify-between">
        <span className="font-medium">{t('rew.visible')}</span>
        <span className={`h-7 w-12 rounded-full p-1 transition duration-base ${active ? 'bg-brand' : 'bg-ink/15'}`}>
          <span className={`block h-5 w-5 rounded-full bg-on-brand transition duration-base ${active ? 'translate-x-5' : ''}`} />
        </span>
      </button>

      {error && (
        <p role="alert" className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
          {error}
        </p>
      )}
      <button className="btn-primary" disabled={busy || !online}>
        {busy && <Loader2 size={18} className="animate-spin" aria-hidden />}
        {busy ? t('form.saving') : t('form.save')}
      </button>
      {reward &&
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
            <Trash2 size={18} aria-hidden /> {t('rew.delete')}
          </button>
        ))}
    </form>
  )
}

export default function ParentRewards() {
  const { t, lang } = useI18n()
  const { rewards, redemptions, children, loading, reload } = useFamilyData()
  const [editing, setEditing] = useState<Reward | 'new' | null>(null)
  const byId = useMemo(() => new Map<string, Child>(children.map((c) => [c.id, c] as [string, Child])), [children])
  const pending = redemptions.filter((r) => r.status === 'pending')
  const recent = redemptions.filter((r) => r.status !== 'pending').slice(0, 5)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">{t('shop.title')}</h1>
        <button className="btn-primary min-h-[44px] px-4 text-sm" onClick={() => setEditing('new')}>
          <Plus size={18} aria-hidden /> {t('rew.new')}
        </button>
      </div>

      {pending.length > 0 && (
        <>
          <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-ink/60">{t('dash.rewardRequests')}</h2>
          {pending.map((r) => {
            const kid = byId.get(r.child_id)
            return (
              <div key={r.id} className="card flex flex-col gap-3 border-brand/30">
                <div className="flex items-center gap-3">
                  {kid && <Avatar name={kid.name} url={kid.avatar_url} size={36} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-ink/60">{t('dash.wants', { name: kid?.name ?? t('dash.child') })}</div>
                    <div className="truncate font-semibold">
                      <RewardIcon icon={r.icon} size={16} className="mr-1.5 inline" />
                      {r.title}
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-star-soft px-3 py-1 font-display font-semibold text-star">
                    <Star size={14} fill="currentColor" aria-hidden /> {r.cost}
                  </span>
                </div>
                <RedemptionActions id={r.id} onDone={() => void reload()} />
              </div>
            )
          })}
        </>
      )}

      <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-ink/60">{t('rew.shop')}</h2>
      {loading ? (
        [0, 1, 2].map((i) => <div key={i} className="skeleton h-20" />)
      ) : rewards.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-card p-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Gift size={28} aria-hidden />
          </div>
          <p className="text-ink/60">{t('rew.emptyText')}</p>
          <button className="btn-primary w-full" onClick={() => setEditing('new')}>
            <Plus size={18} aria-hidden /> {t('rew.create')}
          </button>
        </div>
      ) : (
        rewards.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: Math.min(i, 6) * 0.03 }}
            role="button"
            tabIndex={0}
            onClick={() => setEditing(r)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setEditing(r)
              }
            }}
            className={`card flex cursor-pointer items-center gap-3 ${r.active ? '' : 'opacity-70'}`}
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-brand/25 bg-brand-soft text-brand">
              <RewardIcon icon={r.icon} size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{r.title}</div>
              {!r.active && (
                <div className="mt-0.5 inline-flex items-center gap-1 text-sm text-ink/50">
                  <EyeOff size={14} aria-hidden /> {t('rew.hidden')}
                </div>
              )}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-star-soft px-3 py-1 font-display font-semibold text-star">
              <Star size={14} fill="currentColor" aria-hidden /> {r.cost}
            </span>
          </motion.div>
        ))
      )}

      {recent.length > 0 && (
        <>
          <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-ink/60">{t('rew.recent')}</h2>
          {recent.map((r) => {
            const Icon = RED_ICON[r.status]
            return (
              <div key={r.id} className="card flex items-center gap-3">
                <div className="text-brand">
                  <RewardIcon icon={r.icon} size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.title}</div>
                  <div className="truncate text-sm text-ink/50">
                    {byId.get(r.child_id)?.name ?? t('dash.child')} · {formatWhenI18n(r.created_at, lang)}
                  </div>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${REDEMPTION_UI[r.status].cls}`}>
                  <Icon size={14} aria-hidden /> {t(`red.${r.status}`)}
                </span>
              </div>
            )
          })}
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
