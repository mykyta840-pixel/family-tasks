import { Flame, Gift, Hourglass, Rocket, Smile, Sparkles, Target } from 'lucide-react'
import { useMemo } from 'react'
import { useFamilyData } from '../data/FamilyData'
import { useI18n } from '../i18n'
import { dayKey } from '../lib/calendar'
import { pickMotivation, seedOf, type MotKind } from '../lib/motivation'
import { earnedByDay, earningStreak } from '../lib/stats'

const ICONS: Record<MotKind, typeof Sparkles> = {
  afford: Gift, close: Target, wait: Hourglass, streak: Flame, today: Sparkles, start: Rocket, free: Smile,
}

// Короткое тёплое сообщение под балансом: зависит от того, что сейчас происходит у ребёнка.
export default function MotivationCard({ childId, balance, todo, waiting }: { childId: string; balance: number; todo: number; waiting: number }) {
  const { t } = useI18n()
  const { rewards, txns } = useFamilyData()

  const m = useMemo(() => {
    const now = new Date()
    const days = earnedByDay(txns, childId, now)
    return pickMotivation(
      {
        todo,
        waiting,
        balance,
        earnedToday: days[days.length - 1]?.value ?? 0,
        streak: earningStreak(txns, childId, now),
        rewards: rewards.filter((r) => r.active).map((r) => ({ title: r.title, cost: r.cost })),
      },
      seedOf(childId, Number(dayKey(now).replace(/-/g, ''))), // один и тот же текст в течение дня
    )
  }, [txns, rewards, childId, balance, todo, waiting])

  const Icon = ICONS[m.kind]
  return (
    <div className="glass flex items-start gap-3 rounded-card p-4" role="status">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
        <Icon size={20} aria-hidden />
      </span>
      <p className="pt-1.5 text-sm font-medium leading-snug text-ink/85">{t(`mot.${m.kind}.${m.n}`, m.vars)}</p>
    </div>
  )
}
