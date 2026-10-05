import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellOff, CheckCheck, Trash2, X } from 'lucide-react'
import { useNotifications } from '../data/Notifications'
import { ago, noticeLink } from '../lib/notices'
import { useOnline } from '../hooks/useOnline'
import { useI18n } from '../i18n'
import Sheet from './Sheet'

export default function NotificationBell() {
  const { items, unread, toast, dismissToast, markRead, markAllRead, remove, clearAll } = useNotifications()
  const { t } = useI18n()
  const online = useOnline()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  function openNotice(id: string, to: string) {
    void markRead(id)
    setOpen(false)
    dismissToast()
    navigate(to)
  }

  return (
    <>
      <button
        aria-label={unread ? t('bell.titleUnread', { n: unread }) : t('bell.title')}
        onClick={() => setOpen(true)}
        className="btn-icon relative"
      >
        <Bell size={20} aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-[20px] min-w-[20px] place-items-center rounded-full bg-warn px-1 text-[11px] font-bold text-on-brand ring-2 ring-paper">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">{t('bell.title')}</h2>
            <button aria-label={t('form.close')} onClick={() => setOpen(false)} className="btn-icon">
              <X size={20} aria-hidden />
            </button>
          </div>

          {items.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 py-10 text-center text-ink/60">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
                <BellOff size={28} aria-hidden />
              </div>
              {t('bell.empty')}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-soft min-h-[44px] px-3 text-sm" disabled={unread === 0 || !online} onClick={() => void markAllRead()}>
                  <CheckCheck size={18} aria-hidden /> {t('bell.readAll')}
                </button>
                <button className="btn-danger min-h-[44px] px-3 text-sm" disabled={!online} onClick={() => void clearAll()}>
                  <Trash2 size={18} aria-hidden /> {t('bell.clear')}
                </button>
              </div>
              <ul className="flex flex-col gap-2">
                {items.map((n) => (
                  <li key={n.id} className={`flex items-start gap-1 rounded-card border p-3 shadow-card ${n.read_at ? 'border-ink/10 bg-surface/70' : 'border-brand/30 bg-brand-soft'}`}>
                    <button className="flex-1 text-left" onClick={() => openNotice(n.id, noticeLink(n))}>
                      <div className="flex items-start gap-2">
                        {!n.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                        <div className="min-w-0">
                          <div className="font-semibold leading-snug">{n.title}</div>
                          {n.body && <div className="mt-0.5 text-sm text-ink/70">{n.body}</div>}
                          <div className="mt-1 text-xs text-ink/50">{ago(n.created_at, Date.now(), t)}</div>
                        </div>
                      </div>
                    </button>
                    <button
                      aria-label={t('bell.delete')}
                      disabled={!online}
                      onClick={() => void remove(n.id)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink/40 disabled:opacity-40"
                    >
                      <X size={18} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Sheet>

      <AnimatePresence>
        {toast && !open && (
          <motion.button
            key={toast.id}
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            onClick={() => openNotice(toast.id, noticeLink(toast))}
            className="glass fixed inset-x-4 z-40 mx-auto max-w-md rounded-card border-brand/40 p-4 text-left shadow-glow"
            style={{ top: 'calc(0.75rem + env(safe-area-inset-top))' }}
          >
            <div className="font-semibold leading-snug">{toast.title}</div>
            {toast.body && <div className="mt-0.5 text-sm text-ink/70">{toast.body}</div>}
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}
