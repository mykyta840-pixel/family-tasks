import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, ListChecks, Star } from 'lucide-react'
import { formatDueI18n, viewOf, type Task } from '../lib/tasks'
import { useI18n } from '../i18n'
import StatusBadge from './StatusBadge'

const TILT = [-1.6, 1.2, -0.8, 1.8, -1.2, 0.9]

export function TaskImage({ url, className = '', iconSize = 32 }: { url?: string | null; className?: string; iconSize?: number }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`grid place-items-center overflow-hidden bg-gradient-to-br from-brand-soft to-brand/20 ${className}`}>
      {url && !failed ? (
        <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <ListChecks size={iconSize} className="text-brand/70" aria-hidden />
      )}
    </div>
  )
}

// Одна записка на доске: булавка, лёгкий наклон, картинка, название, баллы, срок, статус
export default function NoteCard({ task, index, onOpen }: { task: Task; index: number; onOpen: () => void }) {
  const { t, lang } = useI18n()
  const view = viewOf(task)
  return (
    <motion.button
      type="button" onClick={onOpen}
      initial={{ opacity: 0, y: 14, rotate: 0 }}
      animate={{ opacity: view === 'approved' ? 0.75 : 1, y: 0, rotate: TILT[index % TILT.length] }}
      whileTap={{ scale: 0.97, rotate: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.04 }}
      className="relative flex min-h-[44px] flex-col gap-2 rounded-[18px] border border-ink/10 bg-surface p-2.5 pt-4 text-left shadow-card"
    >
      <span aria-hidden className="absolute left-1/2 top-1.5 z-10 h-3 w-3 -translate-x-1/2 rounded-full bg-brand shadow-glow ring-2 ring-surface" />
      <TaskImage url={task.image_url} className="aspect-[4/3] w-full rounded-xl" />
      <h3 className="line-clamp-2 min-h-[2.5rem] text-[15px] font-semibold leading-tight">{task.title}</h3>
      <div className="flex items-center justify-between gap-2 text-[13px]">
        <span className="inline-flex items-center gap-1 font-semibold text-star">
          <Star size={14} fill="currentColor" aria-hidden /> {t('common.points', { n: task.points })}
        </span>
      </div>
      <span className={`inline-flex items-center gap-1 text-xs ${view === 'overdue' ? 'font-medium text-warn' : 'text-ink/60'}`}>
        <Clock size={13} aria-hidden /> {formatDueI18n(task.due_at, lang, t)}
      </span>
      <StatusBadge view={view} />
    </motion.button>
  )
}
