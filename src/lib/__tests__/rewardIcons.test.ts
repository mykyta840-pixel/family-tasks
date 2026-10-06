import { describe, expect, it } from 'vitest'
import { DEFAULT_REWARD_ICON, LEGACY_EMOJI, REWARD_GROUPS, REWARD_GROUP_OF, REWARD_GROUP_RGB, REWARD_ICON_KEYS, resolveRewardIcon, rewardIconsOfGroup } from '../rewardIconKeys'
import { isPushTestTag } from '../pushUtil'

describe('библиотека иконок наград', () => {
  it('ключи уникальны, у каждого есть группа и цвет', () => {
    expect(new Set(REWARD_ICON_KEYS).size).toBe(REWARD_ICON_KEYS.length)
    let total = 0
    for (const g of REWARD_GROUPS) { expect(REWARD_GROUP_RGB[g]).toMatch(/^\d+ \d+ \d+$/); total += rewardIconsOfGroup(g).length }
    expect(total).toBe(REWARD_ICON_KEYS.length)
    for (const k of REWARD_ICON_KEYS) expect(REWARD_GROUPS).toContain(REWARD_GROUP_OF[k])
  })
  it('старые emoji из базы превращаются в ключи, неизвестное -> подарок', () => {
    for (const [emoji, key] of Object.entries(LEGACY_EMOJI)) expect(resolveRewardIcon(emoji)).toBe(key)
    expect(resolveRewardIcon('gamepad')).toBe('gamepad')
    expect(resolveRewardIcon('🦄')).toBe(DEFAULT_REWARD_ICON)
    expect(resolveRewardIcon(null)).toBe(DEFAULT_REWARD_ICON)
  })
})
describe('тест уведомления', () => {
  it('тег тестового push распознаётся, остальные нет', () => {
    expect(isPushTestTag('push_test:abc')).toBe(true)
    expect(isPushTestTag('task_new:abc')).toBe(false)
    expect(isPushTestTag(undefined)).toBe(false)
  })
})
