import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Check, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { errorDetail, humanError } from '../lib/errors'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'

// Экран «Новый пароль»: человек пришёл по ссылке из письма (Supabase уже открыл ему временную сессию).
export default function ResetPassword() {
  const { t } = useI18n()
  const { finishRecovery, signOut } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    setDetail('')
    if (pw !== pw2) {
      setError(t('auth.pwMismatch'))
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error
      setDone(true)
    } catch (err) {
      setError(humanError(err, t))
      setDetail(errorDetail(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 px-5 py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-on-brand shadow-glow">
          {done ? <Check size={28} strokeWidth={2.25} /> : <KeyRound size={28} strokeWidth={2.25} />}
        </div>
        <h1 className="mt-5 font-display text-[28px] font-semibold leading-tight">{t('auth.newPwTitle')}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/70">{done ? t('auth.pwDone') : t('auth.newPwHint')}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }} className="glass rounded-card p-5">
        {done ? (
          <button className="btn-primary w-full" onClick={finishRecovery}>
            {t('auth.continue')}
          </button>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="relative">
              <input
                className="input pr-12" type={show ? 'text' : 'password'} placeholder={t('auth.newPw')}
                value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} autoComplete="new-password" autoFocus
              />
              <button
                type="button" onClick={() => setShow((v) => !v)} aria-label={t(show ? 'auth.hidePw' : 'auth.showPw')}
                className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-ink/50"
              >
                {show ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <input
              className="input" type={show ? 'text' : 'password'} placeholder={t('auth.newPw2')}
              value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={6} autoComplete="new-password"
            />
            {error && (
              <div role="alert" className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
                <p>{error}</p>
                {detail && <p className="mt-1 break-words text-xs opacity-70">{t('auth.reason', { msg: detail })}</p>}
              </div>
            )}
            <button className="btn-primary mt-1" disabled={busy}>
              {busy && <Loader2 size={18} className="animate-spin" />}
              {busy ? t('auth.wait') : t('auth.pwSave')}
            </button>
            <button type="button" className="btn-soft" disabled={busy} onClick={() => void signOut()}>
              {t('common.cancel')}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
