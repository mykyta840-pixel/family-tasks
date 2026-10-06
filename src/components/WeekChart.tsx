import { useMemo } from 'react'
import { motion } from 'framer-motion'
import Coin from './Coin'
import { earnedByDay } from '../lib/stats'
import { useFamilyData } from '../data/FamilyData'
import { useI18n } from '../i18n'

const LOCALE: Record<string, string> = { en: 'en-GB', de: 'de-DE', ru: 'ru-RU', uk: 'uk-UA' }

// Столбики «сколько кристаллов заработано за последние 7 дней». Без библиотек: обычные блоки.
export default function WeekChart({ childId, title }: { childId: string | null; title: string }) {
  const { t, lang } = useI18n()
  const { txns } = useFamilyData()
  const days = useMemo(() => earnedByDay(txns, childId), [txns, childId])
  const total = days.reduce((s, d) => s + d.value, 0)
  const max = Math.max(1, ...days.map((d) => d.value))
  const loc = LOCALE[lang] ?? 'en-GB'

  return (
    <section className="card flex flex-col gap-3" aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/60">{title}</h2>
        <div className="inline-flex items-center gap-1 font-display text-lg font-semibold text-star">
          <Coin size={16} /> {total}
        </div>
      </div>
      {total === 0 ? (
        <p className="py-4 text-center text-sm text-ink/60">{t('chart.empty')}</p>
      ) : (
        <div className="flex h-36 items-end gap-2" role="img" aria-label={t('chart.total', { n: total })}>
          {days.map((d, i) => {
            const today = i === days.length - 1
            return (
              <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[11px] font-semibold text-ink/60">{d.value > 0 ? d.value : ''}</span>
                <motion.div
                  className={`w-full rounded-t-md ${d.value === 0 ? 'bg-ink/10' : today ? 'bg-brand shadow-glow' : 'bg-brand/50'}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(d.value === 0 ? 3 : 8, (d.value / max) * 100)}%` }}
                  transition={{ duration: 0.5, delay: i * 0.04 }}
                />
                <span className={`text-[11px] uppercase ${today ? 'font-bold text-brand' : 'text-ink/50'}`}>
                  {d.date.toLocaleDateString(loc, { weekday: 'short' })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
