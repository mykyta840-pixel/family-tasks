import { createClient } from '@supabase/supabase-js'
import { NO_URL_AUTH, parseAuthUrl, type UrlAuth } from './authUrl'

// Запоминаем, с чем открыли сайт, ДО создания клиента: клиент сам разбирает адрес и стирает из него токен,
// а событие «восстановление пароля» может прийти раньше, чем экран на него подпишется.
export const urlAuth: UrlAuth = typeof window !== 'undefined' ? parseAuthUrl(window.location.hash, window.location.search) : NO_URL_AUTH
if (urlAuth.error && typeof window !== 'undefined') {
  // Сообщение об ошибке в адресе нужно показать один раз, а не при каждом обновлении страницы
  window.history.replaceState(null, '', window.location.pathname)
}

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// true, если пользователь вставил ключи в файл .env
export const isConfigured = Boolean(url && key && !url.includes('ВАШ-ПРОЕКТ'))

// Здесь только публичный anon-ключ. Секретных ключей во frontend нет и не будет.
export const supabase = createClient(
  isConfigured ? url : 'https://placeholder.supabase.co',
  isConfigured ? key : 'placeholder-key',
  { auth: { persistSession: true, autoRefreshToken: true } },
)
