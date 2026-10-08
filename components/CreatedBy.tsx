import { useFamilyData } from '../data/FamilyData'
import { useI18n } from '../i18n'
import type { Task } from '../lib/tasks'
import Avatar from './Avatar'

// «Добавил: Hanna» — по настоящему профилю участника семьи (не текстовое поле).
// Если автора уже нет в семье, строка не показывается.
export default function CreatedBy({ task, size = 20, className = '' }: { task: Pick<Task, 'created_by'>; size?: number; className?: string }) {
  const { t } = useI18n()
  const { members } = useFamilyData()
  const who = task.created_by ? members.find((m) => m.id === task.created_by) : undefined
  if (!who) return null
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      <Avatar name={who.name} url={who.avatar_url} size={size} />
      <span className="truncate">{t('task.addedBy', { name: who.name })}</span>
    </span>
  )
}
