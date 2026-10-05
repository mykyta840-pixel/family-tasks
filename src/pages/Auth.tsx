import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, ListChecks } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { errorDetail, humanError } from '../lib/errors'
import { useI18n, LANGS, LOCALES } from '../i18n'
import ThemeSwitcher from '../theme/ThemeSwitcher'

export default function Auth() {
  const { t, lang, setLang } = useI18n()
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState('')
  const [info, setInfo] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setDetail('')
    setInfo(null)
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() } },
        })
        if (error) throw error
        if (!data.session) setInfo(t('auth.confirmMail'))
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      }
    } catch (err) {
      setError(humanError(err, t))
      setDetail(errorDetail(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-7 px-5 py-8">
      {/* язык и тема доступны ещё до входа */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-ctl border border-ink/10 bg-surface/60 p-1 backdrop-blur-md" role="radiogroup" aria-label="Language">
          {LANGS.map((l) => (
            <button
              key={l} role="radio" aria-checked={lang === l} onClick={() => setLang(l)}
              title={LOCALES[l].name}
              className={`min-h-[40px] min-w-[44px] rounded-[10px] px-2 text-sm font-semibold uppercase transition duration-fast ${
                lang === l ? 'bg-brand text-on-brand' : 'text-ink/60'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <ThemeSwitcher />
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-on-brand shadow-glow">
          <ListChecks size={28} strokeWidth={2.25} />
        </div>
        <h1 className="mt-5 font-display text-[28px] font-semibold leading-tight">{t('app.name')}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink/70">{t('auth.hero')}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}
        className="glass rounded-card p-5"
      >
        <div className="grid grid-cols-2 rounded-ctl bg-ink/5 p-1">
          {(['register', 'login'] as const).map((m) => (
            <button
              key={m} type="button"
              onClick={() => { setMode(m); setError(null); setDetail(''); setInfo(null) }}
              className={`min-h-[44px] rounded-[10px] text-sm font-semibold transition duration-fast ${
                mode === m ? 'bg-surface text-ink shadow-card' : 'text-ink/60'}`}
            >
              {t(m === 'register' ? 'auth.register' : 'auth.login')}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          {mode === 'register' && (
            <input className="input" placeholder={t('auth.name')} value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} autoComplete="name" />
          )}
          <input className="input" type="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <div className="relative">
            <input
              className="input pr-12" type={showPw ? 'text' : 'password'} placeholder={t('auth.password')}
              value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
            <button
              type="button" onClick={() => setShowPw((v) => !v)}
              aria-label={t(showPw ? 'auth.hidePw' : 'auth.showPw')}
              className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-ink/50"
            >
              {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {error && (
            <div role="alert" className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
              <p>{error}</p>
              {detail && <p className="mt-1 break-words text-xs opacity-70">{t('auth.reason', { msg: detail })}</p>}
            </div>
          )}
          {info && <p role="status" className="rounded-ctl border border-ok/30 bg-ok-soft p-3 text-sm text-ok">{info}</p>}
          <button className="btn-primary mt-1" disabled={busy}>
            {busy && <Loader2 size={18} className="animate-spin" />}
            {busy ? t('auth.wait') : t(mode === 'register' ? 'auth.create' : 'auth.signin')}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
