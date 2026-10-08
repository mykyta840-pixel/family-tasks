// Встроенная библиотека иконок наград. В базе (rewards.icon / reward_redemptions.icon) хранится ключ.
// Старые награды хранят emoji — LEGACY_EMOJI переводит их в ключи, ничего мигрировать не нужно.
export type RewardGroup = 'fun' | 'food' | 'out' | 'things' | 'time'
export const REWARD_GROUPS: RewardGroup[] = ['fun', 'food', 'out', 'things', 'time']

export const REWARD_GROUP_RGB: Record<RewardGroup, string> = {
  fun: '150 120 250',
  food: '245 170 40',
  out: '34 190 230',
  things: '240 100 170',
  time: '40 200 140',
}

export const REWARD_ICON_KEYS = [
  'gamepad', 'movie', 'popcorn', 'tv', 'music', 'art', 'toy',
  'candy', 'pizza', 'icecream', 'cake', 'cafe',
  'trip', 'park', 'bike', 'ball', 'swim', 'ticket', 'camera',
  'phone', 'headphones', 'book', 'clothes', 'money', 'gift',
  'sleep', 'trophy',
] as const
export type RewardIconKey = (typeof REWARD_ICON_KEYS)[number]
export const DEFAULT_REWARD_ICON: RewardIconKey = 'gift'

export const REWARD_GROUP_OF: Record<RewardIconKey, RewardGroup> = {
  gamepad: 'fun', movie: 'fun', popcorn: 'fun', tv: 'fun', music: 'fun', art: 'fun', toy: 'fun',
  candy: 'food', pizza: 'food', icecream: 'food', cake: 'food', cafe: 'food',
  trip: 'out', park: 'out', bike: 'out', ball: 'out', swim: 'out', ticket: 'out', camera: 'out',
  phone: 'things', headphones: 'things', book: 'things', clothes: 'things', money: 'things', gift: 'things',
  sleep: 'time', trophy: 'time',
}

// Прежние emoji из базы -> ключи
export const LEGACY_EMOJI: Record<string, RewardIconKey> = {
  '🎮': 'gamepad', '🍫': 'candy', '🎬': 'movie', '🍕': 'pizza', '🍦': 'icecream', '🧸': 'toy',
  '🎢': 'park', '📱': 'phone', '🚲': 'bike', '⚽': 'ball', '🎨': 'art', '🎁': 'gift',
}

export function isRewardIconKey(v: unknown): v is RewardIconKey {
  return typeof v === 'string' && (REWARD_ICON_KEYS as readonly string[]).includes(v)
}

/** Ключ, старое emoji или что угодно другое -> существующая иконка (по умолчанию «подарок»). */
export function resolveRewardIcon(v: string | null | undefined): RewardIconKey {
  if (isRewardIconKey(v)) return v
  return (v && LEGACY_EMOJI[v]) || DEFAULT_REWARD_ICON
}

export function rewardIconsOfGroup(g: RewardGroup): RewardIconKey[] {
  return REWARD_ICON_KEYS.filter((k) => REWARD_GROUP_OF[k] === g)
}
