import { describe, expect, it } from 'vitest'
import { bucketsByDay, earnedByChild, firstEarnedDay, inPeriod, periodStart, sumEarned, type EarnedRow } from '../earned'

// Вторник 6 октября 2026, 12:00 по местному времени
const now = new Date(2026, 9, 6, 12, 0)
const row = (child: string, amount: number, y: number, m: number, d: number, h = 10): EarnedRow => ({
  child_id: child,
  amount,
  created_at: new Date(y, m, d, h).toISOString(),
})

const rows: EarnedRow[] = [
  row('a', 10, 2026, 9, 5), // понедельник текущей недели
  row('a', 20, 2026, 9, 6), // сегодня
  row('b', 30, 2026, 9, 4), // воскресенье — прошлая неделя, но этот месяц
  row('a', 40, 2026, 8, 30), // прошлый месяц
  row('b', -15, 2026, 9, 6), // трата — не считается
  row('b', 5, 2026, 9, 11), // будущее (воскресенье этой недели позже) — в этой неделе
]

describe('границы периодов', () => {
  it('неделя начинается с понедельника, месяц — с 1-го числа', () => {
    expect(periodStart('week', now)).toEqual(new Date(2026, 9, 5))
    expect(periodStart('month', now)).toEqual(new Date(2026, 9, 1))
    expect(periodStart('all', now)).toBeNull()
  })
  it('в воскресенье неделя всё ещё идёт с предыдущего понедельника', () => {
    expect(periodStart('week', new Date(2026, 9, 11, 23, 30))).toEqual(new Date(2026, 9, 5))
  })
  it('переход на новую неделю/месяц обнуляет период', () => {
    const monday = new Date(2026, 9, 12, 0, 5)
    expect(sumEarned(rows, 'week', monday)).toBe(0)
    expect(sumEarned(rows, 'month', new Date(2026, 10, 1, 8))).toBe(0)
  })
})

describe('суммы', () => {
  it('неделя: только текущая неделя', () => {
    expect(sumEarned(rows, 'week', now)).toBe(10 + 20 + 5)
  })
  it('месяц: весь октябрь', () => {
    expect(sumEarned(rows, 'month', now)).toBe(10 + 20 + 30 + 5)
  })
  it('всё время: все начисления, траты не вычитаются', () => {
    expect(sumEarned(rows, 'all', now)).toBe(10 + 20 + 30 + 40 + 5)
  })
  it('по одному ребёнку и по детям', () => {
    expect(sumEarned(rows, 'all', now, 'a')).toBe(70)
    expect(earnedByChild(rows, 'month', now).get('b')).toBe(35)
  })
  it('траты и неверные даты игнорируются', () => {
    expect(inPeriod({ child_id: 'a', amount: -5, created_at: new Date().toISOString() }, 'all', now)).toBe(false)
    expect(inPeriod({ child_id: 'a', amount: 5, created_at: 'мусор' }, 'all', now)).toBe(false)
  })
})

describe('столбики и первая дата', () => {
  it('неделя = 7 столбиков Пн–Вс, месяц = 31 день в октябре', () => {
    expect(bucketsByDay(rows, 'week', now)).toHaveLength(7)
    expect(bucketsByDay(rows, 'month', now)).toHaveLength(31)
    expect(bucketsByDay(rows, 'all', now)).toHaveLength(0)
  })
  it('значения ложатся в свои дни', () => {
    const w = bucketsByDay(rows, 'week', now)
    expect(w[0].value).toBe(10) // понедельник 5 окт
    expect(w[1].value).toBe(20) // вторник 6 окт
    expect(w[6].value).toBe(5) // воскресенье 11 окт
  })
  it('первая дата начисления', () => {
    expect(firstEarnedDay(rows)).toBe('2026-09-30')
    expect(firstEarnedDay([])).toBeNull()
  })
})
