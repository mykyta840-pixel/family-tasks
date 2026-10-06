import type { Task } from './tasks'

// Чистые помощники для календаря (без React) — удобно тестировать

export const pad2 = (n: number) => String(n).padStart(2, '0')

/** Ключ дня «ГГГГ-ММ-ДД» по местному времени */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** Разбор ключа дня в Date (полночь по местному времени); null, если ключ неверный */
export function parseDayKey(key: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? '')
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return dayKey(d) === key ? d : null
}

/** Сетка месяца: недели с понедельника, пустые клетки = null. Длина всегда кратна 7. */
export function monthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7 // Пн = 0
  const count = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = Array(lead).fill(null)
  for (let i = 1; i <= count; i++) cells.push(new Date(year, month, i))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** Сдвиг месяца: month может выйти за 0..11 — год пересчитается */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

/** Сколько заданий со сроком приходится на каждый день */
export function tasksByDay(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>()
  for (const t of tasks) {
    if (!t.due_at) continue
    const k = dayKey(new Date(t.due_at))
    const list = map.get(k)
    if (list) list.push(t)
    else map.set(k, [t])
  }
  return map
}

/** Новый срок «ГГГГ-ММ-ДДTЧЧ:ММ»: меняем день, время сохраняем (по умолчанию 18:00) */
export function withDay(current: string, day: string): string {
  const time = /T(\d{2}:\d{2})$/.exec(current)?.[1] ?? '18:00'
  return `${day}T${time}`
}

/** Новый срок: меняем время, день сохраняем (если дня нет — сегодня) */
export function withTime(current: string, time: string): string {
  const day = current.slice(0, 10)
  return `${parseDayKey(day) ? day : dayKey(new Date())}T${time || '18:00'}`
}

/** Будущее задание: срок наступит не сегодня, а в один из следующих дней */
export function isFutureDay(iso: string | null, now = new Date()): boolean {
  if (!iso) return false
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const due = new Date(iso)
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()
  return dueStart > start
}
