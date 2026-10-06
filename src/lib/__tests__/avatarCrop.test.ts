import { describe, expect, it } from 'vitest'
import { clampCrop, sourceRect } from '../avatarCrop'

describe('кадрирование фото', () => {
  it('по умолчанию — квадрат по центру (как раньше)', () => {
    const r = sourceRect(2000, 1000, 300, { zoom: 1, x: 0, y: 0 })
    expect(r.side).toBeCloseTo(1000)
    expect(r.sx).toBeCloseTo(500)
    expect(r.sy).toBeCloseTo(0)
  })

  it('приближение уменьшает захваченный квадрат', () => {
    const r = sourceRect(1000, 1000, 300, { zoom: 2, x: 0, y: 0 })
    expect(r.side).toBeCloseTo(500)
    expect(r.sx).toBeCloseTo(250)
    expect(r.sy).toBeCloseTo(250)
  })

  it('сдвиг влево показывает правую часть широкого фото', () => {
    // фото 2000x1000, окно 300: нарисовано 600x300, можно сдвинуть на 150
    const r = sourceRect(2000, 1000, 300, { zoom: 1, x: -150, y: 0 })
    expect(r.sx).toBeCloseTo(1000)
    expect(r.sx + r.side).toBeCloseTo(2000)
  })

  it('нельзя вытащить фото за край (пустоты не будет)', () => {
    const c = clampCrop(2000, 1000, 300, { zoom: 1, x: -999, y: 999 })
    expect(c.x).toBeCloseTo(-150)
    expect(c.y).toBeCloseTo(0)
    const r = sourceRect(1000, 1000, 300, { zoom: 3, x: 99999, y: -99999 })
    expect(r.sx).toBeGreaterThanOrEqual(0)
    expect(r.sy + r.side).toBeLessThanOrEqual(1000.0001)
  })

  it('zoom ограничен диапазоном 1..4', () => {
    expect(clampCrop(100, 100, 100, { zoom: 0.2, x: 0, y: 0 }).zoom).toBe(1)
    expect(clampCrop(100, 100, 100, { zoom: 9, x: 0, y: 0 }).zoom).toBe(4)
  })
})
