import { describe, expect, it } from 'vitest'
import { earnedByDay, earningStreak } from '../stats'

const now = new Date(2026, 9, 6, 12, 0)
const at = (daysAgo: number, h = 10) => new Date(2026, 9, 6 - daysAgo, h).toISOString()

describe('график за неделю', () => {
  it('7 дней, последний — сегодня; суммируются только начисления', () => {
    const r = earnedByDay(
      [
        { child_id: 'a', amount: 20, created_at: at(0) },
        { child_id: 'a', amount: 10, created_at: at(0, 20) },
        { child_id: 'a', amount: -30, created_at: at(0) }, // трата не считается
        { child_id: 'b', amount: 50, created_at: at(2) },
        { child_id: 'a', amount: 99, created_at: at(8) }, // старше недели
      ],
      null,
      now,
    )
    expect(r).toHaveLength(7)
    expect(r[6].key).toBe('2026-10-06')
    expect(r[6].value).toBe(30)
    expect(r[4].value).toBe(50)
    expect(r.reduce((s, d) => s + d.value, 0)).toBe(80)
  })
  it('фильтр по ребёнку', () => {
    const r = earnedByDay([{ child_id: 'a', amount: 20, created_at: at(1) }, { child_id: 'b', amount: 5, created_at: at(1) }], 'b', now)
    expect(r[5].value).toBe(5)
  })
})

describe('серия дней', () => {
  const tx = (daysAgo: number, amount = 10) => ({ child_id: 'a', amount, created_at: at(daysAgo) })
  it('считает подряд идущие дни, включая сегодня', () => {
    expect(earningStreak([tx(0), tx(1), tx(2), tx(4)], 'a', now)).toBe(3)
  })
  it('если сегодня ещё нет — считает от вчера', () => {
    expect(earningStreak([tx(1), tx(2)], 'a', now)).toBe(2)
  })
  it('разрыв обнуляет, траты и чужие не считаются', () => {
    expect(earningStreak([tx(3), tx(4)], 'a', now)).toBe(0)
    expect(earningStreak([tx(0, -5), { child_id: 'b', amount: 5, created_at: at(0) }], 'a', now)).toBe(0)
  })
})
