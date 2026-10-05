import type { ReactNode } from 'react'
import Avatar from './Avatar'
import { Clock, Flame, Repeat, Star } from 'lucide-react'
import { formatDueI18n, viewOf, type Child, type Task } from '../lib/tasks'
import { useI18n } from '../i18n'
import StatusBadge from './StatusBadge'
import { TaskImage } from './NoteCard'
import RemindButton from './RemindButton'

interface Props {
  task: Task
  child?: Child
  onClick?: () => void
  children?: ReactNode
}

export default function TaskCard({ task, child, onClick, children }: Props) {
  const view = viewOf(task)
  const { t, lang } = useI18n()
  return (
    <div className="card flex flex-col gap-3">
      <div
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={onClick ? 'cursor-pointer' : ''}
      >
        <div className="flex items-center gap-2">
          {child && (
            <>
              <Avatar name={child.name} url={child.avatar_url} size={28} />
              <span className="text-sm font-medium text-ink/70">{child.name}</span>
            </>
          )}
          <span className="ml-auto"><StatusBadge view={view} /></span>
        </div>
        <div className="mt-2 flex items-start gap-3">
          {task.image_url && <TaskImage url={task.image_url} className="h-14 w-14 shrink-0 rounded-xl" iconSize={22} />}
          <h3 className="min-w-0 break-words text-lg font-semibold leading-snug">{task.title}</h3>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-star-soft px-3 py-1 font-semibold text-star"><Star size={14} fill="currentColor" aria-hidden /> {task.points}</span>
          <span className={view === 'overdue' ? 'font-medium text-warn' : 'text-ink/60'}><Clock size={13} className="mr-1 inline" aria-hidden />{formatDueI18n(task.due_at, lang, t)}</span>
          {task.priority === 1 && <Flame size={16} className="text-star" aria-label={t('task.important')} />}
          {task.repeat !== 'none' && <Repeat size={15} className="text-ink/60" aria-label={t('task.repeat')} />}
        </div>
        {view === 'rejected' && task.reject_reason && (
          <p className="mt-2 rounded-xl bg-warn-soft p-3 text-sm text-warn">{task.reject_reason}</p>
        )}
      </div>
      {children}
      {child && (task.status === 'todo' || task.status === 'rejected') && <RemindButton taskId={task.id} />}
    </div>
  )
}
