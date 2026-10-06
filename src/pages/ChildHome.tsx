import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, Gift, History, Sparkles } from 'lucide-react'
import Coin from '../components/Coin'
import { useAuth } from '../auth/AuthProvider'
import { useFamilyData } from '../data/FamilyData'
import { dayDiff, viewOf, type Task } from '../lib/tasks'
import { isFutureDay } from '../lib/calendar'
import { useI18n } from '../i18n'
import Avatar from '../components/Avatar'
import NoteCard from '../components/NoteCard'
import TaskDetail from '../components/TaskDetail'
import WeekChart from '../components/WeekChart'
import MotivationCard from '../components/MotivationCard'
import MemberProfileSheet, { type MemberRow } from '../components/MemberProfileSheet'

const boardStyle = { backgroundImage: 'radial-gradient(rgb(var(--ink) / .08) 1px, transparent 1px)', backgroundSize: '14px 14px' }

function Board({ title, tasks, onOpen }: { title: string; tasks: Task[]; onOpen: (id: string) => void }) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wide text-ink/60">{title}</h2>
      <div style={boardStyle} className="grid grid-cols-2 gap-x-3 gap-y-5 rounded-[26px] border border-ink/10 bg-surface/40 p-3 pt-5 shadow-card backdrop-blur-md">
        {tasks.map((task, i) => <NoteCard key={task.id} task={task} index={i} onOpen={() => onOpen(task.id)} />)}
      </div>
    </section>
  )
}

export default function ChildHome() {
  const { t } = useI18n()
  const { profile, session, refresh } = useAuth()
  const { tasks, children, loading, error, reload } = useFamilyData()
  const [openId, setOpenId] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  // Переход по нажатию на push: /?task=<id> открывает это задание
  const [params, setParams] = useSearchParams()
  useEffect(() => {
    const id = params.get('task')
    if (!id) return
    setOpenId(id)
    setParams({}, { replace: true })
  }, [params, setParams])
  const me = children.find((c) => c.id === session?.user.id)
  const balance = me?.balance ?? 0

  // Анимация при получении баллов
  const prev = useRef<number | null>(null)
  const [gain, setGain] = useState<number | null>(null)
  useEffect(() => {
    if (loading) return
    const before = prev.current
    prev.current = balance
    if (before !== null && balance > before) {
      setGain(balance - before)
      const timer = window.setTimeout(() => setGain(null), 2200)
      return () => window.clearTimeout(timer)
    }
  }, [balance, loading])

  const open = tasks.filter((x) => ['new', 'overdue', 'rejected'].includes(viewOf(x)))
  const todo = open.filter((x) => !isFutureDay(x.due_at)) // только то, что пора делать сегодня
  const soon = open.filter((x) => isFutureDay(x.due_at)).sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? ''))
  const waiting = tasks.filter((x) => x.status === 'submitted')
  const done = tasks.filter((x) => x.status === 'approved').slice(-4).reverse()
  const doneToday = done.filter((x) => x.due_at && dayDiff(x.due_at) === 0).length
  const total = todo.length + waiting.length + doneToday
  const sentCount = waiting.length + doneToday
  const pct = total ? Math.round((sentCount / total) * 100) : 0
  const meRow: MemberRow | null = profile && session
    ? { user_id: session.user.id, role: 'child', profiles: { display_name: profile.display_name, avatar_url: profile.avatar_url ?? null, language: profile.language ?? null, bio: profile.bio ?? null } }
    : null
  const opened = tasks.find((x) => x.id === openId) ?? null

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={() => setProfileOpen(true)} aria-label={t('shell.profile')} className="flex min-h-[48px] items-center gap-3 text-left active:scale-[0.99]">
        <Avatar name={profile?.display_name ?? '?'} url={profile?.avatar_url} size={48} />
        <h1 className="font-display text-xl font-semibold leading-tight">{t('child.hello', { name: profile?.display_name ?? '' })}</h1>
      </button>
      {error && <p role="alert" className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">{error}</p>}

      <div className="relative overflow-hidden rounded-card border border-ink/10 bg-gradient-to-br from-brand to-brand-dark p-5 text-on-brand shadow-glow">
        <div className="text-sm opacity-80">{t('child.myPoints')}</div>
        <div className="mt-1 flex items-center gap-2 font-display text-5xl font-semibold leading-none">
          <Coin size={34} /> {balance}
        </div>
        {total > 0 && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-black/20" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <motion.div className="h-full rounded-full bg-on-brand" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
            </div>
            <div className="mt-1.5 text-xs opacity-80">{t('child.progress', { a: sentCount, b: total })}</div>
          </div>
        )}
        <Link to="/history" className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium opacity-90">
          <History size={16} aria-hidden /> {t('child.history')}
        </Link>
      </div>

      {!loading && session && <MotivationCard childId={session.user.id} balance={balance} todo={todo.length} waiting={waiting.length} />}

      <WeekChart childId={session?.user.id ?? null} title={t('child.week')} />

      <Link to="/rewards" className="btn-soft w-full justify-between">
        <span className="inline-flex items-center gap-2"><Gift size={20} aria-hidden /> {t('child.exchange')}</span>
        <ChevronRight size={18} aria-hidden />
      </Link>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-56" />)}</div>
      ) : (
        <>
          {todo.length === 0 ? (
            <div className="glass flex flex-col items-center gap-2 rounded-card p-8 text-center text-ink/70">
              <Sparkles size={28} className="text-brand" aria-hidden />
              {t('child.empty')}
            </div>
          ) : (
            <Board title={t('child.today')} tasks={todo} onOpen={setOpenId} />
          )}
          {soon.length > 0 && <Board title={t('child.soon')} tasks={soon} onOpen={setOpenId} />}
          {waiting.length > 0 && <Board title={t('child.waiting')} tasks={waiting} onOpen={setOpenId} />}
          {done.length > 0 && <Board title={t('child.done')} tasks={done} onOpen={setOpenId} />}
        </>
      )}

      <MemberProfileSheet member={profileOpen ? meRow : null} onClose={() => setProfileOpen(false)} onChanged={refresh} />

      <TaskDetail task={opened} onClose={() => setOpenId(null)} onDone={reload} />

      <AnimatePresence>
        {gain !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="pointer-events-none fixed inset-0 z-40 grid place-items-center"
          >
            <div className="glass rounded-[28px] px-8 py-6 text-center shadow-glow">
              <Sparkles size={36} className="mx-auto text-star" aria-hidden />
              <div className="mt-2 flex items-center justify-center gap-1 font-display text-4xl font-semibold text-star">
                +{gain} <Coin size={30} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
