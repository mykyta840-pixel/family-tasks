import { describe, expect, it } from 'vitest'
import { dayDiff, formatDue, matchesFilter, toLocalInput, viewOf, type Task } from '../tasks'

// Дата «через N дней в полдень» по местному времени (полдень — чтобы не зависеть от перехода на летнее время)
function daysFromNow(n: number, hour = 12): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function makeTask(patch: Partial<Task> = {}): Task {
  return {
    id: 't1',
    family_id: 'f1',
    title: 'Убрать комнату',
    description: null,
    assigned_to: 'kid1',
    points: 10,
    due_at: null,
    repeat: 'none',
    repeat_days: [],
    priority: 0,
    status: 'todo',
    reject_reason: null,
    created_at: new Date().toISOString(),
    ...patch,
  }
}

describe('viewOf (что видит человек)', () => {
  const now = new Date('2026-10-04T12:00:00Z').getTime()

  it('новое задание без срока остаётся «new»', () => {
    expect(viewOf(makeTask(), now)).toBe('new')
  })

  it('срок в будущем: «new»', () => {
    expect(viewOf(makeTask({ due_at: '2026-10-05T12:00:00Z' }), now)).toBe('new')
  })

  it('срок прошёл: «overdue»', () => {
    expect(viewOf(makeTask({ due_at: '2026-10-04T11:59:00Z' }), now)).toBe('overdue')
  })

  it('«Просрочено» появляется само, когда now двигается вперёд', () => {
    const t = makeTask({ due_at: '2026-10-04T12:30:00Z' })
    expect(viewOf(t, now)).toBe('new')
    expect(viewOf(t, now + 31 * 60000)).toBe('overdue')
  })

  it('отправленное, подтверждённое и отклонённое не бывают просроченными', () => {
    const due = '2020-01-01T00:00:00Z'
    expect(viewOf(makeTask({ status: 'submitted', due_at: due }), now)).toBe('submitted')
    expect(viewOf(makeTask({ status: 'approved', due_at: due }), now)).toBe('approved')
    expect(viewOf(makeTask({ status: 'rejected', due_at: due }), now)).toBe('rejected')
  })
})

describe('dayDiff', () => {
  it('сегодня = 0, завтра = 1, вчера = -1', () => {
    expect(dayDiff(daysFromNow(0))).toBe(0)
    expect(dayDiff(daysFromNow(1))).toBe(1)
    expect(dayDiff(daysFromNow(-1))).toBe(-1)
    expect(dayDiff(daysFromNow(5))).toBe(5)
  })
})

describe('formatDue', () => {
  it('без срока', () => {
    expect(formatDue(null)).toBe('Без срока')
  })
  it('сегодня / завтра / вчера', () => {
    expect(formatDue(daysFromNow(0))).toMatch(/^Сегодня, \d{2}:\d{2}$/)
    expect(formatDue(daysFromNow(1))).toMatch(/^Завтра, \d{2}:\d{2}$/)
    expect(formatDue(daysFromNow(-1))).toMatch(/^Вчера, \d{2}:\d{2}$/)
  })
  it('дальше показывает дату', () => {
    expect(formatDue(daysFromNow(10))).toMatch(/\d/)
    expect(formatDue(daysFromNow(10))).not.toMatch(/^(Сегодня|Завтра|Вчера)/)
  })
})

describe('matchesFilter', () => {
  it('«Сегодня»: без срока, сегодня и отклонённые', () => {
    expect(matchesFilter(makeTask(), 'today')).toBe(true)
    expect(matchesFilter(makeTask({ due_at: daysFromNow(0, 23) }), 'today')).toBe(true)
    expect(matchesFilter(makeTask({ status: 'rejected' }), 'today')).toBe(true)
  })

  it('«Сегодня» не показывает завтрашние', () => {
    expect(matchesFilter(makeTask({ due_at: daysFromNow(1) }), 'today')).toBe(false)
  })

  it('«Предстоящие»: только со сроком позже сегодняшнего дня', () => {
    expect(matchesFilter(makeTask({ due_at: daysFromNow(2) }), 'upcoming')).toBe(true)
    expect(matchesFilter(makeTask({ due_at: daysFromNow(0, 23) }), 'upcoming')).toBe(false)
    expect(matchesFilter(makeTask(), 'upcoming')).toBe(false)
  })

  it('«На проверке», «Выполненные», «Просроченные»', () => {
    expect(matchesFilter(makeTask({ status: 'submitted' }), 'review')).toBe(true)
    expect(matchesFilter(makeTask({ status: 'approved' }), 'done')).toBe(true)
    expect(matchesFilter(makeTask({ due_at: '2020-01-01T00:00:00Z' }), 'overdue')).toBe(true)
    expect(matchesFilter(makeTask(), 'overdue')).toBe(false)
  })

  it('каждое задание попадает ровно в один фильтр', () => {
    const filters = ['today', 'upcoming', 'review', 'done', 'overdue'] as const
    const tasks = [
      makeTask(),
      makeTask({ due_at: daysFromNow(3) }),
      makeTask({ due_at: '2020-01-01T00:00:00Z' }),
      makeTask({ status: 'submitted' }),
      makeTask({ status: 'approved' }),
      makeTask({ status: 'rejected' }),
    ]
    for (const t of tasks) {
      expect(filters.filter((f) => matchesFilter(t, f))).toHaveLength(1)
    }
  })
})

describe('toLocalInput', () => {
  it('формат для поля datetime-local', () => {
    expect(toLocalInput(daysFromNow(0))).toMatch(/^\d{4}-\d{2}-\d{2}T12:00$/)
  })
})
