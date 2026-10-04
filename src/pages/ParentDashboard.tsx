import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useFamilyData } from '../data/FamilyData'
import { greeting, type Child } from '../lib/tasks'
import TaskCard from '../components/TaskCard'
import ReviewActions from '../components/ReviewActions'
import Avatar from '../components/Avatar'
import RedemptionActions from '../components/RedemptionActions'

export default function ParentDashboard() {
  const { profile } = useAuth()
  const { tasks, children, redemptions, loading, error, reload } = useFamilyData()
  const pendingRed = redemptions.filter((r) => r.status === 'pending')
  const byId = useMemo(() => new Map<string, Child>(children.map((c) => [c.id, c] as [string, Child])), [children])
  const review = tasks.filter((t) => t.status === 'submitted')
  const active = tasks.filter((t) => t.status === 'todo' || t.status === 'rejected').length

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold leading-tight">
        {greeting()}, {profile?.display_name} 👋
      </h1>
      {error && <p className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{error}</p>}

      {loading ? (
        <>
          <div className="h-24 animate-pulse rounded-card bg-ink/5" />
          <div className="h-40 animate-pulse rounded-card bg-ink/5" />
        </>
      ) : children.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <div className="text-4xl">🧒</div>
          <h2 className="text-lg font-semibold">Добавьте ребёнка</h2>
          <p className="text-ink/60">Пригласите ребёнка по коду, и сможете создавать для него задания.</p>
          <Link to="/family" className="btn-primary w-full">
            Пригласить ребёнка
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="card">
              <div className="font-display text-3xl font-semibold text-review">{review.length}</div>
              <div className="text-sm text-ink/60">ждут проверки</div>
            </div>
            <div className="card">
              <div className="font-display text-3xl font-semibold text-brand">{active}</div>
              <div className="text-sm text-ink/60">активных заданий</div>
            </div>
          </div>

          <div className="card flex flex-col gap-3">
            {children.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <Avatar name={c.name} url={c.avatar_url} size={40} />
                <div className="flex-1 font-medium">{c.name}</div>
                <div className="rounded-full bg-star-soft px-3 py-1 font-display font-semibold text-star">⭐ {c.balance}</div>
              </div>
            ))}
          </div>

          <Link to="/history" className="-mt-2 text-center text-sm font-medium text-brand">
            История баллов →
          </Link>

          <Link to="/tasks/new" className="btn-primary w-full">
            ➕ Создать задание
          </Link>

          <h2 className="text-lg font-semibold">Ожидают проверки</h2>
          {review.length === 0 ? (
            <p className="rounded-2xl bg-ink/5 p-4 text-center text-ink/60">Пока всё проверено. Отличная работа! ✨</p>
          ) : (
            review.map((t) => (
              <TaskCard key={t.id} task={t} child={byId.get(t.assigned_to)}>
                <ReviewActions taskId={t.id} onDone={() => void reload()} />
              </TaskCard>
            ))
          )}

          {pendingRed.length > 0 && (
            <>
              <h2 className="text-lg font-semibold">Запросы на награды</h2>
              {pendingRed.map((r) => {
                const kid = byId.get(r.child_id)
                return (
                  <div key={r.id} className="card flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      {kid && <Avatar name={kid.name} url={kid.avatar_url} size={36} />}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-ink/60">{kid?.name ?? 'Ребёнок'} хочет</div>
                        <div className="font-semibold">
                          {r.icon} {r.title}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-star-soft px-3 py-1 font-display font-semibold text-star">⭐ {r.cost}</span>
                    </div>
                    <RedemptionActions id={r.id} onDone={() => void reload()} />
                  </div>
                )
              })}
            </>
          )}
        </>
      )}
    </div>
  )
}
