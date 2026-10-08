import { useState, type FormEvent } from 'react'
import { KeyRound, Loader2, LogOut, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { humanError } from '../lib/errors'
import { assertOkReply, formatCodeInput } from '../lib/invite'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'
import { markTourPending } from '../components/WelcomeTour'

export default function Onboarding() {
  const { t } = useI18n()
  const { profile, session, refresh, signOut } = useAuth()
  const [familyName, setFamilyName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<null | 'create' | 'join'>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(kind: 'create' | 'join', e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(kind)
    setError(null)
    try {
      if (kind === 'create') {
        const { error } = await supabase.rpc('create_family', { p_name: familyName.trim() })
        if (error) throw error
      } else {
        const { data, error } = await supabase.rpc('join_with_code', { p_code: code })
        if (error) throw error
        assertOkReply(data)
      }
      if (session) markTourPending(session.user.id) // новый участник семьи увидит приветственный тур
      await refresh()
    } catch (err) {
      setError(humanError(err, t))
    }
    setBusy(null)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-5 p-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">{t('onb.hello', { name: profile?.display_name ?? '' })}</h1>
        <p className="mt-2 text-ink/70">{t('onb.sub')}</p>
      </div>

      <form onSubmit={(e) => run('create', e)} className="card flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-brand" aria-hidden />
          <h2 className="text-lg font-semibold">{t('onb.createTitle')}</h2>
        </div>
        <input className="input" placeholder={t('onb.familyPh')} value={familyName} onChange={(e) => setFamilyName(e.target.value)} required maxLength={60} aria-label={t('onb.createTitle')} />
        <button className="btn-primary" disabled={busy !== null}>
          {busy === 'create' && <Loader2 size={18} className="animate-spin" aria-hidden />}
          {busy === 'create' ? t('onb.creating') : t('onb.create')}
        </button>
      </form>

      <form onSubmit={(e) => run('join', e)} className="card flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <KeyRound size={20} className="text-brand" aria-hidden />
          <h2 className="text-lg font-semibold">{t('onb.joinTitle')}</h2>
        </div>
        <input className="input uppercase tracking-widest" placeholder={t('onb.codePh')} value={code} onChange={(e) => setCode(formatCodeInput(e.target.value))} required autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-label={t('onb.joinTitle')} />
        <button className="btn-soft" disabled={busy !== null}>
          {busy === 'join' && <Loader2 size={18} className="animate-spin" aria-hidden />}
          {busy === 'join' ? t('onb.joining') : t('onb.join')}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
          {error}
        </p>
      )}
      <button onClick={signOut} className="btn-danger w-full">
        <LogOut size={18} aria-hidden /> {t('family.signOut')}
      </button>
    </div>
  )
}
