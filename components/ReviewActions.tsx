import { useRef, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { callRpc } from '../lib/actions'
import { humanError } from '../lib/errors'
import { useOnline } from '../hooks/useOnline'
import { useI18n } from '../i18n'

// Кнопки «Подтвердить» и «Отклонить». Двойное нажатие блокируется и здесь, и в базе.
export default function ReviewActions({ taskId, onDone }: { taskId: string; onDone: () => void }) {
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
      if (kind === 'ok') await callRpc('approve_submission', { p_task_id: taskId })
      else await callRpc('reject_submission', { p_task_id: taskId, p_reason: reason.trim() || null })
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
          <textarea
            className="input min-h-[96px] py-3"
            placeholder={t('review.reasonPh')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-soft px-3" onClick={() => setRejecting(false)} disabled={busy !== null}>
              {t('common.cancel')}
            </button>
            <button className="btn-danger px-3" onClick={() => run('no')} disabled={busy !== null || !online}>
              {busy === 'no' ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <X size={18} aria-hidden />}
              {busy === 'no' ? t('review.rejecting') : t('review.reject')}
            </button>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-danger px-3" onClick={() => setRejecting(true)} disabled={busy !== null}>
            <X size={18} aria-hidden /> {t('review.reject')}
          </button>
          <button className="btn-primary px-3" onClick={() => run('ok')} disabled={busy !== null || !online}>
            {busy === 'ok' ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Check size={18} aria-hidden />}
            {busy === 'ok' ? t('review.approving') : t('review.approve')}
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
