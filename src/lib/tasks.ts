export type TaskStatus = 'todo' | 'submitted' | 'approved' | 'rejected'
export type Repeat = 'none' | 'daily' | 'weekdays' | 'weekly' | 'custom'

export interface Task {
  id: string
  family_id: string
  title: string
  description: string | null
  assigned_to: string
  points: number
  due_at: string | null
  repeat: Repeat
  repeat_days: number[]
  priority: 0 | 1
  status: TaskStatus
  reject_reason: string | null
  created_at: string
}

export interface Child {
  id: string
  name: string
  avatar_url: string | null
  balance: number
}

// То, что видит человек: «Просрочено» вычисляется из срока
export type View = 'new' | 'submitted' | 'approved' | 'rejected' | 'overdue'

export function viewOf(t: Task, now = Date.now()): View {
  if (t.status === 'submitted') return 'submitted'
  if (t.status === 'approved') return 'approved'
  if (t.status === 'rejected') return 'rejected'
  if (t.due_at && new Date(t.due_at).getTime() < now) return 'overdue'
  return 'new'
}

export const STATUS_UI: Record<View, { label: string; dot: string; cls: string }> = {
  new: { label: 'Новое', dot: '🟡', cls: 'bg-star-soft text-star' },
  submitted: { label: 'На проверке', dot: '🟣', cls: 'bg-review-soft text-review' },
  approved: { label: 'Подтверждено', dot: '🟢', cls: 'bg-ok-soft text-ok' },
  rejected: { label: 'Отклонено', dot: '🔴', cls: 'bg-warn-soft text-warn' },
  overdue: { label: 'Просрочено', dot: '⚪', cls: 'bg-ink/10 text-ink/70' },
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

// 0 = сегодня, 1 = завтра, -1 = вчера
export function dayDiff(iso: string): number {
  return Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / 86400000)
}

export function formatDue(iso: string | null): string {
  if (!iso) return 'Без срока'
  const d = new Date(iso)
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const diff = dayDiff(iso)
  if (diff === 0) return `Сегодня, ${time}`
  if (diff === 1) return `Завтра, ${time}`
  if (diff === -1) return `Вчера, ${time}`
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}, ${time}`
}

export type Filter = 'today' | 'upcoming' | 'review' | 'done' | 'overdue'

export const FILTERS: { key: Filter; label: string }[] = [
  { key: 'today', label: 'Сегодня' },
  { key: 'upcoming', label: 'Предстоящие' },
  { key: 'review', label: 'На проверке' },
  { key: 'done', label: 'Выполненные' },
  { key: 'overdue', label: 'Просроченные' },
]

export function matchesFilter(t: Task, f: Filter): boolean {
  const v = viewOf(t)
  if (f === 'review') return v === 'submitted'
  if (f === 'done') return v === 'approved'
  if (f === 'overdue') return v === 'overdue'
  if (f === 'today') return v === 'rejected' || (v === 'new' && (!t.due_at || dayDiff(t.due_at) <= 0))
  return v === 'new' && !!t.due_at && dayDiff(t.due_at) > 0
}

export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}
