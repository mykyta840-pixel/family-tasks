import { useEffect, useRef, useState } from 'react'
import { EyeOff, Hourglass, Loader2, Pencil, Trash2, X } from 'lucide-react'
import Coin from './Coin'
import Sheet from './Sheet'
import CreatedBy from './CreatedBy'
import { RewardIconTile } from './RewardIcon'
import { useFamilyData } from '../data/FamilyData'
import { useOnline } from '../hooks/useOnline'
import { useI18n } from '../i18n'
import { humanError } from '../lib/errors'
import { deleteReward } from '../lib/rewardActions'
import type { Reward } from '../lib/rewards'

// Подробная карточка награды. Родитель: изменить / удалить (любой родитель семьи). Ребёнок: прогресс и «Получить».
export default function RewardDetailSheet({
  reward, onClose, onEdit, child,
}: {
  reward: Reward | null
  onClose: () => void
  onEdit?: (r: Reward) => void // есть только у родителя
  child?: { available: number; requested: boolean; onAsk: (r: Reward) => void } // есть только у ребёнка
}) {
  const { t } = useI18n()
  const online = useOnline()
  const { reload } = useFamilyData()
  const last = useRef<Reward | null>(null)
  if (reward) last.current = reward
  const shown = last.current
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setConfirm(false)
    setError(null)
  }, [reward?.id])

  async function remove() {
    if (!shown || busy || !online) return
    setBusy(true)
    setError(null)
    try {
      await deleteReward(shown.id)
      await reload()
      onClose()
    } catch (e) {
      setError(humanError(e, t))
    } finally {
      setBusy(false)
    }
  }

  const missing = shown && child ? shown.cost - child.available : 0
  const pct = shown && child ? Math.min(100, Math.round((Math.max(child.available, 0) / shown.cost) * 100)) : 0

  return (
    <Sheet open={!!reward} onClose={onClose}>
      {shown && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <RewardIconTile icon={shown.icon} className="h-16 w-16 rounded-2xl" iconSize={32} />
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-star-soft px-3 py-1 font-display font-semibold text-star">
                <Coin size={14} /> {shown.cost}
              </span>
              <h2 className="mt-1.5 break-words font-display text-xl font-semibold leading-snug">{shown.title}</h2>
            </div>
            <button onClick={onClose} aria-label={t('task.close')} className="btn-icon shrink-0"><X size={20} /></button>
          </div>

          <CreatedBy task={shown} size={24} className="text-sm text-ink/70" />

          {!shown.active && onEdit && (
            <p className="inline-flex items-center gap-1.5 text-sm text-ink/60"><EyeOff size={15} aria-hidden /> {t('rew.hidden')}</p>
          )}

          <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-ink/80">{shown.description || t('task.noDesc')}</p>

          {child && !child.requested && missing > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="h-2 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-sm text-ink/60">{t('shop.need', { n: missing })}</span>
            </div>
          )}

          {error && <p role="alert" className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">{error}</p>}

          {child &&
            (child.requested ? (
              <button className="btn-soft" disabled><Hourglass size={18} aria-hidden /> {t('shop.requested')}</button>
            ) : missing > 0 ? (
              <button className="btn-soft" disabled>{t('shop.need', { n: missing })}</button>
            ) : (
              <button className="btn-primary min-h-[56px]" disabled={!online} onClick={() => child.onAsk(shown)}>{t('shop.get')}</button>
            ))}

          {onEdit &&
            (confirm ? (
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-soft px-3" onClick={() => setConfirm(false)} disabled={busy}>{t('form.keep')}</button>
                <button className="btn-danger px-3" onClick={remove} disabled={busy || !online}>
                  {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Trash2 size={18} aria-hidden />}
                  {t('form.confirmDelete')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-primary px-3" onClick={() => onEdit(shown)}><Pencil size={18} aria-hidden /> {t('task.edit')}</button>
                <button className="btn-danger px-3" onClick={() => setConfirm(true)}><Trash2 size={18} aria-hidden /> {t('task.delete')}</button>
              </div>
            ))}
        </div>
      )}
    </Sheet>
  )
}
