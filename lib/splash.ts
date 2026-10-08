// Стартовый экран живёт в index.html (виден мгновенно, до загрузки JS).
// Здесь — только аккуратное скрытие:
//  - показывается минимум MIN_MS (считая от момента, когда экран реально появился);
//  - не уходит, пока не готовы вход (auth) и данные семьи (data);
//  - если что-то пошло не так, всё равно уйдёт через MAX_MS (страховка);
//  - приложение под ним грузится параллельно, поэтому экран скорость не ухудшает.
export const MIN_MS = 2200
// Повторное открытие: приложение вернулось из фона после долгого перерыва — короткая заставка
export const RESUME_AFTER_MS = 60_000
export const RESUME_MS = 1600
export const MAX_MS = 20000
const FADE_MS = 600

/** Сколько ещё нужно подержать экран, чтобы набралось минимальное время (чистая функция, есть тест). */
export function remainingMs(elapsed: number, min = MIN_MS): number {
  return Math.max(0, min - Math.max(0, elapsed))
}

type Need = 'auth' | 'data'
const pending = new Set<Need>(['auth', 'data'])
let done = false
let template: HTMLElement | null = null // копия заставки для повторного показа

function t0(): number {
  const v = (window as unknown as { __splashT0?: number }).__splashT0
  return typeof v === 'number' ? v : 0
}

function finish(force: boolean) {
  if (done) return
  done = true
  const el = document.getElementById('splash')
  if (!el) return
  if (!template) template = el.cloneNode(true) as HTMLElement
  const wait = force ? 0 : remainingMs(performance.now() - t0())
  window.setTimeout(() => {
    el.classList.add('splash-out')
    window.setTimeout(() => el.remove(), FADE_MS)
  }, wait)
}

/** Отметить, что часть приложения готова. Когда готово всё, экран плавно уходит. */
export function splashReady(need: Need) {
  pending.delete(need)
  if (pending.size === 0) finish(false)
}

/** Убрать экран сразу (экран ошибки, нет настроек Supabase, страховка). */
export function hideSplash(force = false) {
  if (force) finish(true)
  else {
    pending.clear()
    finish(false)
  }
}

export function armSplashFailsafe() {
  window.setTimeout(() => hideSplash(true), MAX_MS)
}

/** Нужно ли снова показать заставку после возвращения из фона (чистая функция, есть тест). */
export function shouldShowResume(hiddenMs: number, after = RESUME_AFTER_MS): boolean {
  return hiddenMs >= after
}

function showResume() {
  // первая заставка ещё на экране или её копии нет — показывать нечего
  if (!template || document.getElementById('splash')) return
  const el = template.cloneNode(true) as HTMLElement
  document.body.appendChild(el)
  window.setTimeout(() => {
    el.classList.add('splash-out')
    window.setTimeout(() => el.remove(), FADE_MS)
  }, RESUME_MS)
}

/** Повторное открытие приложения: после перерыва от минуты заставка мелькает снова на ~1,6 с. */
export function installResumeSplash() {
  let hiddenAt: number | null = null
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
      return
    }
    if (hiddenAt === null) return
    const away = Date.now() - hiddenAt
    hiddenAt = null
    if (shouldShowResume(away)) showResume()
  })
}
