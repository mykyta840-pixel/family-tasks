import { useEffect, useRef, useState } from 'react'
import { BellRing, Check, Loader2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { useOnline } from '../hooks/useOnline'
import { supabase } from '../lib/supabase'
import { humanError } from '../lib/errors'

// Родитель: «Напомнить» ребёнку о задании (внутри приложения + push, если у ребёнка он включён)
export default function RemindButton({ taskId }: { taskId: string }) {
  const { t } = useI18n()
  const online = useOnline()
  const [st, setSt] = useState<'idle' | 'busy' | 'sent'>('idle')
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const lock = useRef(false)
  const timer = useRef<number>()

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function go() {
    if (lock.current) return
    lock.current = true
    setSt('busy')
    setNote(null)
    try {
      const { data, error } = await supabase.rpc('remind_task', { p_task_id: taskId })
      if (error) throw error
      setSt('sent')
      setNote({ ok: true, text: typeof data === 'number' && data > 0 ? t('remind.sent') : t('remind.noPush') })
      timer.current = window.setTimeout(() => {
        setSt('idle')
        setNote(null)
      }, 6000)
    } catch (e) {
      setSt('idle')
      setNote({ ok: false, text: humanError(e, t) })
    } finally {
      lock.current = false
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button className="btn-soft w-full !min-h-[44px] text-sm" disabled={st !== 'idle' || !online} onClick={go}>
        {st === 'busy' ? <Loader2 size={16} className="animate-spin" aria-hidden /> : st === 'sent' ? <Check size={16} aria-hidden /> : <BellRing size={16} aria-hidden />}
        {st === 'busy' ? t('remind.sending') : st === 'sent' ? t('remind.done') : t('remind.btn')}
      </button>
      {note && (
        <p role={note.ok ? 'status' : 'alert'} className={`rounded-ctl p-2.5 text-xs ${note.ok ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}>
          {note.text}
        </p>
      )}
    </div>
  )
}
