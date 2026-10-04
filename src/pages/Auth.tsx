import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { humanError } from '../lib/errors'

export default function Auth() {
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() } },
        })
        if (error) throw error
        if (!data.session) setInfo('Мы отправили письмо. Подтвердите почту и войдите.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      }
    } catch (err) {
      setError(humanError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 p-6">
      <motion.div
        initial={{ scale: 0.7, rotate: -10, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 15 }}
        className="grid h-20 w-20 place-items-center rounded-[26px] bg-star-soft text-4xl shadow-card"
      >
        ⭐
      </motion.div>
      <div>
        <h1 className="font-display text-3xl font-semibold">Семейные задания</h1>
        <p className="mt-2 text-ink/70">Задания, баллы и награды для всей семьи.</p>
      </div>

      <div className="grid grid-cols-2 rounded-2xl bg-ink/5 p-1">
        {(['register', 'login'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setError(null)
              setInfo(null)
            }}
            className={`min-h-[44px] rounded-xl text-sm font-semibold transition ${
              mode === m ? 'bg-white shadow-card' : 'text-ink/60'
            }`}
          >
            {m === 'register' ? 'Регистрация' : 'Вход'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === 'register' && (
          <input className="input" placeholder="Ваше имя" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} autoComplete="name" />
        )}
        <input className="input" type="email" placeholder="Почта" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <input
          className="input"
          type="password"
          placeholder="Пароль (от 6 символов)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        />
        {error && <p className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{error}</p>}
        {info && <p className="rounded-2xl bg-ok-soft p-3 text-sm text-ok">{info}</p>}
        <button className="btn-primary mt-1" disabled={busy}>
          {busy ? 'Подождите…' : mode === 'register' ? 'Создать аккаунт' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
