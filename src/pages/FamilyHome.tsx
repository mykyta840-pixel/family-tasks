import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Baby, Check, Loader2, LogOut, Share2, ShieldCheck, Star, UserPlus, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { humanError } from '../lib/errors'
import { useAuth } from '../auth/AuthProvider'
import { useFamilyData } from '../data/FamilyData'
import { LANGS, LOCALES, useI18n, type Lang } from '../i18n'
import { callRpc } from '../lib/actions'
import Avatar from '../components/Avatar'
import type { Role } from '../lib/types'

interface Member {
  user_id: string
  role: Role
  profiles: { display_name: string; avatar_url: string | null; language: string | null } | null
}

// Экран «Семья»: участники (с баллами и заданиями детей) и коды приглашения
export default function FamilyHome() {
  const { t } = useI18n()
  const { family, role, signOut } = useAuth()
  const { tasks, children: kids } = useFamilyData()
  const [members, setMembers] = useState<Member[]>([])
  const [loaded, setLoaded] = useState(false)
  const [invite, setInvite] = useState<{ role: Role; code: string } | null>(null)
  const [busy, setBusy] = useState<Role | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const familyId = family?.id

  const load = useCallback(async () => {
    if (!familyId) return
    const { data } = await supabase
      .from('family_members')
      .select('user_id, role, profiles(display_name, avatar_url, language)')
      .eq('family_id', familyId)
      .order('joined_at')
    if (data) setMembers(data as unknown as Member[])
    setLoaded(true)
  }, [familyId])

  // Список участников обновляется сам, когда кто-то присоединяется (realtime)
  useEffect(() => {
    void load()
    if (!familyId) return
    const channel = supabase
      .channel(`members-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_members', filter: `family_id=eq.${familyId}` }, () => void load())
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [familyId, load])

  // Сначала родители, потом дети (порядок внутри групп сохраняется)
  const sorted = useMemo(() => [...members].sort((a, b) => Number(b.role === 'parent') - Number(a.role === 'parent')), [members])
  const balanceOf = (id: string) => kids.find((c) => c.id === id)?.balance ?? 0
  const activeOf = (id: string) => tasks.filter((x) => x.assigned_to === id && (x.status === 'todo' || x.status === 'rejected')).length
  const reviewOf = (id: string) => tasks.filter((x) => x.assigned_to === id && x.status === 'submitted').length

  async function createInvite(r: Role) {
    if (busy) return
    setBusy(r)
    setError(null)
    setCopied(false)
    const { data, error } = await supabase.rpc('create_invite', { p_role: r })
    if (error) setError(humanError(error, t))
    else setInvite({ role: r, code: data as string })
    setBusy(null)
  }

  async function setChildLang(userId: string, l: Lang) {
    setError(null)
    try {
      await callRpc('set_member_language', { p_user: userId, p_lang: l })
      await load()
    } catch (e) {
      setError(humanError(e, t))
    }
  }

  async function share() {
    if (!invite || !family) return
    const text = t('family.shareText', { name: family.name, code: invite.code })
    try {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
      }
    } catch {
      /* пользователь закрыл окно «Поделиться» */
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-brand/25 bg-brand-soft text-brand">
          <Users size={24} aria-hidden />
        </div>
        <h1 className="min-w-0 break-words font-display text-2xl font-semibold leading-tight">{family?.name}</h1>
      </div>

      <section className="flex flex-col gap-3" aria-label={t('family.members')}>
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-ink/60">{t('family.members')}</h2>
        {!loaded ? (
          [0, 1].map((i) => <div key={i} className="skeleton h-20" />)
        ) : (
          sorted.map((m, i) => {
            const name = m.profiles?.display_name ?? '?'
            const isParent = m.role === 'parent'
            return (
              <motion.div
                key={m.user_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(i, 5) * 0.04 }}
                className="card flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={name} url={m.profiles?.avatar_url} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{name}</div>
                    <span
                      className={`mt-1 inline-flex min-h-[26px] items-center gap-1 rounded-full px-2.5 text-xs font-semibold ${
                        isParent ? 'bg-brand-soft text-brand' : 'bg-star-soft text-star'
                      }`}
                    >
                      {isParent ? <ShieldCheck size={14} aria-hidden /> : <Baby size={14} aria-hidden />}
                      {t(isParent ? 'family.role.parent' : 'family.role.child')}
                    </span>
                  </div>
                  {!isParent && (
                    <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-star-soft px-3 py-1 font-display font-semibold text-star">
                      <Star size={14} fill="currentColor" aria-hidden /> {balanceOf(m.user_id)}
                    </div>
                  )}
                </div>
                {!isParent && (
                  <div className="flex items-center justify-between border-t border-ink/10 pt-3 text-sm text-ink/60">
                    <span>{t('family.active', { n: activeOf(m.user_id) })}</span>
                    <span>{t('family.review', { n: reviewOf(m.user_id) })}</span>
                  </div>
                )}
                {!isParent && role === 'parent' && (
                  <div className="flex flex-col gap-2 border-t border-ink/10 pt-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink/60">{t('family.childLang')}</span>
                    <div role="radiogroup" aria-label={t('family.childLang')} className="grid grid-cols-4 gap-1.5">
                      {LANGS.map((l) => (
                        <button
                          key={l}
                          type="button"
                          role="radio"
                          aria-checked={m.profiles?.language === l}
                          aria-label={LOCALES[l].name}
                          title={LOCALES[l].name}
                          onClick={() => void setChildLang(m.user_id, l)}
                          className={`flex min-h-[44px] items-center justify-center gap-1 rounded-ctl border text-sm font-semibold uppercase transition duration-fast active:scale-95 ${
                            m.profiles?.language === l ? 'border-brand bg-brand-soft text-brand' : 'border-ink/10 bg-surface/70 text-ink/70'
                          }`}
                        >
                          <span aria-hidden>{LOCALES[l].flag}</span>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })
        )}
        {loaded && role === 'parent' && !sorted.some((m) => m.role === 'child') && (
          <p className="glass rounded-card p-4 text-center text-sm text-ink/60">{t('family.noKids')}</p>
        )}
      </section>

      {role === 'parent' && (
        <section className="card flex flex-col gap-3" aria-label={t('family.invite')}>
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-brand" aria-hidden />
            <h2 className="text-lg font-semibold">{t('family.invite')}</h2>
          </div>
          <p className="text-sm text-ink/60">{t('family.inviteHint')}</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-soft px-3" disabled={busy !== null} onClick={() => createInvite('parent')}>
              {busy === 'parent' ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <ShieldCheck size={18} aria-hidden />}
              {t('family.inviteParent')}
            </button>
            <button className="btn-soft px-3" disabled={busy !== null} onClick={() => createInvite('child')}>
              {busy === 'child' ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Baby size={18} aria-hidden />}
              {t('family.inviteChild')}
            </button>
          </div>
          {invite && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-2 rounded-card border border-brand/30 bg-brand-soft p-4 text-center shadow-glow"
            >
              <p className="text-sm text-ink/70">{t(invite.role === 'parent' ? 'family.codeFor.parent' : 'family.codeFor.child')}</p>
              <p className="select-all break-all font-display text-2xl font-semibold tracking-widest">{invite.code}</p>
              <button className="btn-primary mt-1 w-full" onClick={share}>
                {copied ? <Check size={18} aria-hidden /> : <Share2 size={18} aria-hidden />}
                {copied ? t('family.copied') : t('family.share')}
              </button>
            </motion.div>
          )}
          {error && (
            <p role="alert" className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
              {error}
            </p>
          )}
        </section>
      )}

      <button onClick={signOut} className="btn-danger w-full">
        <LogOut size={18} aria-hidden /> {t('family.signOut')}
      </button>
    </div>
  )
}
