import { useEffect, useRef, useState } from 'react'
import { BellRing, Check, Loader2, Send, Smartphone } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { useOnline } from '../hooks/useOnline'
import { humanError } from '../lib/errors'
import { disablePush, enablePush, getPushState, pushConfigured, sendTestPush, type PushState } from '../lib/push'

// Карточка «Push-уведомления» в профиле
export default function PushSettings() {
  const { t } = useI18n()
  const { session } = useAuth()
  const online = useOnline()
  const uid = session?.user.id ?? ''
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState<'on' | 'off' | 'test' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const lock = useRef(false)

  useEffect(() => {
    if (!uid) return
    let alive = true
    void getPushState(uid).then((s) => alive && setState(s)).catch(() => alive && setState('unsupported'))
    return () => { alive = false }
  }, [uid])

  if (!pushConfigured) return null

  async function run(kind: 'on' | 'off' | 'test', job: () => Promise<string | void>) {
    if (lock.current) return
    lock.current = true
    setBusy(kind)
    setMsg(null)
    try {
      const text = await job()
      if (text) setMsg({ ok: true, text })
    } catch (e) {
      const m = e instanceof Error ? e.message : ''
      setMsg({ ok: false, text: m === 'push_denied' ? t('push.denied') : m.startsWith('push_') ? t('push.failed') : humanError(e, t) })
    } finally {
      lock.current = false
      setBusy(null)
      if (uid) setState(await getPushState(uid).catch(() => 'unsupported' as PushState))
    }
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <BellRing size={20} className="text-brand" aria-hidden />
        <h2 className="text-lg font-semibold">{t('push.title')}</h2>
      </div>

      {state === null && <div className="skeleton h-12" />}

      {state === 'unsupported' && <p className="text-sm text-ink/60">{t('push.unsupported')}</p>}

      {state === 'ios-install' && (
        <p className="flex gap-2 text-sm text-ink/70">
          <Smartphone size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden />
          <span>{t('push.iosInstall')}</span>
        </p>
      )}

      {state === 'denied' && <p className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">{t('push.denied')}</p>}

      {state === 'off' && (
        <>
          <p className="text-sm text-ink/60">{t('push.desc')}</p>
          <button className="btn-primary w-full" disabled={busy !== null || !online} onClick={() => run('on', () => enablePush(uid))}>
            {busy === 'on' ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <BellRing size={18} aria-hidden />}
            {busy === 'on' ? t('push.enabling') : t('push.enable')}
          </button>
        </>
      )}

      {state === 'on' && (
        <>
          <p className="flex items-center gap-2 text-sm font-medium text-ok">
            <Check size={18} aria-hidden /> {t('push.on')}
          </p>
          <div className="grid grid-cols-1 gap-2">
            <button
              className="btn-soft"
              disabled={busy !== null || !online}
              onClick={() => run('test', async () => ((await sendTestPush()) > 0 ? t('push.testSent') : t('push.testNone')))}
            >
              {busy === 'test' ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Send size={18} aria-hidden />} {t('push.test')}
            </button>
            <button className="btn-danger" disabled={busy !== null || !online} onClick={() => run('off', () => disablePush(uid))}>
              {t('push.disable')}
            </button>
          </div>
        </>
      )}

      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`rounded-ctl border p-3 text-sm ${msg.ok ? 'border-ok/30 bg-ok-soft text-ok' : 'border-warn/30 bg-warn-soft text-warn'}`}>
          {msg.text}
        </p>
      )}
    </div>
  )
}
