import { describe, expect, it } from 'vitest'
import { MAX_MS, MIN_MS, RESUME_AFTER_MS, RESUME_MS, remainingMs, shouldShowResume } from '../splash'

describe('заставка: минимальное время показа', () => {
  it('быстрая загрузка: добираем до минимума', () => {
    expect(remainingMs(300)).toBe(MIN_MS - 300)
    expect(remainingMs(0)).toBe(MIN_MS)
  })
  it('медленная загрузка: не добавляем лишней задержки', () => {
    expect(remainingMs(MIN_MS)).toBe(0)
    expect(remainingMs(MIN_MS + 5000)).toBe(0)
  })
  it('отрицательное время (сбой часов) не ломает расчёт', () => {
    expect(remainingMs(-50)).toBe(MIN_MS)
  })
  it('минимум разумный, страховка длиннее минимума', () => {
    expect(MIN_MS).toBeGreaterThanOrEqual(2000)
    expect(MIN_MS).toBeLessThanOrEqual(3000)
    expect(MAX_MS).toBeGreaterThan(MIN_MS)
  })
})

describe('повторное открытие приложения', () => {
  it('короткий выход в фон заставку не показывает, долгий — показывает', () => {
    expect(shouldShowResume(5_000)).toBe(false)
    expect(shouldShowResume(RESUME_AFTER_MS - 1)).toBe(false)
    expect(shouldShowResume(RESUME_AFTER_MS)).toBe(true)
    expect(shouldShowResume(3_600_000)).toBe(true)
  })
  it('повторная заставка короткая: 1,5–2,5 с', () => {
    expect(RESUME_MS).toBeGreaterThanOrEqual(1500)
    expect(RESUME_MS).toBeLessThanOrEqual(2500)
  })
})
