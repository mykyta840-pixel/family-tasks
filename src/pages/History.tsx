import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, ClipboardCheck, Gift, History as HistoryIcon, SlidersHorizontal, Star, type LucideIcon } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useFamilyData } from '../data/FamilyData'
import { useI18n } from '../i18n'
import type { Child } from '../lib/tasks'
import type { Txn } from '../lib/rewards'

const KIND_ICON: Record<Txn['kind'], LucideIcon> = { task: ClipboardCheck, reward: Gift, adjust: SlidersHorizontal }

function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export default function History() {
  const { t, lang } = useI18n()
  const { role, session } = useAuth()
  const { txns, children, loading } = useFamilyData()
  const [who, setWho] = useState('all')
  const byId = useMemo(() => new Map<string, Child>(children.map((c) => [c.id, c] as [string, Child])), [children])
  const list = role === 'parent' && who !== 'all' ? txns.filter((x) => x.child_id === who) : txns
  const myBalance = children.find((c) => c.id === session?.user.id)?.balance ?? 0

  const earned = list.filter((x) => x.amount > 0).reduce((s, x) => s + x.amount, 0)
  const spent = list.filter((x) => x.amount < 0).reduce((s, x) => s + Math.abs(x.amount), 0)

  // Группировка по дням: «Сегодня», «Вчера», дальше дата
  const groups = useMemo(() => {
    const out: { key: string; iso: string; items: Txn[] }[] = []
    for (const x of list) {
      const k = dayKey(x.created_at)
      const last = out[out.length - 1]
      if (last && last.key === k) last.items.push(x)
      else out.push({ key: k, iso: x.created_at, items: [x] })
    }
    return out
  }, [list])

  const todayKey = dayKey(new Date().toISOString())
  const yesterdayKey = dayKey(new Date(Date.now() - 86400000).toISOString())
  const dayLabel = (g: { key: string; iso: string }) =>
    g.key === todayKey
      ? t('date.today')
      : g.key === yesterdayKey
        ? t('date.yesterday')
        : new Date(g.iso).toLocaleDateString(lang, { day: 'numeric', month: 'long' })
  const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold">{t('hist.title')}</h1>

      {role === 'child' && (
        <div className="rounded-card border border-ink/10 bg-gradient-to-br from-brand to-brand-dark p-5 text-on-brand shadow-glow">
          <div className="text-sm opacity-80">{t('child.myPoints')}</div>
          <div className="mt-1 flex items-center gap-2 font-display text-4xl font-semibold leading-none">
            <Star size={30} fill="currentColor" aria-hidden /> {myBalance}
          </div>
        </div>
      )}

      {role === 'parent' && children.length > 1 && (
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="tablist">
          {[{ id: 'all', name: t('hist.all') }, ...children].map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={who === c.id}
              onClick={() => setWho(c.id)}
              className={`min-h-[44px] shrink-0 rounded-full border px-4 text-sm font-semibold transition duration-fast active:scale-95 ${
                who === c.id ? 'border-brand bg-brand text-on-brand shadow-glow' : 'border-ink/10 bg-surface/70 text-ink/70'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card flex items-center gap-3 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ok-soft text-ok">
              <ArrowUpRight size={20} aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-ink/60">{t('hist.earned')}</div>
              <div className="font-display text-lg font-semibold text-ok">+{earned}</div>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-warn-soft text-warn">
              <ArrowDownRight size={20} aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-ink/60">{t('hist.spent')}</div>
              <div className="font-display text-lg font-semibold text-warn">−{spent}</div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        [0, 1, 2].map((i) => <div key={i} className="skeleton h-16" />)
      ) : list.length === 0 ? (
        <div className="glass flex flex-col items-center gap-2 rounded-card p-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
            <HistoryIcon size={28} aria-hidden />
          </div>
          <h2 className="text-lg font-semibold">{t('hist.empty')}</h2>
          <p className="text-sm text-ink/60">{t('hist.emptySub')}</p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-ink/60">{dayLabel(g)}</h2>
            {g.items.map((x, i) => {
              const plus = x.amount > 0
              const Icon = KIND_ICON[x.kind] ?? SlidersHorizontal
              return (
                <motion.div
                  key={x.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 6) * 0.03 }}
                  className="card flex items-center gap-3"
                >
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${plus ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}>
                    <Icon size={20} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{x.title}</div>
                    <div className="truncate text-sm text-ink/50">
                      {role === 'parent' && `${byId.get(x.child_id)?.name ?? t('dash.child')} · `}
                      {t(`hist.kind.${x.kind}`)} · {timeOf(x.created_at)}
                    </div>
                  </div>
                  <div className={`inline-flex shrink-0 items-center gap-1 font-display font-semibold ${plus ? 'text-ok' : 'text-warn'}`}>
                    {plus ? '+' : '−'}
                    {Math.abs(x.amount)}
                    <Star size={14} fill="currentColor" aria-hidden />
                  </div>
                </motion.div>
              )
            })}
          </section>
        ))
      )}
    </div>
  )
}
