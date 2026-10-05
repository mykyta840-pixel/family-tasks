import { ruT } from '../i18n/ruT'

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
  image_url?: string | null // картинка задания (bucket task-images)
  created_at: string
}

// Путь файла внутри bucket task-images по публичной ссылке (нужен для удаления файла)
export function taskImagePath(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = '/task-images/'
  const i = url.indexOf(marker)
  if (i < 0) return null
  const path = decodeURIComponent(url.slice(i + marker.length).split('?')[0])
  return path || null
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

// Цвета статусов; подписи берутся из переводов (status.*)
export const STATUS_UI: Record<View, { cls: string }> = {
  new: { cls: 'bg-star-soft text-star' },
  submitted: { cls: 'bg-review-soft text-review' },
  approved: { cls: 'bg-ok-soft text-ok' },
  rejected: { cls: 'bg-warn-soft text-warn' },
  overdue: { cls: 'bg-ink/10 text-ink/70' },
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

// 0 = сегодня, 1 = завтра, -1 = вчера
export function dayDiff(iso: string): number {
  return Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / 86400000)
}

// Срок по-русски (для тестов и мест без хука); в интерфейсе используется formatDueI18n
export function formatDue(iso: string | null): string {
  return formatDueI18n(iso, 'ru', ruT)
}

export type Filter = 'today' | 'upcoming' | 'review' | 'done' | 'overdue'

// Порядок вкладок; подписи берутся из переводов (filter.*)
export const FILTERS: { key: Filter }[] = [{ key: 'today' }, { key: 'upcoming' }, { key: 'review' }, { key: 'done' }, { key: 'overdue' }]

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

const LOCALE: Record<string, string> = { en: 'en-GB', de: 'de-DE', ru: 'ru-RU', uk: 'uk-UA' }

// Дата срока на языке интерфейса
export function formatDueI18n(iso: string | null, lang: string, t: (k: string) => string): string {
  if (!iso) return t('date.none')
  const loc = LOCALE[lang] ?? 'en-GB'
  const d = new Date(iso)
  const time = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
  const diff = dayDiff(iso)
  if (diff === 0) return `${t('date.today')}, ${time}`
  if (diff === 1) return `${t('date.tomorrow')}, ${time}`
  if (diff === -1) return `${t('date.yesterday')}, ${time}`
  return `${d.toLocaleDateString(loc, { day: 'numeric', month: 'short' })}, ${time}`
}
