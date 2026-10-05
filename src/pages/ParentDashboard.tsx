import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, CheckCheck, ChevronRight, History, Plus, Star, UserPlus } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useFamilyData } from '../data/FamilyData'
import type { Child } from '../lib/tasks'
import { useI18n } from '../i18n'
import TaskCard from '../components/TaskCard'
import ReviewActions from '../components/ReviewActions'
import RewardIcon from '../components/RewardIcon'
import Avatar from '../components/Avatar'
import RedemptionActions from '../components/RedemptionActions'

function greetKey(): string {
  const h = new Date().getHours()
  return h < 5 ? 'greet.night' : h < 12 ? 'greet.morning' : h < 18 ? 'greet.day' : 'greet.evening'
}

export default function ParentDashboard() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const { tasks, children, redemptions, loading, error, reload } = useFamilyData()
  const pendingRed = redemptions.filter((r) => r.status === 'pending')
  const byId = useMemo(() => new Map<string, Child>(children.map((c) => [c.id, c] as [string, Child])), [children])
  const review = tasks.filter((x) => x.status === 'submitted')
  const active = tasks.filter((x) => x.status === 'todo' || x.status === 'rejected').length
  const attention = review.length + pendingRed.length

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-sm text-ink/60">{t(greetKey())}</div>
        <h1 className="font-display text-2xl font-semibold leading-tight">{profile?.display_name}</h1>
      </div>
      {error && <p role="alert" className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">{error}</p>}

      {loading ? (
        <>
          <div className="skeleton h-28" />
          <div className="skeleton h-32" />
          <div className="skeleton h-14" />
        </>
      ) : children.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><UserPlus size={28} aria-hidden /></div>
          <h2 className="text-lg font-semibold">{t('dash.addChild')}</h2>
          <p className="text-ink/60">{t('dash.addChildText')}</p>
          <Link to="/family" className="btn-primary w-full">{t('dash.invite')}</Link>
        </div>
      ) : (
        <>
          {/* главное: что требует внимания родителя */}
          <div className={`flex items-center gap-4 rounded-card border p-5 shadow-card ${
            attention > 0 ? 'border-brand/40 bg-gradient-to-br from-brand to-brand-dark text-on-brand shadow-glow' : 'glass'}`}>
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${attention > 0 ? 'bg-black/20' : 'bg-ok-soft text-ok'}`}>
              {attention > 0 ? <BellRing size={24} aria-hidden /> : <CheckCheck size={24} aria-hidden />}
            </div>
            <div className="min-w-0">
              <div className="font-display text-lg font-semibold leading-tight">
                {attention > 0 ? t('dash.attention', { n: attention }) : t('dash.allClear')}
              </div>
              <div className={`mt-0.5 text-sm ${attention > 0 ? 'opacity-85' : 'text-ink/60'}`}>
                {attention > 0 ? t('dash.attentionSub') : t('dash.allClearSub')}
              </div>
            </div>
          </div>

          <div className="card flex flex-col gap-1">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink/60">{t('dash.kids')}</div>
            {children.map((c) => (
              <div key={c.id} className="flex min-h-[52px] items-center gap-3">
                <Avatar name={c.name} url={c.avatar_url} size={40} />
                <div className="flex-1 font-medium">{c.name}</div>
                <div className="inline-flex items-center gap-1 rounded-full bg-star-soft px-3 py-1 font-display font-semibold text-star">
                  <Star size={14} fill="currentColor" aria-hidden /> {c.balance}
                </div>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-ink/10 pt-3 text-sm text-ink/60">
              <span>{t('dash.active', { n: active })}</span>
              <Link to="/history" className="inline-flex min-h-[44px] items-center gap-1 font-medium text-brand">
                <History size={16} aria-hidden /> {t('dash.history')} <ChevronRight size={16} aria-hidden />
              </Link>
            </div>
          </div>

          <Link to="/tasks/new" className="btn-primary w-full"><Plus size={20} aria-hidden /> {t('dash.create')}</Link>

          {review.length > 0 && (
            <>
              <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-ink/60">{t('dash.approvals')}</h2>
              {review.map((x) => (
                <TaskCard key={x.id} task={x} child={byId.get(x.assigned_to)}>
                  <ReviewActions taskId={x.id} onDone={() => void reload()} />
                </TaskCard>
              ))}
            </>
          )}

          {pendingRed.length > 0 && (
            <>
              <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-ink/60">{t('dash.rewardRequests')}</h2>
              {pendingRed.map((r) => {
                const kid = byId.get(r.child_id)
                return (
                  <div key={r.id} className="card flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      {kid && <Avatar name={kid.name} url={kid.avatar_url} size={36} />}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-ink/60">{t('dash.wants', { name: kid?.name ?? t('dash.child') })}</div>
                        <div className="truncate font-semibold"><RewardIcon icon={r.icon} size={16} className="mr-1.5 inline" />{r.title}</div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-star-soft px-3 py-1 font-display font-semibold text-star">
                        <Star size={14} fill="currentColor" aria-hidden /> {r.cost}
                      </span>
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
