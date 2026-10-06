import type { Notice } from '../data/Notifications'
import type { Child, Member, Task } from './tasks'
import type { Redemption } from './rewards'

type T = (key: string, vars?: Record<string, string | number>) => string

interface Ctx {
  tasks: Task[]
  redemptions: Redemption[]
  children: Child[]
  members: Member[]
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
const reasonPart = (r: string | null | undefined) => (r && r.trim() ? `: ${r.trim()}` : '')

/**
 * Текст уведомления на языке того, кто его читает. Уведомления из базы написаны по-русски,
 * поэтому по id задания/награды берём данные и собираем фразу заново. Не вышло — остаётся текст из базы.
 */
export function localizeNotice(n: Notice, t: T, ctx: Ctx): { title: string; body: string | null } {
  const fallback = { title: n.title, body: n.body }
  const d = n.data ?? {}
  const taskId = str(d.task_id)
  const redId = str(d.redemption_id)

  if (['task_new', 'task_submitted', 'task_approved', 'task_rejected'].includes(n.type) && taskId) {
    const task = ctx.tasks.find((x) => x.id === taskId)
    if (!task) return fallback
    const vars: Record<string, string | number> = { title: task.title, points: task.points, reason: reasonPart(task.reject_reason) }
    if (n.type === 'task_submitted') {
      const kid = ctx.children.find((c) => c.id === task.assigned_to)
      if (!kid) return fallback
      vars.name = kid.name
    }
    return { title: t(`notice.${n.type}.t`, vars), body: t(`notice.${n.type}.b`, vars) }
  }

  if (['reward_requested', 'reward_approved', 'reward_rejected'].includes(n.type) && redId) {
    const red = ctx.redemptions.find((x) => x.id === redId)
    if (!red) return fallback
    const vars: Record<string, string | number> = { title: red.title, cost: red.cost, reason: reasonPart(red.reject_reason) }
    if (n.type === 'reward_requested') {
      const kid = ctx.children.find((c) => c.id === red.child_id)
      if (!kid) return fallback
      vars.name = kid.name
    }
    return { title: t(`notice.${n.type}.t`, vars), body: t(`notice.${n.type}.b`, vars) }
  }

  if (n.type === 'member_joined') {
    const m = ctx.members.find((x) => x.id === str(d.user_id))
    if (!m) return fallback
    return { title: t('notice.member_joined.t', { name: m.name }), body: t(m.role === 'child' ? 'notice.member_joined.child' : 'notice.member_joined.parent') }
  }

  return fallback
}
