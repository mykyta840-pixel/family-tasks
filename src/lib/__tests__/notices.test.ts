import { describe, expect, it } from 'vitest'
import { ago, noticeLink } from '../notices'

const MIN = 60000
const base = new Date('2026-10-04T12:00:00Z').getTime()
const at = (msBefore: number) => new Date(base - msBefore).toISOString()

describe('ago', () => {
  it('только что', () => {
    expect(ago(at(10_000), base)).toBe('только что')
  })
  it('будущее время не уходит в минус', () => {
    expect(ago(new Date(base + 5 * MIN).toISOString(), base)).toBe('только что')
  })
  it('минуты и часы', () => {
    expect(ago(at(5 * MIN), base)).toBe('5 мин назад')
    expect(ago(at(120 * MIN), base)).toBe('2 ч назад')
  })
  it('вчера и дни', () => {
    expect(ago(at(26 * 60 * MIN), base)).toBe('вчера')
    expect(ago(at(3 * 24 * 60 * MIN), base)).toBe('3 дн. назад')
  })
  it('старше недели: дата ДД.ММ', () => {
    expect(ago(at(20 * 24 * 60 * MIN), base)).toMatch(/^\d{2}\.\d{2}$/)
  })
})

describe('noticeLink', () => {
  const n = (type: string) => ({ type }) as Parameters<typeof noticeLink>[0]
  it('награды ведут в магазин, вступление в семью, остальное на главную', () => {
    expect(noticeLink(n('reward_requested'))).toBe('/rewards')
    expect(noticeLink(n('reward_approved'))).toBe('/rewards')
    expect(noticeLink(n('member_joined'))).toBe('/family')
    expect(noticeLink(n('task_submitted'))).toBe('/')
  })
})
