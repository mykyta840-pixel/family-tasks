// Чистая математика кадрирования фото в круге (без DOM — легко тестировать).
// Окно (viewport) — квадрат со стороной `view` пикселей экрана; круг вписан в него.
// zoom = 1 — фото по меньшей стороне ровно закрывает окно; больше — приближение.

export type Crop = { zoom: number; x: number; y: number }

export const MAX_ZOOM = 4

/** Размер фото на экране при данном zoom. */
export function drawnSize(imgW: number, imgH: number, view: number, zoom: number) {
  const base = view / Math.min(imgW, imgH)
  return { w: imgW * base * zoom, h: imgH * base * zoom }
}

/** Смещение x/y — сдвиг центра фото от центра окна, в пикселях экрана. Не даёт показать пустоту. */
export function clampCrop(imgW: number, imgH: number, view: number, c: Crop): Crop {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, c.zoom))
  const { w, h } = drawnSize(imgW, imgH, view, zoom)
  const mx = Math.max(0, (w - view) / 2)
  const my = Math.max(0, (h - view) / 2)
  return { zoom, x: Math.min(mx, Math.max(-mx, c.x)), y: Math.min(my, Math.max(-my, c.y)) }
}

/** Какой квадрат исходного фото (в его пикселях) попал в окно. */
export function sourceRect(imgW: number, imgH: number, view: number, c: Crop) {
  const k = clampCrop(imgW, imgH, view, c)
  const { w, h } = drawnSize(imgW, imgH, view, k.zoom)
  const scale = w / imgW // экранных пикселей на один пиксель фото
  const side = view / scale
  const left = (w - view) / 2 - k.x // левый край окна внутри нарисованного фото
  const top = (h - view) / 2 - k.y
  return { sx: left / scale, sy: top / scale, side }
}
