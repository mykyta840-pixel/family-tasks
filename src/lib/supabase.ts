import { createClient } from '@supabase/supabase-js'

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
