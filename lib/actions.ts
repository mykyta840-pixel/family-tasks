import { supabase } from './supabase'

// Вызов защищённой функции в базе. При ошибке выбрасывает её (её показывает humanError).
export async function callRpc(name: string, args: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc(name, args)
  if (error) throw error
}

// То же, но возвращает ответ функции (например, код возврата или результат проверки кода)
export async function callRpcData<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw error
  return data as T
}
