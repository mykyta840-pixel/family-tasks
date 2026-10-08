import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarClock, CheckCircle2, Loader2, Repeat, X } from 'lucide-react'
import Coin from './Coin'
import Sheet from './Sheet'
import StatusBadge from './StatusBadge'
import TaskVisual from './TaskVisual'
import CreatedBy from './CreatedBy'
import { callRpc } from '../lib/actions'
import { humanError } from '../lib/errors'
import { formatDueI18n, viewOf, type Task } from '../lib/tasks'
import { isFutureDay } from '../lib/calendar'
import { useOnline } from '../hooks/useOnline'
import { useI18n } from '../i18n'

// Подробности задания (bottom sheet — удобнее всего одной рукой на телефоне)
export default function TaskDetail({ task, onClose, onDone }: { task: Task | null; onClose: () => void; onDone: () => Promise<void> }) {
  const { t, lang } = useI18n()
  const online = useOnline()
  const lock = useRef(false)
  const last = useRef<Task | null>(null)
  if (task) last.current = task
  const shown = last.current
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setSent(false); setError(null) }, [task?.id])

  async function submit() {
    if (!shown || lock.current) return
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      await callRpc('submit_task', { p_task_id: shown.id })
      setSent(true)
      window.setTimeout(onClose, 1100)
    } catch (e) {
      setError(humanError(e, t))
    } finally {
      lock.current = false
      setBusy(false)
      await onDone()
    }
  }

  const view = shown ? viewOf(shown) : 'new'
  const future = !!shown && isFutureDay(shown.due_at)
  const canDo = (view === 'new' || view === 'overdue' || view === 'rejected') && !future
  const Chip = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="rounded-ctl border border-ink/10 bg-surface/70 p-3">
      <div className="flex items-center gap-1.5 text-xs text-ink/60">{icon}{label}</div>
      <div className="mt-1 text-[15px] font-semibold leading-tight">{value}</div>
    </div>
  )

  return (
    <Sheet open={!!task} onClose={onClose}>
      {shown && (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <TaskVisual task={shown} className="aspect-[16/10] w-full rounded-card" iconSize={64} />
            <button onClick={onClose} aria-label={t('task.close')} className="btn-icon absolute right-2 top-2"><X size={20} /></button>
          </div>
          <div>
            <StatusBadge view={view} />
            <h2 className="mt-2 font-display text-xl font-semibold leading-snug">{shown.title}</h2>
            <CreatedBy task={shown} size={24} className="mt-2 text-sm text-ink/70" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Chip icon={<Coin size={14} />} label={t('task.points')} value={t('common.points', { n: shown.points })} />
            <Chip icon={<CalendarClock size={14} aria-hidden />} label={t('task.deadline')} value={formatDueI18n(shown.due_at, lang, t)} />
            <Chip icon={<Repeat size={14} aria-hidden />} label={t('task.repeat')} value={t(`repeat.${shown.repeat}`)} />
          </div>
          <p className="text-[15px] leading-relaxed text-ink/80">{shown.description || t('task.noDesc')}</p>
          {view === 'rejected' && shown.reject_reason && (
            <p className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
              <b>{t('task.reason')}:</b> {shown.reject_reason}
            </p>
          )}
          {error && <p role="alert" className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">{error}</p>}
          {sent ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex min-h-[56px] items-center justify-center gap-2 rounded-ctl bg-ok-soft font-semibold text-ok">
              <CheckCircle2 size={22} /> {t('task.sent')}
            </motion.div>
          ) : future ? (
            <p className="rounded-ctl border border-brand/30 bg-brand-soft p-3 text-center text-sm text-brand">{t('task.notYet', { date: formatDueI18n(shown.due_at, lang, t) })}</p>
          ) : canDo && (
            <button className="btn-primary min-h-[56px] text-base" onClick={submit} disabled={busy || !online}>
              {busy ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
              {busy ? t('task.sending') : t('task.complete')}
            </button>
          )}
        </div>
      )}
    </Sheet>
  )
}
