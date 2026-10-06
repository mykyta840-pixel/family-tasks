import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { dayKey, monthGrid, parseDayKey, shiftMonth } from '../lib/calendar'
import { useI18n } from '../i18n'

const LOCALE: Record<string, string> = { en: 'en-GB', de: 'de-DE', ru: 'ru-RU', uk: 'uk-UA' }

// Календарь месяца: выбор дня. Названия месяцев и дней недели — на языке интерфейса (через Intl).
export default function DatePicker({
  value,
  onPick,
  marks,
  minDay,
}: {
  value: string | null // «ГГГГ-ММ-ДД» или null
  onPick: (day: string) => void
  marks?: Map<string, number> // сколько заданий в день (точки под числом)
  minDay?: string // раньше этого дня выбирать нельзя
}) {
  const { t, lang } = useI18n()
  const loc = LOCALE[lang] ?? 'en-GB'
  const initial = parseDayKey(value) ?? new Date()
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() })
  const today = dayKey(new Date())
  const cells = useMemo(() => monthGrid(view.year, view.month), [view.year, view.month])
  const title = new Date(view.year, view.month, 1).toLocaleDateString(loc, { month: 'long', year: 'numeric' })
  // Понедельник 5 января 2026 — любой понедельник подойдёт для подписей
  const weekdays = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map((i) => new Date(2026, 0, 5 + i).toLocaleDateString(loc, { weekday: 'short' })), [loc])

  return (
    <div className="rounded-card border border-ink/10 bg-surface/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="btn-icon" aria-label={t('cal.prev')} onClick={() => setView((v) => shiftMonth(v.year, v.month, -1))}>
          <ChevronLeft size={20} aria-hidden />
        </button>
        <div className="font-semibold capitalize">{title}</div>
        <button type="button" className="btn-icon" aria-label={t('cal.next')} onClick={() => setView((v) => shiftMonth(v.year, v.month, 1))}>
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-ink/50">
        {weekdays.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />
          const key = dayKey(d)
          const selected = key === value
          const disabled = !!minDay && key < minDay
          const n = marks?.get(key) ?? 0
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={d.toLocaleDateString(loc, { day: 'numeric', month: 'long' })}
              onClick={() => onPick(key)}
              className={`relative grid h-11 place-items-center rounded-ctl text-sm font-semibold transition duration-fast active:scale-95 disabled:opacity-30 ${
                selected ? 'bg-brand text-on-brand shadow-glow' : key === today ? 'border border-brand text-brand' : 'text-ink/80'
              }`}
            >
              {d.getDate()}
              {n > 0 && <span aria-hidden className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${selected ? 'bg-on-brand' : 'bg-star'}`} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
