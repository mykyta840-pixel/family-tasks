import { supabase } from './supabase'
import { taskImagePath } from './tasks'

const MAX_SIDE = 1280 // длинная сторона после сжатия
const LIMIT = 1_900_000 // bucket принимает до 2 МБ

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('bad_image'))
    }
    img.src = url
  })
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('bad_image'))), 'image/jpeg', quality)
  })
}

// Уменьшает до 1280 px по длинной стороне и сохраняет JPEG; если всё равно больше 2 МБ, снижает качество
async function toJpeg(file: File): Promise<Blob> {
  const img = await loadImage(file)
  const w = img.naturalWidth
  const h = img.naturalHeight
  if (!w || !h) throw new Error('bad_image')
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('bad_image')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  let blob = await toBlob(canvas, 0.82)
  if (blob.size > LIMIT) blob = await toBlob(canvas, 0.6)
  return blob
}

// Загружает картинку в bucket task-images по пути <family_id>/<uuid>.jpg и возвращает публичную ссылку
export async function uploadTaskImage(familyId: string, file: File): Promise<string> {
  const blob = await toJpeg(file)
  const name = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const path = `${familyId}/${name}.jpg`
  const up = await supabase.storage.from('task-images').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (up.error) throw up.error
  return supabase.storage.from('task-images').getPublicUrl(path).data.publicUrl
}

// Удаляет файл по ссылке. Если не получилось, это не критично (просто останется лишний файл)
export async function removeTaskImage(url: string | null | undefined): Promise<void> {
  const path = taskImagePath(url)
  if (!path) return
  await supabase.storage.from('task-images').remove([path])
}
