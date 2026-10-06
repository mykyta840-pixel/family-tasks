import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Baby, Camera, Check, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import Coin from './Coin'
import { useAuth } from '../auth/AuthProvider'
import { useFamilyData } from '../data/FamilyData'
import { LANGS, LOCALES, useI18n, type Lang } from '../i18n'
import { callRpc } from '../lib/actions'
import { humanError } from '../lib/errors'
import { removeChildAvatar, renameChild, uploadChildAvatar } from '../lib/avatar'
import { useOnline } from '../hooks/useOnline'
import type { Role } from '../lib/types'
import Avatar from './Avatar'
import AvatarCropper from './AvatarCropper'
import Sheet from './Sheet'

export interface MemberRow {
  user_id: string
  role: Role
  profiles: { display_name: string; avatar_url: string | null; language: string | null; bio: string | null } | null
}

const MAX_NAME = 40

// Профиль участника семьи. Что видно, зависит от роли того, кто смотрит:
// — любой видит имя, фото, роль и «О себе»;
// — свои баллы и задания видит сам человек и родители (у чужого ребёнка баллы ребёнку не показываются);
// — родитель может менять имя, фото и язык ЧУЖОГО ребёнка своей семьи;
// — ребёнок и «чужой» родитель только смотрят, админ-функций у них нет.
export default function MemberProfileSheet({ member, onClose, onChanged }: { member: MemberRow | null; onClose: () => void; onChanged: () => Promise<void> }) {
  return (
    <Sheet open={member !== null} onClose={onClose}>
      {member && <Body key={member.user_id} member={member} onClose={onClose} onChanged={onChanged} />}
    </Sheet>
  )
}

