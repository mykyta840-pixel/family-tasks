import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Baby, Eye, EyeOff, KeyRound, Loader2, ListChecks, RotateCcw, ShieldCheck, Users } from 'lucide-react'
import { supabase, urlAuth } from '../lib/supabase'
import { errorDetail, errorKey, humanError } from '../lib/errors'
import { assertOkReply, formatCodeInput, looksLikeCode, parseCheckReply, type CheckResult } from '../lib/invite'
import { useAuth } from '../auth/AuthProvider'
import { useI18n, LANGS, LOCALES } from '../i18n'
import ThemeSwitcher from '../theme/ThemeSwitcher'
import { markTourPending } from '../components/WelcomeTour'

// Шаги экрана входа:
//  start   — «У вас есть код приглашения?» (первый экран)
//  code    — ввод кода; дальше по ответу базы: child / parent / return
//  child   — ребёнок: только имя, без пароля (анонимный вход)
//  parent  — второй родитель: имя + почта + пароль
//  return  — код возврата: ребёнок возвращается в свой профиль на новом устройстве
//  create  — новая семья (первый родитель): имя + почта + пароль, семью создаёт следующий экран
//  login / forgot — как раньше
type Mode = 'start' | 'code' | 'child' | 'parent' | 'return' | 'create' | 'login' | 'forgot'
const CODE_MODES: Mode[] = ['code', 'child', 'parent', 'return']

