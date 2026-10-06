// Мотивационные сообщения ребёнку. Чистая логика: по ситуации выбирается «вид» сообщения,
// внутри вида — один из 3 вариантов (стабильно в течение дня, чтобы текст не прыгал при обновлении).
// Тексты лежат в переводах: mot.<вид>.<1..3>.

export const VARIANTS = 3

export type MotKind = 'afford' | 'close' | 'wait' | 'streak' | 'today' | 'start' | 'free'
export const MOT_KINDS: MotKind[] = ['afford', 'close', 'wait', 'streak', 'today', 'start', 'free']

export interface MotInput {
  todo: number // заданий, которые пора делать сегодня
  waiting: number // сдано, ждёт проверки
  earnedToday: number // кристаллов получено сегодня
  streak: number // дней подряд с кристаллами
  balance: number
  /** Награды семьи, доступные ребёнку (active). */
  rewards: { title: string; cost: number }[]
}

export interface Motivation {
  kind: MotKind
  n: 1 | 2 | 3
  vars: Record<string, string | number>
}

/** Число из строки+числа (одинаковое для одного и того же ребёнка и дня). */
export function seedOf(text: string, day: number): number {
  let h = day
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

export function pickMotivation(i: MotInput, seed: number): Motivation {
  const n = ((seed % VARIANTS) + 1) as 1 | 2 | 3
  const sorted = [...i.rewards].filter((r) => r.cost > 0).sort((a, b) => a.cost - b.cost)

  // 1. Уже хватает на награду — самое сильное сообщение (называем самую дорогую из доступных)
  const affordable = sorted.filter((r) => r.cost <= i.balance)
  if (affordable.length) return { kind: 'afford', n, vars: { reward: affordable[affordable.length - 1].title } }

  // 2. До ближайшей награды осталось немного (не больше трети цены, но не пусто)
  const next = sorted[0]
  if (next && i.balance > 0 && next.cost - i.balance <= Math.ceil(next.cost / 3)) {
    return { kind: 'close', n, vars: { reward: next.title, left: next.cost - i.balance } }
  }

  // 3. Всё сдано, ждём родителей
  if (i.todo === 0 && i.waiting > 0) return { kind: 'wait', n, vars: { count: i.waiting } }

  // 4. Серия дней
  if (i.streak >= 2) return { kind: 'streak', n, vars: { days: i.streak } }

  // 5. Сегодня уже заработано
  if (i.earnedToday > 0) return { kind: 'today', n, vars: { amount: i.earnedToday } }

  // 6. Есть что делать / нечего делать
  if (i.todo > 0) return { kind: 'start', n, vars: { count: i.todo } }
  return { kind: 'free', n, vars: {} }
}
