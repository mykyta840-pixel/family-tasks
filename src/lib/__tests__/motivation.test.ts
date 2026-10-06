import { describe, expect, it } from 'vitest'
import { MOT_KINDS, pickMotivation, seedOf, VARIANTS, type MotInput } from '../motivation'
import ru from '../../i18n/locales/ru'
import en from '../../i18n/locales/en'
import de from '../../i18n/locales/de'
import uk from '../../i18n/locales/uk'

const base: MotInput = { todo: 0, waiting: 0, earnedToday: 0, streak: 0, balance: 0, rewards: [] }
const kind = (p: Partial<MotInput>, seed = 0) => pickMotivation({ ...base, ...p }, seed).kind

describe('мотивационные сообщения', () => {
  it('хватает на награду → afford, называет самую дорогую доступную', () => {
    const m = pickMotivation({ ...base, balance: 50, rewards: [{ title: 'Кино', cost: 40 }, { title: 'Мороженое', cost: 10 }, { title: 'Велосипед', cost: 500 }] }, 1)
    expect(m.kind).toBe('afford')
    expect(m.vars.reward).toBe('Кино')
  })
  it('почти хватает → close с остатком', () => {
    const m = pickMotivation({ ...base, balance: 80, rewards: [{ title: 'Кино', cost: 100 }] }, 0)
    expect(m.kind).toBe('close')
    expect(m.vars.left).toBe(20)
  })
  it('далеко до награды → не close', () => {
    expect(kind({ balance: 10, todo: 2, rewards: [{ title: 'Кино', cost: 100 }] })).toBe('start')
  })
  it('порядок остальных видов', () => {
    expect(kind({ waiting: 2 })).toBe('wait')
    expect(kind({ waiting: 2, todo: 1, streak: 3 })).toBe('streak')
    expect(kind({ streak: 1, earnedToday: 15, todo: 1 })).toBe('today')
    expect(kind({ todo: 3 })).toBe('start')
    expect(kind({})).toBe('free')
  })
  it('вариант стабилен для одного seed и всегда 1..3', () => {
    const s = seedOf('child-1', 20000)
    expect(pickMotivation(base, s).n).toBe(pickMotivation(base, s).n)
    for (let i = 0; i < 20; i++) expect([1, 2, 3]).toContain(pickMotivation(base, i).n)
  })
  it('для каждого вида и варианта есть текст во всех 4 языках', () => {
    for (const dict of [ru, en, de, uk] as Record<string, string>[]) {
      for (const k of MOT_KINDS) for (let n = 1; n <= VARIANTS; n++) expect(dict[`mot.${k}.${n}`], `mot.${k}.${n}`).toBeTruthy()
    }
  })
})
