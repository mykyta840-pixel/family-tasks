import { useEffect, useState } from 'react'
import { BellRing, Loader2, X } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { useOnline } from '../hooks/useOnline'
import { enablePush, getPushState, pushConfigured } from '../lib/push'

const KEY = 'ft.push.dismissed'
const dismissed = () => {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

// Мягкое предложение включить уведомления (один раз; можно закрыть)
export default function PushPrompt() {
  const { t } = useI18n()
  const { session } = useAuth()
  const online = useOnline()
  const uid = session?.user.id ?? ''
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!pushConfigured || !uid || dismissed()) return
    let alive = true
    void getPushState(uid)
      .then((s) => alive && setShow(s === 'off' && Notification.permission === 'default'))
      .catch(() => undefined)
    return () => { alive = false }
  }, [uid])

  if (!show) return null

  const close = () => {
    try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
    setShow(false)
  }

  async function enable() {
    setBusy(true)
    try {
      await enablePush(uid)
      setShow(false)
    } catch {
      close() // отказ или сбой: больше не навязываем, включить можно в профиле
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="glass mb-4 flex items-start gap-3 rounded-card p-4" role="region" aria-label={t('push.bannerTitle')}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
        <BellRing size={20} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t('push.bannerTitle')}</p>
        <p className="mt-0.5 text-sm text-ink/60">{t('push.bannerText')}</p>
        <button className="btn-primary mt-3 !min-h-[44px] w-full text-sm" disabled={busy || !online} onClick={enable}>
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden />} {t('push.enable')}
        </button>
      </div>
      <button className="btn-icon !h-9 !w-9 shrink-0" onClick={close} aria-label={t('push.later')}>
        <X size={16} aria-hidden />
      </button>
    </div>
  )
}
