import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Flame, Loader2, Pencil, Repeat, Trash2, User, X } from 'lucide-react'
import Coin from './Coin'
import Sheet from './Sheet'
import StatusBadge from './StatusBadge'
import TaskVisual from './TaskVisual'
import CreatedBy from './CreatedBy'
import Avatar from './Avatar'
import ReviewActions from './ReviewActions'
import RemindButton from './RemindButton'
import { useFamilyData } from '../data/FamilyData'
import { useOnline } from '../hooks/useOnline'
import { useI18n } from '../i18n'
import { humanError } from '../lib/errors'
import { deleteTask } from '../lib/taskActions'
import { formatDueI18n, viewOf, type Task } from '../lib/tasks'

// Подробная карточка задания для родителя. Любой родитель семьи может смотреть, менять и удалять любое задание.
export default function ParentTaskSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { t, lang } = useI18n()
  const nav = useNavigate()
  const online = useOnline()
  const { children, reload } = useFamilyData()
  const last = useRef<Task | null>(null)
  if (task) last.current = task
  const shown = last.current
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setConfirm(false)
    setError(null)
  }, [task?.id])

  async function remove() {
    if (!shown || busy || !online) return
    setBusy(true)
    setError(null)
    try {
      await deleteTask(shown)
      await reload()
      onClose()
    } catch (e) {
      setError(humanError(e, t))
    } finally {
      setBusy(false)
    }
  }

  const kid = shown ? children.find((c) => c.id === shown.assigned_to) : undefined
  const view = shown ? viewOf(shown) : 'new'
  const Chip = ({ icon, label, children: val }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
    <div className="min-w-0 rounded-ctl border border-ink/10 bg-surface/70 p-3">
      <div className="flex items-center gap-1.5 text-xs text-ink/60">{icon}{label}</div>
      <div className="mt-1 text-[15px] font-semibold leading-tight">{val}</div>
    </div>
  )

  return (
    <Sheet open={!!task} onClose={onClose}>
      {shown && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <TaskVisual task={shown} className="h-16 w-16 rounded-2xl" iconSize={32} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge view={view} />
                {shown.priority === 1 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-star"><Flame size={14} aria-hidden /> {t('task.important')}</span>
                )}
              </div>
              <h2 className="mt-1.5 break-words font-display text-xl font-semibold leading-snug">{shown.title}</h2>
            </div>
            <button onClick={onClose} aria-label={t('task.close')} className="btn-icon shrink-0"><X size={20} /></button>
          </div>

          <CreatedBy task={shown} size={24} className="text-sm text-ink/70" />

          <div className="grid grid-cols-2 gap-2">
            <Chip icon={<User size={14} aria-hidden />} label={t('task.assignee')}>
              <span className="flex items-center gap-1.5">
                {kid && <Avatar name={kid.name} url={kid.avatar_url} size={22} />}
                <span className="truncate">{kid?.name ?? '—'}</span>
              </span>
            </Chip>
            <Chip icon={<Coin size={14} />} label={t('task.points')}>{t('common.points', { n: shown.points })}</Chip>
            <Chip icon={<CalendarClock size={14} aria-hidden />} label={t('task.deadline')}>{formatDueI18n(shown.due_at, lang, t)}</Chip>
            <Chip icon={<Repeat size={14} aria-hidden />} label={t('task.repeat')}>{t(`repeat.${shown.repeat}`)}</Chip>
          </div>

          <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-ink/80">{shown.description || t('task.noDesc')}</p>

          {view === 'rejected' && shown.reject_reason && (
            <p className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn"><b>{t('task.reason')}:</b> {shown.reject_reason}</p>
          )}

          {shown.status === 'submitted' && <ReviewActions taskId={shown.id} onDone={() => void reload()} />}
          {(shown.status === 'todo' || shown.status === 'rejected') && <RemindButton taskId={shown.id} />}

          {error && <p role="alert" className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">{error}</p>}

          {confirm ? (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-soft px-3" onClick={() => setConfirm(false)} disabled={busy}>{t('form.keep')}</button>
              <button className="btn-danger px-3" onClick={remove} disabled={busy || !online}>
                {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Trash2 size={18} aria-hidden />}
                {t('form.confirmDelete')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-primary px-3" onClick={() => nav(`/tasks/${shown.id}`)}>
                <Pencil size={18} aria-hidden /> {t('task.edit')}
              </button>
              <button className="btn-danger px-3" onClick={() => setConfirm(true)}>
                <Trash2 size={18} aria-hidden /> {t('task.delete')}
              </button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
