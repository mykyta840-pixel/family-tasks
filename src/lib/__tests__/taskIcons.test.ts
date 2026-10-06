import { describe, expect, it } from 'vitest'
import { DEFAULT_ICON, GROUP_RGB, ICON_GROUPS, ICON_GROUP_OF, TASK_ICON_KEYS, iconsOfGroup, isTaskIconKey, resolveIconKey } from '../taskIconKeys'

describe('библиотека иконок заданий', () => {
  it('ключи уникальны и у каждого есть группа', () => {
    expect(new Set(TASK_ICON_KEYS).size).toBe(TASK_ICON_KEYS.length)
    for (const k of TASK_ICON_KEYS) expect(ICON_GROUPS).toContain(ICON_GROUP_OF[k])
  })
  it('у каждой группы есть цвет и хотя бы одна иконка; все иконки попадают в группы', () => {
    let total = 0
    for (const g of ICON_GROUPS) {
      expect(GROUP_RGB[g]).toMatch(/^\d+ \d+ \d+$/)
      expect(iconsOfGroup(g).length).toBeGreaterThan(0)
      total += iconsOfGroup(g).length
    }
    expect(total).toBe(TASK_ICON_KEYS.length)
  })
  it('неизвестный, пустой или старый ключ даёт иконку по умолчанию', () => {
    expect(resolveIconKey('dishes')).toBe('dishes')
    expect(resolveIconKey('removed-icon')).toBe(DEFAULT_ICON)
    expect(resolveIconKey(null)).toBe(DEFAULT_ICON)
    expect(resolveIconKey(undefined)).toBe(DEFAULT_ICON)
    expect(isTaskIconKey('general')).toBe(true)
    expect(isTaskIconKey(5)).toBe(false)
  })
})
