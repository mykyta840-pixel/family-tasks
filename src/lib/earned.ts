import { dayKey, pad2 } from './calendar'

// Статистика «Заработано» за период. Чистая логика (без React) — удобно тестировать.
// Границы недели/месяца считаются по местному времени устройства (часовой пояс пользователя).
// Неделя начинается с понедельника (как в календаре приложения).

export type Period = 'week' | 'month' | 'all'
export const PERIODS: Period[] = ['week', 'month', 'all']
export const DEFAULT_PERIOD: Period = 'week'

export interface EarnedRow {
  child_id: string
  amount: number
  created_at: string
}

export interface Bucket {
  key: string // «ГГГГ-ММ-ДД»
  date: Date
  value: number
}

/** Начало периода: понедельник 00:00 / 1-е число 00:00 по местному времени; null = «всё время». */
export function periodStart(period: Period, now = new Date()): Date | null {
  if (period === 'all') return null
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  const back = (now.getDay() + 6) % 7 // Пн = 0
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)
}

/** Конец периода (не включая): следующий понедельник / 1-е число следующего месяца; null = «всё время». */
export function periodEnd(period: Period, now = new Date()): Date | null {
  const s = periodStart(period, now)
  if (!s) return null
  return period === 'month'
    ? new Date(s.getFullYear(), s.getMonth() + 1, 1)
    : new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7)
}

/** Попадает ли начисление в период. Расходы (amount <= 0) никогда не считаются «заработанными». */
export function inPeriod(row: EarnedRow, period: Period, now = new Date(), childId: string | null = null): boolean {
  if (row.amount <= 0) return false
  if (childId && row.child_id !== childId) return false
  const at = new Date(row.created_at).getTime()
  if (Number.isNaN(at)) return false
  const s = periodStart(period, now)
  const e = periodEnd(period, now)
  if (s && at < s.getTime()) return false
  if (e && at >= e.getTime()) return false
  return true
}

/** Сколько заработано за период (всего или по одному ребёнку). */
export function sumEarned(rows: EarnedRow[], period: Period, now = new Date(), childId: string | null = null): number {
  let sum = 0
  for (const r of rows) if (inPeriod(r, period, now, childId)) sum += r.amount
  return sum
}

/** Сколько заработал каждый ребёнок за период. */
export function earnedByChild(rows: EarnedRow[], period: Period, now = new Date()): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of rows) if (inPeriod(r, period, now)) map.set(r.child_id, (map.get(r.child_id) ?? 0) + r.amount)
  return map
}

/** Столбики по дням: неделя = 7 дней (Пн–Вс), месяц = все дни месяца. Для «всё время» — пусто. */
export function bucketsByDay(rows: EarnedRow[], period: Period, now = new Date(), childId: string | null = null): Bucket[] {
  const s = periodStart(period, now)
  const e = periodEnd(period, now)
  if (!s || !e) return []
  const out: Bucket[] = []
  for (let d = new Date(s); d < e; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    out.push({ key: dayKey(d), date: d, value: 0 })
  }
  const index = new Map(out.map((b, i) => [b.key, i]))
  for (const r of rows) {
    if (!inPeriod(r, period, now, childId)) continue
    const i = index.get(dayKey(new Date(r.created_at)))
    if (i !== undefined) out[i].value += r.amount
  }
  return out
}

/** Дата первого начисления («с ГГГГ-ММ-ДД») для подписи «всё время»; null, если начислений нет. */
export function firstEarnedDay(rows: EarnedRow[]): string | null {
  let min = Infinity
  for (const r of rows) {
    const t = new Date(r.created_at).getTime()
    if (r.amount > 0 && t < min) min = t
  }
  if (!Number.isFinite(min)) return null
  const d = new Date(min)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
