import { dayKey } from './calendar'

export interface DayStat {
  key: string // «ГГГГ-ММ-ДД»
  date: Date
  value: number // сколько кристаллов заработано за день
}

interface TxnLike {
  child_id: string
  amount: number
  created_at: string
}

/** Заработано кристаллов за каждый из последних `days` дней (последний = сегодня). Траты не вычитаются. */
export function earnedByDay(txns: TxnLike[], childId: string | null, now = new Date(), days = 7): DayStat[] {
  const out: DayStat[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    out.push({ key: dayKey(date), date, value: 0 })
  }
  const index = new Map(out.map((d, i) => [d.key, i]))
  for (const x of txns) {
    if (x.amount <= 0 || (childId && x.child_id !== childId)) continue
    const i = index.get(dayKey(new Date(x.created_at)))
    if (i !== undefined) out[i].value += x.amount
  }
  return out
}

/** Сколько дней подряд ребёнок получал кристаллы. Если сегодня ещё нет — серия считается от вчера. */
export function earningStreak(txns: TxnLike[], childId: string | null, now = new Date()): number {
  const days = new Set<string>()
  for (const x of txns) {
    if (x.amount > 0 && (!childId || x.child_id === childId)) days.add(dayKey(new Date(x.created_at)))
  }
  let n = 0
  let i = days.has(dayKey(now)) ? 0 : 1
  for (; ; i++) {
    if (!days.has(dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)))) break
    n++
    if (n > 365) break
  }
  return n
}
