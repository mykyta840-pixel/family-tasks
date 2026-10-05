import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ClipboardList, Plus, UserPlus } from 'lucide-react'
import { useFamilyData } from '../data/FamilyData'
import { useI18n } from '../i18n'
import { FILTERS, matchesFilter, type Child, type Filter } from '../lib/tasks'
import TaskCard from '../components/TaskCard'
import ReviewActions from '../components/ReviewActions'

export default function TaskList() {
  const { t } = useI18n()
  const { tasks, children, loading, reload } = useFamilyData()
  const nav = useNavigate()
  const [filter, setFilter] = useState<Filter>('today')
  const byId = useMemo(() => new Map<string, Child>(children.map((c) => [c.id, c] as [string, Child])), [children])
  const shown = tasks.filter((x) => matchesFilter(x, filter))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">{t('tasks.title')}</h1>
        {children.length > 0 && (
          <Link to="/tasks/new" className="btn-primary min-h-[44px] px-4 text-sm">
            <Plus size={18} aria-hidden /> {t('tasks.new')}
          </Link>
        )}
      </div>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="tablist">
        {FILTERS.map((f) => {
          const count = tasks.filter((x) => matchesFilter(x, f.key)).length
          const active = filter === f.key
          return (
            <button
              key={f.key}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={`min-h-[44px] shrink-0 rounded-full border px-4 text-sm font-semibold transition duration-fast active:scale-95 ${
                active ? 'border-brand bg-brand text-on-brand shadow-glow' : 'border-ink/10 bg-surface/70 text-ink/70'
              }`}
            >
              {t(`filter.${f.key}`)}
              {count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
            </button>
          )
        })}
      </div>

      {loading ? (
        [0, 1, 2].map((i) => <div key={i} className="skeleton h-28" />)
      ) : shown.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-card p-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
            {children.length === 0 ? <UserPlus size={28} aria-hidden /> : <ClipboardList size={28} aria-hidden />}
          </div>
          {children.length === 0 ? (
            <>
              <p className="text-ink/70">{t('tasks.noKids')}</p>
              <Link to="/family" className="btn-primary w-full">{t('tasks.toFamily')}</Link>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">{t('tasks.empty')}</h2>
              <p className="text-sm text-ink/60">{t('tasks.emptySub')}</p>
              <Link to="/tasks/new" className="btn-soft w-full">
                <Plus size={18} aria-hidden /> {t('tasks.create')}
              </Link>
            </>
          )}
        </div>
      ) : (
        shown.map((x, i) => (
          <motion.div key={x.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: Math.min(i, 6) * 0.03 }}>
            <TaskCard task={x} child={byId.get(x.assigned_to)} onClick={() => nav(`/tasks/${x.id}`)}>
              {x.status === 'submitted' && <ReviewActions taskId={x.id} onDone={() => void reload()} />}
            </TaskCard>
          </motion.div>
        ))
      )}
    </div>
  )
}
