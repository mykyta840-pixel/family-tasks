import { supabase } from './supabase'
import { removeTaskImage } from './taskImage'
import type { Task } from './tasks'

// Удаление задания любым родителем семьи. RLS не выдаёт ошибку, если строка недоступна, поэтому проверяем,
// что что-то реально удалилось.
export async function deleteTask(task: Pick<Task, 'id' | 'image_url'>): Promise<void> {
  const { data, error } = await supabase.from('tasks').delete().eq('id', task.id).select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('not_allowed')
  if (task.image_url) void removeTaskImage(task.image_url) // старая картинка больше не нужна (best-effort)
}
