import { supabase } from './supabase'

// Удаление награды любым родителем семьи. RLS не выдаёт ошибку, если строка недоступна, поэтому проверяем результат.
export async function deleteReward(id: string): Promise<void> {
  const { data, error } = await supabase.from('rewards').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('not_allowed')
}
