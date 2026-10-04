import { supabase } from './supabase'

const SIZE = 512

// Загружает картинку из файла. Бросает ошибку, если формат не читается браузером.
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

// Вырезает квадрат по центру, уменьшает до 512x512 и сохраняет как JPEG (обычно 50-150 КБ).
async function toSquareJpeg(file: File): Promise<Blob> {
  const img = await loadImage(file)
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  if (!side) throw new Error('bad_image')
  const sx = (img.naturalWidth - side) / 2
  const sy = (img.naturalHeight - side) / 2
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('bad_image')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE)
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('bad_image'))), 'image/jpeg', 0.85)
  })
}

// Загружает фото в bucket avatars по пути <user_id>/avatar.jpg и записывает ссылку в профиль.
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const blob = await toSquareJpeg(file)
  const path = `${userId}/avatar.jpg`
  const up = await supabase.storage.from('avatars').upload(path, blob, {
    upsert: true,
    contentType: 'image/jpeg',
    cacheControl: '3600',
  })
  if (up.error) throw up.error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  // ?v= нужен, чтобы телефон не показывал старое фото из кэша (путь файла всегда один и тот же)
  const url = `${data.publicUrl}?v=${Date.now()}`
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
  if (error) throw error
  return url
}

export async function removeAvatar(userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
  if (error) throw error
  // Файл удаляем после очистки ссылки; если не получилось, это не критично
  await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`])
}
