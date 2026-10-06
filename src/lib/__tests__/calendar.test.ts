import { describe, expect, it } from 'vitest'
import { dayKey, isFutureDay, monthGrid, parseDayKey, shiftMonth, withDay, withTime } from '../calendar'

describe('календарь', () => {
  it('ключ дня и разбор туда-обратно', () => {
    const d = new Date(2026, 9, 5)
    expect(dayKey(d)).toBe('2026-10-05')
    expect(parseDayKey('2026-10-05')?.getTime()).toBe(d.getTime())
    expect(parseDayKey('2026-02-31')).toBeNull()
    expect(parseDayKey('abc')).toBeNull()
  })
  it('сетка месяца начинается с понедельника и кратна 7', () => {
    const g = monthGrid(2026, 9) // октябрь 2026: 1 октября — четверг
    expect(g.length % 7).toBe(0)
    expect(g.slice(0, 3)).toEqual([null, null, null])
    expect(g[3]?.getDate()).toBe(1)
    expect(g.filter(Boolean).length).toBe(31)
  })
  it('сдвиг месяца переходит через год', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
  })
  it('смена дня и времени', () => {
    expect(withDay('2026-10-05T09:30', '2026-10-07')).toBe('2026-10-07T09:30')
    expect(withDay('', '2026-10-07')).toBe('2026-10-07T18:00')
    expect(withTime('2026-10-05T09:30', '20:15')).toBe('2026-10-05T20:15')
  })
  it('будущий день определяется по дате, а не по часам', () => {
    const now = new Date(2026, 9, 5, 12, 0)
    expect(isFutureDay(new Date(2026, 9, 5, 23, 0).toISOString(), now)).toBe(false)
    expect(isFutureDay(new Date(2026, 9, 6, 0, 5).toISOString(), now)).toBe(true)
    expect(isFutureDay(null, now)).toBe(false)
  })
})
