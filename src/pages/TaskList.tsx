import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFamilyData } from '../data/FamilyData'
import { FILTERS, matchesFilter, type Child, type Filter } from '../lib/tasks'
import TaskCard from '../components/TaskCard'
import ReviewActions from '../components/ReviewActions'

export default function TaskList() {
  const { tasks, children, loading, reload } = useFamilyData()
  const nav = useNavigate()
  const [filter, setFilter] = useState<Filter>('today')
  const byId = useMemo(() => new Map<string, Child>(children.map((c) => [c.id, c] as [string, Child])), [children])
  const shown = tasks.filter((t) => matchesFilter(t, filter))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Задания</h1>
        {children.length > 0 && (
          <Link to="/tasks/new" className="btn-primary min-h-[44px] px-4 text-sm">
            ➕ Новое
          </Link>
        )}
      </div>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {FILTERS.map((f) => {
          const count = tasks.filter((t) => matchesFilter(t, f.key)).length
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm font-semibold transition ${
                filter === f.key ? 'bg-brand text-white' : 'bg-white text-ink/70 shadow-card'
              }`}
            >
              {f.label}
              {count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-card bg-ink/5" />
      ) : shown.length === 0 ? (
        <div className="rounded-2xl bg-ink/5 p-6 text-center text-ink/60">
          {children.length === 0 ? 'Сначала пригласите ребёнка во вкладке «Семья».' : 'Здесь пока пусто.'}
        </div>
      ) : (
        shown.map((t) => (
          <TaskCard key={t.id} task={t} child={byId.get(t.assigned_to)} onClick={() => nav(`/tasks/${t.id}`)}>
            {t.status === 'submitted' && <ReviewActions taskId={t.id} onDone={() => void reload()} />}
          </TaskCard>
        ))
      )}
    </div>
  )
}
