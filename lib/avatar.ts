import { supabase } from './supabase'

const SIZE = 512

// Загружает картинку из файла. Бросает ошибку, если формат не читается браузером.
export function loadImage(file: Blob): Promise<HTMLImageElement> {
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

// Вырезает выбранный человеком квадрат (rect — в пикселях исходного фото), уменьшает до 512x512
// и сохраняет как JPEG (обычно 50-150 КБ). Результат — готовый квадрат: круг рисуется уже при показе.
export function cropToJpeg(img: HTMLImageElement, rect: { sx: number; sy: number; side: number }): Promise<Blob> {
  if (!(rect.side > 0)) return Promise.reject(new Error('bad_image'))
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('bad_image'))
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.drawImage(img, rect.sx, rect.sy, rect.side, rect.side, 0, 0, SIZE, SIZE)
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('bad_image'))), 'image/jpeg', 0.85)
  })
}

// Кладёт готовое (уже вырезанное) фото в bucket avatars по пути <user_id>/avatar.jpg и возвращает публичную ссылку.
async function putAvatarFile(userId: string, blob: Blob): Promise<string> {
  const path = `${userId}/avatar.jpg`
  const up = await supabase.storage.from('avatars').upload(path, blob, {
    upsert: true,
    contentType: 'image/jpeg',
    cacheControl: '3600',
  })
  if (up.error) throw up.error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  // ?v= нужен, чтобы телефон не показывал старое фото из кэша (путь файла всегда один и тот же)
  return `${data.publicUrl}?v=${Date.now()}`
}

// Своё фото: файл + ссылка в собственном профиле.
export async function uploadAvatar(userId: string, blob: Blob): Promise<string> {
  const url = await putAvatarFile(userId, blob)
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

// Фото ребёнка, которое меняет родитель: файл в папку ребёнка (разрешено политикой хранилища),
// ссылка в профиль — только через защищённую функцию update_child_profile.
export async function uploadChildAvatar(childId: string, blob: Blob): Promise<string> {
  const url = await putAvatarFile(childId, blob)
  const { error } = await supabase.rpc('update_child_profile', { p_child: childId, p_set_avatar: true, p_avatar_url: url })
  if (error) throw error
  return url
}

export async function removeChildAvatar(childId: string): Promise<void> {
  const { error } = await supabase.rpc('update_child_profile', { p_child: childId, p_set_avatar: true, p_avatar_url: null })
  if (error) throw error
  await supabase.storage.from('avatars').remove([`${childId}/avatar.jpg`])
}

// Новое имя ребёнка (родитель).
export async function renameChild(childId: string, name: string): Promise<void> {
  const { error } = await supabase.rpc('update_child_profile', { p_child: childId, p_name: name })
  if (error) throw error
}
