import { useRef, useState } from 'react'
import { Gift, Loader2, X } from 'lucide-react'
import { callRpc } from '../lib/actions'
import { humanError } from '../lib/errors'
import { useOnline } from '../hooks/useOnline'
import { useI18n } from '../i18n'

// «Выдать» списывает баллы (в базе, один раз). «Отказать» баллы не трогает.
export default function RedemptionActions({ id, onDone }: { id: string; onDone: () => void }) {
  const { t } = useI18n()
  const online = useOnline()
  const lock = useRef(false)
  const [busy, setBusy] = useState<null | 'ok' | 'no'>(null)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function run(kind: 'ok' | 'no') {
    if (lock.current) return
    lock.current = true
    setBusy(kind)
    setError(null)
    try {
      if (kind === 'ok') await callRpc('approve_redemption', { p_id: id })
      else await callRpc('reject_redemption', { p_id: id, p_reason: reason.trim() || null })
      setRejecting(false)
    } catch (e) {
      setError(humanError(e, t))
    } finally {
      lock.current = false
      setBusy(null)
      onDone()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {rejecting ? (
        <>
          <input className="input" placeholder={t('red.reasonPh')} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-soft px-3" onClick={() => setRejecting(false)} disabled={busy !== null}>
              {t('common.cancel')}
            </button>
            <button className="btn-danger px-3" onClick={() => run('no')} disabled={busy !== null || !online}>
              {busy === 'no' ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <X size={18} aria-hidden />}
              {busy === 'no' ? t('red.denying') : t('red.deny')}
            </button>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-danger px-3" onClick={() => setRejecting(true)} disabled={busy !== null}>
            <X size={18} aria-hidden /> {t('red.deny')}
          </button>
          <button className="btn-primary px-3" onClick={() => run('ok')} disabled={busy !== null || !online}>
            {busy === 'ok' ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Gift size={18} aria-hidden />}
            {busy === 'ok' ? t('red.giving') : t('red.give')}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
          {error}
        </p>
      )}
    </div>
  )
}
