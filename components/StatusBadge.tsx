import { AlarmClock, CheckCircle2, Hourglass, Sparkles, XCircle, type LucideIcon } from 'lucide-react'
import { STATUS_UI, type View } from '../lib/tasks'
import { useI18n } from '../i18n'

// Статус = иконка + текст + цвет (цвет не единственный признак)
const ICON: Record<View, LucideIcon> = {
  new: Sparkles, submitted: Hourglass, approved: CheckCircle2, rejected: XCircle, overdue: AlarmClock,
}

export default function StatusBadge({ view }: { view: View }) {
  const { t } = useI18n()
  const Icon = ICON[view]
  return (
    <span className={`inline-flex min-h-[26px] items-center gap-1 rounded-full px-2.5 text-xs font-semibold ${STATUS_UI[view].cls}`}>
      <Icon size={14} strokeWidth={2.25} aria-hidden />
      {t(`status.${view}`)}
    </span>
  )
}

// Компактный значок статуса для маленьких карточек (иконка + цвет; текст для скринридера и подсказки)
export function StatusChip({ view }: { view: View }) {
  const { t } = useI18n()
  const Icon = ICON[view]
  return (
    <span title={t(`status.${view}`)} className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${STATUS_UI[view].cls}`}>
      <Icon size={15} strokeWidth={2.25} aria-hidden />
      <span className="sr-only">{t(`status.${view}`)}</span>
    </span>
  )
}
