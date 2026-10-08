import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Coin from './Coin'
import { useFamilyData } from '../data/FamilyData'
import { useI18n } from '../i18n'
import { supabase } from '../lib/supabase'
import {
  DEFAULT_PERIOD, PERIODS, bucketsByDay, earnedByChild, firstEarnedDay, periodStart, sumEarned,
  type EarnedRow, type Period,
} from '../lib/earned'
import { dayKey, parseDayKey } from '../lib/calendar'
import Avatar from './Avatar'

const LOCALE: Record<string, string> = { en: 'en-GB', de: 'de-DE', ru: 'ru-RU', uk: 'uk-UA' }
const PAGE = 1000

// Журнал начислений с сервера (RLS отдаёт только свою семью). Постранично, чтобы «Всё время» не обрезалось.
async function fetchEarned(since: Date | null): Promise<EarnedRow[]> {
  const out: EarnedRow[] = []
  for (let page = 0; page < 100; page++) {
    let q = supabase
      .from('points_transactions')
      .select('child_id, amount, created_at')
      .gt('amount', 0)
      .order('created_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)
    if (since) q = q.gte('created_at', since.toISOString())
    const { data, error } = await q
    if (error) throw error
    const rows = (data ?? []) as EarnedRow[]
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

// Блок «Заработано» с выбором периода. Баланс детей он не затрагивает — только статистика.
export default function EarnedCard() {
  const { t, lang } = useI18n()
  const { txns, children, now: tick } = useFamilyData()
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD)
  const [rows, setRows] = useState<EarnedRow[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')

  // Когда меняется неделя/месяц/день, ключ меняется и данные запрашиваются заново
  const now = useMemo(() => new Date(tick), [tick])
  const startKey = useMemo(() => {
    const s = periodStart(period, now)
    return s ? dayKey(s) : 'all'
  }, [period, now])
  // Новое начисление: FamilyData перезагружает txns — по первой записи понимаем, что надо обновиться
  const syncKey = `${txns.length}:${txns[0]?.id ?? ''}`

  useEffect(() => {
    let alive = true
    setState('loading')
    fetchEarned(parseDayKey(startKey))
      .then((r) => {
        if (!alive) return
        setRows(r)
        setState('ok')
      })
      .catch(() => alive && setState('error'))
    return () => {
      alive = false
    }
  }, [startKey, syncKey])

  const total = sumEarned(rows, period, now)
  const buckets = useMemo(() => bucketsByDay(rows, period, now), [rows, period, now])
  const max = Math.max(1, ...buckets.map((b) => b.value))
  const perChild = useMemo(() => earnedByChild(rows, period, now), [rows, period, now])
  const since = period === 'all' ? firstEarnedDay(rows) : null
  const loc = LOCALE[lang] ?? 'en-GB'
  const todayKey = dayKey(now)
  const month = period === 'month'

  return (
    <section className="card flex flex-col gap-3" aria-label={t('earned.title')}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-ink/60">{t('earned.title')}</h2>
        <div className="inline-flex shrink-0 items-center gap-1 font-display text-lg font-semibold text-star" aria-live="polite">
          <Coin size={16} /> {state === 'ok' ? total : '…'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-ctl bg-ink/5 p-1" role="radiogroup" aria-label={t('earned.period')}>
        {PERIODS.map((p) => (
          <button
            key={p} type="button" role="radio" aria-checked={period === p}
            onClick={() => setPeriod(p)}
            className={`min-h-[40px] min-w-0 truncate rounded-[10px] px-2 text-[13px] font-semibold transition duration-fast ${
              period === p ? 'bg-surface text-ink shadow-card' : 'text-ink/60'}`}
          >
            {t(`earned.${p}`)}
          </button>
        ))}
      </div>

      {state === 'error' ? (
        <p role="alert" className="py-3 text-center text-sm text-warn">{t('earned.error')}</p>
      ) : state === 'loading' ? (
        <div className="skeleton h-28" />
      ) : total === 0 ? (
        <p className="py-4 text-center text-sm text-ink/60">{t(`earned.empty.${period}`)}</p>
      ) : (
        <>
          {buckets.length > 0 && (
            <div className={`flex h-32 items-end ${month ? 'gap-[2px]' : 'gap-2'}`} role="img" aria-label={t('earned.sum', { n: total })}>
              {buckets.map((b, i) => {
                const today = b.key === todayKey
                const label = month
                  ? (i === 0 || (i + 1) % 5 === 0 ? String(b.date.getDate()) : '')
                  : b.date.toLocaleDateString(loc, { weekday: 'short' })
                return (
                  <div key={b.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    {!month && <span className="text-[11px] font-semibold text-ink/60">{b.value > 0 ? b.value : ''}</span>}
                    <motion.div
                      className={`w-full rounded-t-md ${b.value === 0 ? 'bg-ink/10' : today ? 'bg-brand shadow-glow' : 'bg-brand/50'}`}
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(b.value === 0 ? 3 : 8, (b.value / max) * 100)}%` }}
                      transition={{ duration: 0.4, delay: Math.min(i, 12) * 0.02 }}
                    />
                    <span className={`h-3 text-[10px] uppercase ${today ? 'font-bold text-brand' : 'text-ink/50'}`}>{label}</span>
                  </div>
                )
              })}
            </div>
          )}
          {since && (
            <p className="text-center text-xs text-ink/60">
              {t('earned.since', { date: (parseDayKey(since) ?? new Date()).toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' }) })}
            </p>
          )}
          {children.length > 1 && (
            <div className="flex flex-col gap-1 border-t border-ink/10 pt-2">
              {children.map((c) => (
                <div key={c.id} className="flex min-h-[40px] min-w-0 items-center gap-2 text-sm">
                  <Avatar name={c.name} url={c.avatar_url} size={28} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-star">
                    <Coin size={13} /> {perChild.get(c.id) ?? 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