function Body({ member, onClose, onChanged }: { member: MemberRow; onClose: () => void; onChanged: () => Promise<void> }) {
  const { t } = useI18n()
  const nav = useNavigate()
  const { session, role: myRole } = useAuth()
  const { tasks, children: kids, reload } = useFamilyData()
  const online = useOnline()
  const fileRef = useRef<HTMLInputElement>(null)
  const lock = useRef(false)
  const [picked, setPicked] = useState<File | null>(null)

  const name = member.profiles?.display_name ?? '?'
  const avatar = member.profiles?.avatar_url ?? null
  const isParent = member.role === 'parent'
  const isSelf = member.user_id === session?.user.id
  const canSeeStats = !isParent && (myRole === 'parent' || isSelf)
  const canEdit = myRole === 'parent' && !isParent // родитель правит профиль ребёнка

  const [draft, setDraft] = useState(name)
  const [busy, setBusy] = useState<'photo' | 'save' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Имя поменяли на другом телефоне, а здесь поле не трогали: подхватываем новое
  useEffect(() => {
    setDraft((d) => (d === '' ? name : d))
  }, [name])

  const dirty = draft.trim() !== name
  const nameOk = draft.trim().length >= 1 && draft.trim().length <= MAX_NAME

  async function run(kind: 'photo' | 'save', job: () => Promise<void>): Promise<boolean> {
    if (lock.current) return false
    lock.current = true
    setBusy(kind)
    setError(null)
    setSaved(false)
    try {
      await job()
      await onChanged()
      await reload()
      return true
    } catch (e) {
      setError(humanError(e, t))
      return false
    } finally {
      lock.current = false
      setBusy(null)
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPicked(file) // сначала окно «подвинь фото», загрузка — после «Сохранить»
  }

  async function onCropped(blob: Blob) {
    setPicked(null)
    await run('photo', async () => {
      await uploadChildAvatar(member.user_id, blob)
    })
  }

  async function onSave() {
    if (!nameOk || !dirty) return
    const ok = await run('save', () => renameChild(member.user_id, draft.trim()))
    if (ok) setSaved(true)
  }

  async function onLang(l: Lang) {
    setError(null)
    try {
      await callRpc('set_member_language', { p_user: member.user_id, p_lang: l })
      await onChanged()
    } catch (e) {
      setError(humanError(e, t))
    }
  }

  const bio = member.profiles?.bio?.trim()
  const balance = kids.find((c) => c.id === member.user_id)?.balance ?? 0
  const active = tasks.filter((x) => x.assigned_to === member.user_id && (x.status === 'todo' || x.status === 'rejected')).length
  const review = tasks.filter((x) => x.assigned_to === member.user_id && x.status === 'submitted').length

  return (
    <div className="flex flex-col gap-4">
      <AvatarCropper file={picked} onCancel={() => setPicked(null)} onDone={(b) => void onCropped(b)} />
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="relative">
          <Avatar name={name} url={avatar} size={104} />
          {busy === 'photo' && (
            <div className="absolute inset-0 grid place-items-center rounded-full bg-surface/70">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
            </div>
          )}
        </div>
        <h2 className="max-w-full break-words font-display text-xl font-semibold">{name}</h2>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span
            className={`inline-flex min-h-[26px] items-center gap-1 rounded-full px-2.5 text-xs font-semibold ${
              isParent ? 'bg-brand-soft text-brand' : 'bg-star-soft text-star'
            }`}
          >
            {isParent ? <ShieldCheck size={14} aria-hidden /> : <Baby size={14} aria-hidden />}
            {t(isParent ? 'family.role.parent' : 'family.role.child')}
          </span>
          {isSelf && <span className="inline-flex min-h-[26px] items-center rounded-full bg-ok-soft px-2.5 text-xs font-semibold text-ok">{t('member.you')}</span>}
        </div>
      </div>

      <div className="rounded-card border border-ink/10 bg-surface/60 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink/60">{t('member.about')}</div>
        <p className={`mt-1 whitespace-pre-line break-words text-sm ${bio ? '' : 'text-ink/50'}`}>{bio || t('member.noBio')}</p>
      </div>

      {canSeeStats && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-card border border-star/25 bg-star-soft p-2">
            <div className="inline-flex items-center gap-1 font-display text-lg font-semibold text-star">
              <Coin size={14} /> {balance}
            </div>
          </div>
          <div className="rounded-card border border-ink/10 bg-surface/60 p-2 text-xs text-ink/70">{t('family.active', { n: active })}</div>
          <div className="rounded-card border border-ink/10 bg-surface/60 p-2 text-xs text-ink/70">{t('family.review', { n: review })}</div>
        </div>
      )}

      {canEdit && (
        <div className="flex flex-col gap-3 rounded-card border border-brand/20 bg-brand-soft/40 p-3">
          <h3 className="text-sm font-semibold">{t('member.editTitle')}</h3>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
          <div className="grid grid-cols-1 gap-2">
            <button className="btn-soft" disabled={busy !== null || !online} onClick={() => fileRef.current?.click()}>
              <Camera size={20} aria-hidden /> {avatar ? t('profile.changePhoto') : t('profile.uploadPhoto')}
            </button>
            {avatar && (
              <button className="btn-danger" disabled={busy !== null || !online} onClick={() => void run('photo', () => removeChildAvatar(member.user_id))}>
                <Trash2 size={20} aria-hidden /> {t('profile.removePhoto')}
              </button>
            )}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-ink/70">{t('profile.name')}</span>
            <input
              className="input"
              value={draft}
              maxLength={MAX_NAME}
              onChange={(e) => {
                setDraft(e.target.value)
                setSaved(false)
              }}
            />
          </label>
          <button className="btn-primary" disabled={!dirty || !nameOk || busy !== null || !online} onClick={onSave}>
            {saved && busy !== 'save' && <Check size={18} aria-hidden />}
            {busy === 'save' ? t('form.saving') : saved ? t('profile.saved') : t('form.save')}
          </button>

          <div className="flex flex-col gap-2 border-t border-ink/10 pt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/60">{t('family.childLang')}</span>
            <div role="radiogroup" aria-label={t('family.childLang')} className="grid grid-cols-4 gap-1.5">
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={member.profiles?.language === l}
                  aria-label={LOCALES[l].name}
                  title={LOCALES[l].name}
                  disabled={!online}
                  onClick={() => void onLang(l)}
                  className={`flex min-h-[44px] items-center justify-center gap-1 rounded-ctl border text-sm font-semibold uppercase transition duration-fast active:scale-95 ${
                    member.profiles?.language === l ? 'border-brand bg-brand-soft text-brand' : 'border-ink/10 bg-surface/70 text-ink/70'
                  }`}
                >
                  <span aria-hidden>{LOCALES[l].flag}</span>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-ink/50">{t('member.childHint')}</p>
          {error && (
            <p role="alert" className="rounded-ctl border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
              {error}
            </p>
          )}
        </div>
      )}

      {isSelf && (
        <button
          className="btn-primary w-full"
          onClick={() => {
            onClose()
            nav('/profile')
          }}
        >
          <UserRound size={18} aria-hidden /> {t('member.openMine')}
        </button>
      )}
      <button className="btn-soft w-full" onClick={onClose}>
        {t('member.close')}
      </button>
    </div>
  )
}
