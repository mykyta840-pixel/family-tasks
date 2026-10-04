import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { humanError } from '../lib/errors'
import { useAuth } from '../auth/AuthProvider'
import Avatar from '../components/Avatar'
import type { Role } from '../lib/types'

interface Member {
  user_id: string
  role: Role
  profiles: { display_name: string; avatar_url: string | null } | null
}

// Экран «Семья»: участники и коды приглашения
export default function FamilyHome() {
  const { family, role, signOut } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [invite, setInvite] = useState<{ role: Role; code: string } | null>(null)
  const [busy, setBusy] = useState<Role | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const familyId = family?.id

  const load = useCallback(async () => {
    if (!familyId) return
    const { data } = await supabase
      .from('family_members')
      .select('user_id, role, profiles(display_name, avatar_url)')
      .eq('family_id', familyId)
      .order('joined_at')
    if (data) setMembers(data as unknown as Member[])
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

  async function createInvite(r: Role) {
    if (busy) return
    setBusy(r)
    setError(null)
    setCopied(false)
    const { data, error } = await supabase.rpc('create_invite', { p_role: r })
    if (error) setError(humanError(error))
    else setInvite({ role: r, code: data as string })
    setBusy(null)
  }

  async function share() {
    if (!invite || !family) return
    const text = `Присоединяйся к семье «${family.name}». Код приглашения: ${invite.code}`
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
      <h1 className="font-display text-2xl font-semibold">{family?.name}</h1>

      <div className="card flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Семья</h2>
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-3">
            <Avatar name={m.profiles?.display_name ?? '?'} url={m.profiles?.avatar_url} />
            <div className="flex-1 font-medium">{m.profiles?.display_name}</div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${m.role === 'parent' ? 'bg-brand-soft text-brand' : 'bg-star-soft text-star'}`}>
              {m.role === 'parent' ? 'Родитель' : 'Ребёнок'}
            </span>
          </div>
        ))}
      </div>

      {role === 'parent' && (
        <div className="card flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Пригласить в семью</h2>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-soft px-3" disabled={busy !== null} onClick={() => createInvite('parent')}>
              Родителя
            </button>
            <button className="btn-soft px-3" disabled={busy !== null} onClick={() => createInvite('child')}>
              Ребёнка
            </button>
          </div>
          {invite && (
            <div className="rounded-2xl bg-brand-soft p-4 text-center">
              <p className="text-sm text-ink/70">Код для {invite.role === 'parent' ? 'родителя' : 'ребёнка'} (действует 7 дней, один раз)</p>
              <p className="my-2 font-display text-2xl font-semibold tracking-widest">{invite.code}</p>
              <button className="btn-primary w-full" onClick={share}>
                {copied ? 'Скопировано ✓' : 'Отправить код'}
              </button>
            </div>
          )}
          {error && <p className="rounded-2xl bg-warn-soft p-3 text-sm text-warn">{error}</p>}
        </div>
      )}

      <button onClick={signOut} className="text-sm text-ink/50 underline">
        Выйти из аккаунта
      </button>
    </div>
  )
}
