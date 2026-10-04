import { useEffect, useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useFamilyData } from '../data/FamilyData'
import { supabase } from '../lib/supabase'
import { humanError } from '../lib/errors'
import { removeAvatar, uploadAvatar } from '../lib/avatar'
import { useOnline } from '../hooks/useOnline'
import Avatar from '../components/Avatar'

const MAX_BIO = 200
const MAX_NAME = 40

export default function Profile() {
  const { profile, session, role, family, refresh, signOut } = useAuth()
  const { reload } = useFamilyData()
  const online = useOnline()
  const uid = session?.user.id ?? ''
  const fileRef = useRef<HTMLInputElement>(null)
  const lock = useRef(false)

  const [name, setName] = useState(profile?.display_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [busy, setBusy] = useState<'photo' | 'save' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Если профиль подгрузился позже или изменился на другом телефоне, а поля не редактировались
  useEffect(() => {
    setName((n) => (n === '' ? profile?.display_name ?? '' : n))
    setBio((b) => (b === '' ? profile?.bio ?? '' : b))
  }, [profile?.display_name, profile?.bio])

  const dirty = name.trim() !== (profile?.display_name ?? '') || bio.trim() !== (profile?.bio ?? '')
  const nameOk = name.trim().length >= 1 && name.trim().length <= MAX_NAME

  async function run(kind: 'photo' | 'save', job: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    setBusy(kind)
    setError(null)
    setSaved(false)
    try {
      await job()
      await refresh()
      await reload()
      return true
    } catch (e) {
      setError(e instanceof Error && e.message === 'bad_image' ? 'Не удалось прочитать фото. Выберите другое (JPG или PNG).' : humanError(e))
      return false
    } finally {
      lock.current = false
      setBusy(null)
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !uid) return
    await run('photo', async () => {
      await uploadAvatar(uid, file)
    })
  }

  async function onRemove() {
    if (!uid) return
    await run('photo', () => removeAvatar(uid))
  }

  async function onSave() {
    if (!uid || !nameOk || !dirty) return
    const ok = await run('save', async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: name.trim(), bio: bio.trim() === '' ? null : bio.trim() })
        .eq('id', uid)
      if (error) throw error
    })
    if (ok) setSaved(true)
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">Профиль</h1>

      <div className="card flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar name={profile?.display_name ?? '?'} url={profile?.avatar_url} size={112} />
          {busy === 'photo' && (
            <div className="absolute inset-0 grid place-items-center rounded-full bg-white/70">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
        <div className="grid w-full grid-cols-1 gap-2">
          <button className="btn-soft" disabled={busy !== null || !online} onClick={() => fileRef.current?.click()}>
            <Camera size={20} /> {profile?.avatar_url ? 'Сменить фото' : 'Загрузить фото'}
          </button>
          {profile?.avatar_url && (
            <button className="btn-danger" disabled={busy !== null || !online} onClick={onRemove}>
              <Trash2 size={20} /> Удалить фото
            </button>
          )}
        </div>
        <p className="text-center text-xs text-ink/50">Фото обрежется по центру в квадрат и сожмётся само.</p>
      </div>

      <div className="card flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink/70">Имя</span>
          <input
            className="input"
            value={name}
            maxLength={MAX_NAME}
            onChange={(e) => {
              setName(e.target.value)
              setSaved(false)
            }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink/70">О себе</span>
          <textarea
            className="input min-h-[96px] py-3"
            value={bio}
            maxLength={MAX_BIO}
            placeholder="Например: люблю футбол и рисовать"
            onChange={(e) => {
              setBio(e.target.value)
              setSaved(false)
            }}
          />
          <span className="text-right text-xs text-ink/50">
            {bio.length} / {MAX_BIO}
          </span>
        </label>
        <button className="btn-primary" disabled={!dirty || !nameOk || busy !== null || !online} onClick={onSave}>
          {busy === 'save' ? 'Сохраняем…' : saved ? 'Сохранено ✓' : 'Сохранить'}
        </button>
        {error && <p className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{error}</p>}
      </div>

      <div className="card flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-ink/60">Роль</span>
          <span className="font-semibold">{role === 'parent' ? 'Родитель' : 'Ребёнок'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink/60">Семья</span>
          <span className="font-semibold">{family?.name}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-ink/60">Почта</span>
          <span className="truncate font-semibold">{session?.user.email}</span>
        </div>
      </div>

      <button onClick={signOut} className="text-sm text-ink/50 underline">
        Выйти из аккаунта
      </button>
    </div>
  )
}
