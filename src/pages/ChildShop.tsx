import { useRef, useState } from 'react'
import { CheckCircle2, Hourglass, Loader2, XCircle } from 'lucide-react'
import Coin from '../components/Coin'
import { useAuth } from '../auth/AuthProvider'
import { useFamilyData } from '../data/FamilyData'
import { callRpc } from '../lib/actions'
import { humanError } from '../lib/errors'
import { REDEMPTION_UI, formatWhenI18n, type Reward } from '../lib/rewards'
import RewardGridCard from '../components/RewardGridCard'
import RewardDetailSheet from '../components/RewardDetailSheet'
import { useOnline } from '../hooks/useOnline'
import { useI18n } from '../i18n'
import RewardIcon, { RewardIconTile } from '../components/RewardIcon'
import Sheet from '../components/Sheet'

const RED_ICON = { pending: Hourglass, approved: CheckCircle2, rejected: XCircle }

export default function ChildShop() {
  const { t, lang } = useI18n()
  const online = useOnline()
  const { session } = useAuth()
  const { rewards, redemptions, children, loading, reload } = useFamilyData()
  const [notice, setNotice] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Reward | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lock = useRef(false)
  const lastConfirm = useRef<Reward | null>(null)
  if (confirm) lastConfirm.current = confirm
  const uid = session?.user.id
  const balance = children.find((c) => c.id === uid)?.balance ?? 0
  const mine = redemptions.filter((r) => r.child_id === uid)
  const pending = mine.filter((r) => r.status === 'pending')
  const reserved = pending.reduce((sum, r) => sum + r.cost, 0)
  const available = balance - reserved
  const shop = rewards.filter((r) => r.active)
  const opened = shop.find((r) => r.id === openId) ?? null

  async function request() {
    if (!confirm || lock.current) return
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      await callRpc('request_reward', { p_reward_id: confirm.id })
      setConfirm(null)
      setNotice(t('shop.sentNotice'))
    } catch (e) {
      setError(humanError(e, t))
    } finally {
      lock.current = false
      setBusy(false)
      await reload()
    }
  }

  const c = lastConfirm.current
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold">{t('shop.title')}</h1>
      <div className="rounded-card border border-ink/10 bg-gradient-to-br from-brand to-brand-dark p-5 text-on-brand shadow-glow">
        <div className="text-sm opacity-80">{t('child.myPoints')}</div>
        <div className="mt-1 flex items-center gap-2 font-display text-4xl font-semibold leading-none">
          <Coin size={30} /> {balance}
        </div>
        {reserved > 0 && <div className="mt-2 text-sm opacity-80">{t('shop.reserved', { n: reserved })}</div>}
      </div>
      {notice && <p role="status" className="rounded-ctl border border-ok/30 bg-ok-soft p-3 text-sm text-ok">{notice}</p>}

      {loading ? (
        <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton aspect-square min-h-[168px]" />)}</div>
      ) : shop.length === 0 ? (
        <p className="glass rounded-card p-6 text-center text-ink/60">{t('shop.empty')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {shop.map((r, i) => (
            <RewardGridCard key={r.id} reward={r} index={i} available={available} requested={pending.some((p) => p.reward_id === r.id)} onOpen={() => setOpenId(r.id)} />
          ))}
        </div>
      )}

      {mine.length > 0 && (
        <>
          <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-ink/60">{t('shop.mine')}</h2>
          {mine.slice(0, 8).map((r) => {
            const Icon = RED_ICON[r.status]
            return (
              <div key={r.id} className="card flex items-center gap-3">
                <div className="text-brand"><RewardIcon icon={r.icon} size={24} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.title}</div>
                  <div className="text-sm text-ink/50">{formatWhenI18n(r.created_at, lang)}</div>
                  {r.status === 'rejected' && r.reject_reason && <div className="text-sm text-warn">{r.reject_reason}</div>}
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${REDEMPTION_UI[r.status].cls}`}>
                  <Icon size={14} aria-hidden /> {t(`red.${r.status}`)}
                </span>
              </div>
            )
          })}
        </>
      )}

      <RewardDetailSheet
        reward={opened}
        onClose={() => setOpenId(null)}
        child={{ available, requested: !!opened && pending.some((p) => p.reward_id === opened.id), onAsk: (r) => { setError(null); setNotice(null); setOpenId(null); setConfirm(r) } }}
      />

      {/* подтверждение обмена */}
      <Sheet open={!!confirm} onClose={() => !busy && setConfirm(null)}>
        {c && (
          <div className="flex flex-col items-center gap-4 text-center">
            <RewardIconTile icon={c.icon} className="h-16 w-16 rounded-2xl" iconSize={32} />
            <h2 className="font-display text-xl font-semibold">{t('shop.confirmTitle')}</h2>
            <p className="text-ink/70">{t('shop.confirmText', { n: c.cost, title: c.title })}</p>
            {error && <p role="alert" className="w-full rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">{error}</p>}
            <div className="grid w-full grid-cols-2 gap-2">
              <button className="btn-soft" onClick={() => setConfirm(null)} disabled={busy}>{t('common.cancel')}</button>
              <button className="btn-primary" onClick={request} disabled={busy || !online}>
                {busy && <Loader2 size={18} className="animate-spin" />}
                {busy ? t('shop.sending') : t('shop.confirm')}
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
