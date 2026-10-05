// Стартовый экран живёт в index.html (виден мгновенно, до загрузки JS).
// Здесь — только аккуратное скрытие: не мигает на быстрой сети и не зависает навсегда.
const MIN_MS = 1200 // минимум показа, считая от начала загрузки страницы
const MAX_MS = 10000 // страховка: если что-то пошло не так, экран всё равно уйдёт

let done = false

export function hideSplash(force = false) {
  if (done) return
  const el = document.getElementById('splash')
  if (!el) { done = true; return }
  const wait = force ? 0 : Math.max(0, MIN_MS - performance.now())
  done = true
  window.setTimeout(() => {
    el.classList.add('splash-out')
    window.setTimeout(() => el.remove(), 600)
  }, wait)
}

export function armSplashFailsafe() {
  window.setTimeout(() => hideSplash(true), MAX_MS)
}
