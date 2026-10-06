import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BellRing, CalendarDays, ClipboardList, Gift, Gem, Sparkles, X, type LucideIcon } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'

const KEY = (uid: string) => `ft.tour.${uid}`
const EVENT = 'ft:tour'

/** Показать приветственный тур при следующем входе в приложение (вызывается после создания семьи / входа по коду). */
export function markTourPending(uid: string) {
  try { localStorage.setItem(KEY(uid), 'pending') } catch { /* ignore */ }
}
/** Открыть тур сейчас (кнопка «Как это работает» в «Настройках»). */
export function openTour() {
  window.dispatchEvent(new Event(EVENT))
}

const STEPS: Record<'parent' | 'child', LucideIcon[]> = {
  parent: [ClipboardList, BellRing, Gem, CalendarDays],
  child: [Sparkles, Gem, Gift],
}

// Короткий тур из нескольких экранов: что делать в приложении. Для нового участника показывается один раз.
export default function WelcomeTour() {
  const { t } = useI18n()
  const { session, role } = useAuth()
  const uid = session?.user.id
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const kind = role === 'parent' ? 'parent' : 'child'
  const icons = STEPS[kind]

  useEffect(() => {
    if (!uid) return
    try { if (localStorage.getItem(KEY(uid)) === 'pending') setOpen(true) } catch { /* ignore */ }
  }, [uid])
  useEffect(() => {
    const on = () => { setStep(0); setOpen(true) }
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    if (uid) { try { localStorage.removeItem(KEY(uid)) } catch { /* ignore */ } }
  }, [uid])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  const Icon = icons[Math.min(step, icons.length - 1)]
  const last = step >= icons.length - 1

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-5 backdrop-blur-sm"
          style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          role="dialog" aria-modal="true" aria-label={t('tour.title')}
        >
          <div className="glass relative w-full max-w-sm rounded-card p-6 shadow-card">
            <button type="button" className="btn-icon absolute right-2 top-2" onClick={close} aria-label={t('tour.skip')}><X size={20} aria-hidden /></button>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="flex flex-col items-center gap-3 pt-4 text-center">
                <div className="grid h-20 w-20 place-items-center rounded-3xl bg-brand-soft text-brand shadow-glow"><Icon size={40} aria-hidden /></div>
                <h2 className="font-display text-xl font-semibold leading-snug">{t(`tour.${kind}.${step + 1}.t`)}</h2>
                <p className="text-[15px] leading-relaxed text-ink/75">{t(`tour.${kind}.${step + 1}.b`)}</p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-5 flex items-center justify-center gap-1.5" aria-hidden>
              {icons.map((_, i) => <span key={i} className={`h-2 rounded-full transition-all duration-base ${i === step ? 'w-6 bg-brand' : 'w-2 bg-ink/20'}`} />)}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {step > 0 ? <button type="button" className="btn-soft" onClick={() => setStep((s) => s - 1)}>{t('tour.back')}</button> : <button type="button" className="btn-soft" onClick={close}>{t('tour.skip')}</button>}
              <button type="button" className="btn-primary" onClick={() => (last ? close() : setStep((s) => s + 1))}>{last ? t('tour.done') : t('tour.next')}</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
