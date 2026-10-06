import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ClipboardList, List, Plus, UserPlus } from 'lucide-react'
import { useFamilyData } from '../data/FamilyData'
import { useI18n } from '../i18n'
import { FILTERS, matchesFilter, type Child, type Filter } from '../lib/tasks'
import TaskGridCard from '../components/TaskGridCard'
import ParentTaskSheet from '../components/ParentTaskSheet'
import DatePicker from '../components/DatePicker'
import { dayKey, tasksByDay } from '../lib/calendar'

export default function TaskList() {
  const { t } = useI18n()
  const { tasks, children, loading } = useFamilyData()
  const [openId, setOpenId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('today')
  const [mode, setMode] = useState<'list' | 'calendar'>('list')
  const [day, setDay] = useState(dayKey(new Date()))
  const byDay = useMemo(() => tasksByDay(tasks), [tasks])
  const dayTasks = byDay.get(day) ?? []
  const byId = useMemo(() => new Map<string, Child>(children.map((c) => [c.id, c] as [string, Child])), [children])
  const shown = tasks.filter((x) => matchesFilter(x, filter))
  const opened = tasks.find((x) => x.id === openId) ?? null // удалили или изменили на другом телефоне — окно закроется само

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

      <div className="grid grid-cols-2 gap-1 rounded-full border border-ink/10 bg-surface/60 p-1" role="group" aria-label={t('cal.view')}>
        {([['list', List, t('cal.list')], ['calendar', CalendarDays, t('cal.calendar')]] as const).map(([k, Icon, label]) => (
          <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)}
            className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition duration-fast ${mode === k ? 'bg-brand text-on-brand shadow-glow' : 'text-ink/70'}`}>
            <Icon size={16} aria-hidden /> {label}
          </button>
        ))}
      </div>

      {mode === 'calendar' ? (
        <div className="flex flex-col gap-3">
          <DatePicker value={day} onPick={setDay} marks={new Map([...byDay].map(([k, v]) => [k, v.length]))} />
          {children.length > 0 && (
            <Link to={`/tasks/new?date=${day}`} className="btn-soft w-full"><Plus size={18} aria-hidden /> {t('cal.addForDay')}</Link>
          )}
          {dayTasks.length === 0 ? (
            <p className="glass rounded-card p-5 text-center text-sm text-ink/60">{t('cal.noTasks')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {dayTasks.map((x, i) => <TaskGridCard key={x.id} task={x} child={byId.get(x.assigned_to)} index={i} onOpen={() => setOpenId(x.id)} />)}
            </div>
          )}
        </div>
      ) : (
      <>
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="tablist">
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
        <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton aspect-square min-h-[168px]" />)}</div>
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
        <div className="grid grid-cols-2 gap-3">
          {shown.map((x, i) => (
            <TaskGridCard key={x.id} task={x} child={byId.get(x.assigned_to)} index={i} onOpen={() => setOpenId(x.id)} />
          ))}
        </div>
      )}

      </>
      )}

      <ParentTaskSheet task={opened} onClose={() => setOpenId(null)} />
    </div>
  )
}
