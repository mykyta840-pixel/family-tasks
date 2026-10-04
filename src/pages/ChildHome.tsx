import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useFamilyData } from '../data/FamilyData'
import { callRpc } from '../lib/actions'
import { humanError } from '../lib/errors'
import { viewOf, type Task } from '../lib/tasks'
import { useOnline } from '../hooks/useOnline'
import Avatar from '../components/Avatar'
import TaskCard from '../components/TaskCard'

function TodoItem({ task, onDone }: { task: Task; onDone: () => Promise<void> }) {
  const online = useOnline()
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError(null)
    try {
      await callRpc('submit_task', { p_task_id: task.id })
    } catch (e) {
      setError(humanError(e))
    } finally {
      lock.current = false
      setBusy(false)
      await onDone()
    }
  }

  return (
    <TaskCard task={task}>
      <button className="btn-primary min-h-[60px] text-lg" onClick={submit} disabled={busy || !online}>
        {busy ? 'Отправляем…' : '✓ Выполнено'}
      </button>
      {error && <p className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{error}</p>}
    </TaskCard>
  )
}

export default function ChildHome() {
  const { profile, session } = useAuth()
  const { tasks, children, loading, error, reload } = useFamilyData()
  const me = children.find((c) => c.id === session?.user.id)
  const balance = me?.balance ?? 0

  // Праздник при получении баллов
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

  const todo = tasks.filter((t) => ['new', 'overdue', 'rejected'].includes(viewOf(t)))
  const waiting = tasks.filter((t) => t.status === 'submitted')
  const done = tasks.filter((t) => t.status === 'approved').slice(-5).reverse()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Avatar name={profile?.display_name ?? '?'} url={profile?.avatar_url} size={48} />
        <h1 className="font-display text-2xl font-semibold leading-tight">
          Привет, {profile?.display_name}! 👋
        </h1>
      </div>
      {error && <p className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{error}</p>}

      <div className="rounded-card bg-gradient-to-br from-brand to-brand-dark p-5 text-white shadow-card">
        <div className="text-sm opacity-80">Мои баллы</div>
        <div className="mt-1 font-display text-5xl font-semibold">⭐ {balance}</div>
        <Link to="/history" className="mt-2 inline-block text-sm opacity-80 underline">
          История баллов
        </Link>
      </div>
      <Link to="/rewards" className="btn-soft w-full">
        🎁 Обменять баллы на награды
      </Link>

      {loading ? (
        <div className="h-32 animate-pulse rounded-card bg-ink/5" />
      ) : (
        <>
          <h2 className="text-lg font-semibold">Сегодня</h2>
          {todo.length === 0 ? (
            <p className="rounded-2xl bg-ink/5 p-5 text-center text-ink/60">Заданий нет. Можно отдыхать! 🎈</p>
          ) : (
            todo.map((t) => <TodoItem key={t.id} task={t} onDone={reload} />)
          )}

          {waiting.length > 0 && (
            <>
              <h2 className="text-lg font-semibold">Ждут проверки</h2>
              {waiting.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </>
          )}

          {done.length > 0 && (
            <>
              <h2 className="text-lg font-semibold">Уже сделано</h2>
              {done.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </>
          )}
        </>
      )}

      <AnimatePresence>
        {gain !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16 }}
            className="pointer-events-none fixed inset-0 z-20 grid place-items-center"
          >
            <div className="rounded-[32px] bg-white px-8 py-6 text-center shadow-2xl">
              <div className="text-5xl">🎉</div>
              <div className="mt-2 font-display text-4xl font-semibold text-star">+{gain} ⭐</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
