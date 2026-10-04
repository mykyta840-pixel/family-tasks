import type { ReactNode } from 'react'
import Avatar from './Avatar'
import { STATUS_UI, formatDue, viewOf, type Child, type Task } from '../lib/tasks'

interface Props {
  task: Task
  child?: Child
  onClick?: () => void
  children?: ReactNode
}

export default function TaskCard({ task, child, onClick, children }: Props) {
  const view = viewOf(task)
  const ui = STATUS_UI[view]
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
          <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${ui.cls}`}>
            {ui.dot} {ui.label}
          </span>
        </div>
        <h3 className="mt-2 text-lg font-semibold leading-snug">{task.title}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-star-soft px-3 py-1 font-semibold text-star">⭐ {task.points}</span>
          <span className={view === 'overdue' ? 'font-medium text-warn' : 'text-ink/60'}>{formatDue(task.due_at)}</span>
          {task.priority === 1 && <span className="text-ink/60">🔥 Важное</span>}
          {task.repeat !== 'none' && <span className="text-ink/60">🔁</span>}
        </div>
        {view === 'rejected' && task.reject_reason && (
          <p className="mt-2 rounded-xl bg-warn-soft p-3 text-sm text-warn">{task.reject_reason}</p>
        )}
      </div>
      {children}
    </div>
  )
}
