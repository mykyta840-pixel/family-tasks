import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { humanError } from '../lib/errors'
import { useAuth } from '../auth/AuthProvider'

export default function Onboarding() {
  const { profile, refresh, signOut } = useAuth()
  const [familyName, setFamilyName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<null | 'create' | 'join'>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(kind: 'create' | 'join', e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(kind)
    setError(null)
    const { error } =
      kind === 'create'
        ? await supabase.rpc('create_family', { p_name: familyName.trim() })
        : await supabase.rpc('join_family', { p_code: code })
    if (error) setError(humanError(error))
    else await refresh()
    setBusy(null)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-5 p-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Привет, {profile?.display_name ?? ''}! 👋</h1>
        <p className="mt-2 text-ink/70">Осталось выбрать семью.</p>
      </div>

      <form onSubmit={(e) => run('create', e)} className="card flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Я родитель: создать семью</h2>
        <input className="input" placeholder="Например, Семья Ивановых" value={familyName} onChange={(e) => setFamilyName(e.target.value)} required maxLength={60} />
        <button className="btn-primary" disabled={busy !== null}>
          {busy === 'create' ? 'Создаём…' : 'Создать семью'}
        </button>
      </form>

      <form onSubmit={(e) => run('join', e)} className="card flex flex-col gap-3">
        <h2 className="text-lg font-semibold">У меня есть код приглашения</h2>
        <input className="input uppercase tracking-widest" placeholder="Код от родителя" value={code} onChange={(e) => setCode(e.target.value)} required autoCapitalize="characters" />
        <button className="btn-soft" disabled={busy !== null}>
          {busy === 'join' ? 'Проверяем…' : 'Присоединиться'}
        </button>
      </form>

      {error && <p className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{error}</p>}
      <button onClick={signOut} className="text-sm text-ink/50 underline">
        Выйти из аккаунта
      </button>
    </div>
  )
}
