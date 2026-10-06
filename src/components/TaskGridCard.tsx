import { memo } from 'react'
import { motion } from 'framer-motion'
import { Flame, Repeat } from 'lucide-react'
import Coin from './Coin'
import Avatar from './Avatar'
import TaskVisual from './TaskVisual'
import { StatusChip } from './StatusBadge'
import { formatDueShort, viewOf, type Child, type Task, type View } from '../lib/tasks'
import { useI18n } from '../i18n'

// Цвет неоновой подсветки карточки по статусу (переменные темы: меняются вместе с темой)
const TONE: Record<View, string> = {
  new: 'brand',
  submitted: 'review',
  approved: 'ok',
  rejected: 'warn',
  overdue: 'warn',
}

// Квадратная неоновая карточка задания для родителя
function TaskGridCard({ task, child, index, onOpen }: { task: Task; child?: Child; index: number; onOpen: () => void }) {
  const { t, lang } = useI18n()
  const view = viewOf(task)
  const tone = TONE[view]
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      aria-label={task.title}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: view === 'approved' ? 0.8 : 1, y: 0 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.22, delay: Math.min(index, 8) * 0.03 }}
      className="glass relative flex aspect-square min-h-[168px] min-w-0 flex-col gap-2 overflow-hidden rounded-card p-3 text-left"
      style={{ boxShadow: `0 0 0 1px rgb(var(--${tone}) / .4), 0 0 22px -6px rgb(var(--${tone}) / .6)` }}
    >
      <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl" style={{ background: `rgb(var(--${tone}) / .22)` }} />
      <div className="relative flex items-start justify-between gap-2">
        <TaskVisual task={task} className="h-10 w-10 rounded-xl" iconSize={22} />
        <div className="flex items-center gap-1">
          {task.priority === 1 && <Flame size={16} className="text-star" aria-label={t('task.important')} />}
          <StatusChip view={view} />
        </div>
      </div>
      <h3 className="relative line-clamp-2 break-words text-[15px] font-semibold leading-tight">{task.title}</h3>
      <div className="relative mt-auto flex min-w-0 flex-col gap-1 text-xs">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-ink/70">
            {child && <Avatar name={child.name} url={child.avatar_url} size={20} />}
            <span className="truncate">{child?.name ?? '—'}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-star">
            <Coin size={12} /> {task.points}
          </span>
        </div>
        <div className={`flex items-center gap-1 ${view === 'overdue' ? 'font-medium text-warn' : 'text-ink/60'}`}>
          <span className="truncate">{formatDueShort(task.due_at, lang, t)}</span>
          {task.repeat !== 'none' && <Repeat size={12} className="shrink-0" aria-label={t('task.repeat')} />}
        </div>
      </div>
    </motion.button>
  )
}

export default memo(TaskGridCard)