export default function Auth() {
  const { t, lang, setLang } = useI18n()
  const { session, isAnonymous, setJoining, refresh } = useAuth()
  // Ссылка из письма не сработала (устарела): сразу открываем «Восстановление пароля», чтобы запросить новую
  const [mode, setMode] = useState<Mode>(urlAuth.error ? 'forgot' : 'start')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [found, setFound] = useState<CheckResult | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(urlAuth.error ? t(urlAuth.error === 'expired' ? 'err.linkExpired' : 'err.unknown') : null)
  const [detail, setDetail] = useState('')
  const [info, setInfo] = useState<string | null>(null)

  // Уже вошёл обычным аккаунтом (почта + пароль), но ещё не в семье: при коде родителя регистрироваться заново не нужно
  const hasAccount = Boolean(session) && !isAnonymous

  // Повторно просить письмо можно не раньше, чем через минуту (у Supabase есть лимит на письма)
  const [cool, setCool] = useState(0)
  useEffect(() => {
    if (cool <= 0) return
    const id = window.setTimeout(() => setCool((c) => c - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cool])

  // Экран закрылся: «идёт вход по коду» больше не держим
  useEffect(() => () => setJoining(false), [setJoining])

  function go(m: Mode) {
    setMode(m)
    setError(null)
    setDetail('')
    setInfo(null)
  }

  // Выйти из шагов с кодом. Анонимный вход, созданный ради проверки кода, не нужен — закрываем его,
  // чтобы не оставлять «пустой» аккаунт без семьи.
  async function leaveCodeFlow(to: Mode) {
    setJoining(false)
    setFound(null)
    setCode('')
    if (isAnonymous) await supabase.auth.signOut().catch(() => undefined)
    go(to)
  }

  async function checkCode() {
    setJoining(true) // дальше сессия поменяется, экран входа должен пережить это
    if (!session) {
      const { error } = await supabase.auth.signInAnonymously()
      if (error) throw error
    }
    const { data, error } = await supabase.rpc('check_invite', { p_code: code })
    if (error) throw error
    const res = parseCheckReply(data)
    setFound(res)
    go(res.kind === 'return' ? 'return' : res.role === 'child' ? 'child' : 'parent')
  }

  async function finishJoin(uid: string | null, tour: boolean) {
    if (tour && uid) markTourPending(uid) // новый участник семьи увидит приветственный тур
    await refresh(uid ?? undefined)
    setJoining(false)
  }

  async function joinChild() {
    const { data, error } = await supabase.rpc('join_with_code', { p_code: code, p_name: name.trim() })
    if (error) throw error
    assertOkReply(data)
    await finishJoin(session?.user.id ?? null, true)
  }

  async function redeemReturn() {
    const { data, error } = await supabase.rpc('redeem_return_code', { p_code: code })
    if (error) throw error
    assertOkReply(data)
    await finishJoin(null, false) // тур этот ребёнок уже видел на прежнем устройстве
  }

  async function joinParent() {
    let uid = hasAccount ? session?.user.id ?? null : null
    if (!uid) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name.trim() } },
      })
      if (error) throw error
      if (!data.session) {
        // В проекте включено подтверждение почты: войти в семью получится после входа, через «У меня есть код»
        await supabase.auth.signOut().catch(() => undefined)
        setJoining(false)
        setInfo(t('auth.confirmMailCode'))
        return
      }
      uid = data.session.user.id
    }
    const { data, error } = await supabase.rpc('join_with_code', { p_code: code })
    if (error) throw error
    assertOkReply(data)
    await finishJoin(uid, true)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy || (mode === 'forgot' && cool > 0)) return
    setBusy(true)
    setError(null)
    setDetail('')
    setInfo(null)
    try {
      if (mode === 'forgot') {
        // Адрес возврата — главная страница сайта; она должна быть в списке Redirect URLs в Supabase
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/` })
        if (error) throw error
        // Ответ одинаковый для любой почты: так нельзя выяснить, кто зарегистрирован
        setInfo(t('auth.linkSent'))
        setCool(60)
      } else if (mode === 'create') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() } },
        })
        if (error) throw error
        if (!data.session) setInfo(t('auth.confirmMail'))
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else if (mode === 'code') {
        await checkCode()
      } else if (mode === 'child') {
        await joinChild()
      } else if (mode === 'return') {
        await redeemReturn()
      } else if (mode === 'parent') {
        await joinParent()
      }
    } catch (err) {
      setError(humanError(err, t))
      setDetail(errorDetail(err))
      // Код успели использовать или он истёк, пока вводили имя: возвращаем к вводу кода
      if ((mode === 'child' || mode === 'return' || mode === 'parent') && errorKey(err) === 'err.invalidCode') setMode('code')
    } finally {
      setBusy(false)
    }
  }

  const showTabs = mode === 'create' || mode === 'login'
  const needEmail = mode === 'create' || mode === 'login' || mode === 'forgot' || (mode === 'parent' && !hasAccount)
  const needPassword = mode === 'create' || mode === 'login' || (mode === 'parent' && !hasAccount)
  const needName = mode === 'create' || mode === 'child' || (mode === 'parent' && !hasAccount)

  const title: Record<string, [string, string]> = {
    forgot: [t('auth.forgotTitle'), t('auth.forgotHint')],
    code: [t('auth.codeTitle'), t('auth.codeHint')],
    child: [t('auth.childTitle'), t('auth.childHint', { family: found?.kind === 'invite' ? found.family : '' })],
    parent: [t('auth.parentTitle'), t(hasAccount ? 'auth.parentHintHave' : 'auth.parentHint', { family: found?.kind === 'invite' ? found.family : '' })],
    return: [t('auth.returnTitle'), t('auth.returnHint', { name: found?.kind === 'return' ? found.child : '' })],
  }

  const submitLabel = busy
    ? mode === 'code' ? t('auth.checking') : t('auth.wait')
    : mode === 'forgot'
      ? cool > 0 ? t('auth.resendIn', { n: cool }) : t('auth.sendLink')
      : mode === 'create' ? t('auth.create')
      : mode === 'login' ? t('auth.signin')
      : mode === 'code' ? t('auth.codeNext')
      : mode === 'child' ? t('auth.childJoin')
      : mode === 'return' ? t('auth.returnGo')
      : t(hasAccount ? 'onb.join' : 'auth.parentJoin')

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
        {mode === 'start' && (
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold">{t('auth.startTitle')}</h2>
            <button type="button" className="btn-primary h-auto justify-start gap-3 py-3 text-left" onClick={() => go('code')}>
              <KeyRound size={22} aria-hidden className="shrink-0" />
              <span className="flex flex-col gap-1">
                <span>{t('auth.haveCode')}</span>
                <span className="text-xs font-normal leading-snug opacity-80">{t('auth.haveCodeHint')}</span>
              </span>
            </button>
            <button type="button" className="btn-soft h-auto justify-start gap-3 py-3 text-left" onClick={() => go('create')}>
              <Users size={22} aria-hidden className="shrink-0" />
              <span className="flex flex-col gap-1">
                <span>{t('auth.newFamily')}</span>
                <span className="text-xs font-normal leading-snug opacity-80">{t('auth.newFamilyHint')}</span>
              </span>
            </button>
            <button type="button" onClick={() => go('login')} className="mt-1 self-center px-2 py-2 text-sm font-semibold text-brand">
              {t('auth.haveAccount')}
            </button>
          </div>
        )}

        {mode !== 'start' && !showTabs && (
          <div>
            <div className="flex items-center gap-2">
              {mode === 'child' && <Baby size={20} className="text-brand" aria-hidden />}
              {mode === 'parent' && <ShieldCheck size={20} className="text-brand" aria-hidden />}
              {mode === 'return' && <RotateCcw size={20} className="text-brand" aria-hidden />}
              {mode === 'code' && <KeyRound size={20} className="text-brand" aria-hidden />}
              <h2 className="font-display text-lg font-semibold">{title[mode][0]}</h2>
            </div>
            <p className="mt-1 text-sm text-ink/60">{title[mode][1]}</p>
          </div>
        )}

        {showTabs && (
          <div className="grid grid-cols-2 rounded-ctl bg-ink/5 p-1">
            {(['create', 'login'] as const).map((m) => (
              <button
                key={m} type="button"
                onClick={() => go(m)}
                className={`min-h-[44px] rounded-[10px] text-sm font-semibold transition duration-fast ${
                  mode === m ? 'bg-surface text-ink shadow-card' : 'text-ink/60'}`}
              >
                {t(m === 'create' ? 'auth.register' : 'auth.login')}
              </button>
            ))}
          </div>
        )}

        {mode !== 'start' && (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          {mode === 'code' && (
            <input
              className="input text-center font-display text-lg uppercase tracking-widest"
              placeholder={t('auth.codePh')} value={code}
              onChange={(e) => setCode(formatCodeInput(e.target.value))}
              required autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false}
              aria-label={t('auth.codeTitle')} autoFocus
            />
          )}
          {needName && (
            <input
              className="input" placeholder={t(mode === 'child' ? 'auth.childName' : 'auth.name')}
              value={name} onChange={(e) => setName(e.target.value)} required maxLength={40}
              autoComplete={mode === 'child' ? 'off' : 'name'} autoFocus={mode === 'child'}
            />
          )}
          {needEmail && (
            <input className="input" type="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          )}
          {needPassword && (
          <div className="relative">
            <input
              className="input pr-12" type={showPw ? 'text' : 'password'} placeholder={t('auth.password')}
              value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            <button
              type="button" onClick={() => setShowPw((v) => !v)}
              aria-label={t(showPw ? 'auth.hidePw' : 'auth.showPw')}
              className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-ink/50"
            >
              {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          )}
          {mode === 'login' && (
            <button type="button" onClick={() => go('forgot')} className="-mt-1 self-end px-1 py-2 text-sm font-semibold text-brand">
              {t('auth.forgot')}
            </button>
          )}
          {error && (
            <div role="alert" className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
              <p>{error}</p>
              {detail && <p className="mt-1 break-words text-xs opacity-70">{t('auth.reason', { msg: detail })}</p>}
            </div>
          )}
          {info && <p role="status" className="rounded-ctl border border-ok/30 bg-ok-soft p-3 text-sm text-ok">{info}</p>}
          <button className="btn-primary mt-1" disabled={busy || (mode === 'forgot' && cool > 0) || (mode === 'code' && !looksLikeCode(code))}>
            {busy && <Loader2 size={18} className="animate-spin" />}
            {submitLabel}
          </button>
          {mode === 'forgot' && (
            <button type="button" className="btn-soft" onClick={() => go('login')}>
              {t('auth.backToLogin')}
            </button>
          )}
          {CODE_MODES.includes(mode) && (
            <button type="button" className="btn-soft" disabled={busy} onClick={() => void leaveCodeFlow('start')}>
              {t('auth.back')}
            </button>
          )}
          {showTabs && (
            <button type="button" className="self-center px-2 py-2 text-sm font-semibold text-ink/60" onClick={() => go('start')}>
              {t('auth.back')}
            </button>
          )}
        </form>
        )}
      </motion.div>
    </div>
  )
}
