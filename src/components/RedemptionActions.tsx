import { useRef, useState } from 'react'
import { callRpc } from '../lib/actions'
import { humanError } from '../lib/errors'
import { useOnline } from '../hooks/useOnline'

// «Выдать» списывает баллы (в базе, один раз). «Отказать» баллы не трогает.
export default function RedemptionActions({ id, onDone }: { id: string; onDone: () => void }) {
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
      setError(humanError(e))
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
          <input className="input" placeholder="Причина (необязательно)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-soft px-3" onClick={() => setRejecting(false)} disabled={busy !== null}>
              Отмена
            </button>
            <button className="btn-danger px-3" onClick={() => run('no')} disabled={busy !== null || !online}>
              {busy === 'no' ? 'Отправляем…' : 'Отказать'}
            </button>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-danger px-3" onClick={() => setRejecting(true)} disabled={busy !== null}>
            Отказать
          </button>
          <button className="btn-primary px-3" onClick={() => run('ok')} disabled={busy !== null || !online}>
            {busy === 'ok' ? 'Выдаём…' : '🎁 Выдать'}
          </button>
        </div>
      )}
      {error && <p className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{error}</p>}
    </div>
  )
}
