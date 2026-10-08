// Edge Function «send-push»: получает id нового уведомления от базы и рассылает его
// на все устройства получателя (Web Push). Секреты задаются в Supabase -> Edge Functions -> Secrets.
// Выключите «Verify JWT» для этой функции: доступ защищён секретом x-webhook-secret.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { TEXTS, fill, isLang } from './texts.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// Куда ведёт нажатие на push (как noticeLink в приложении)
function linkFor(type: string, data: Record<string, unknown> | null): string {
  if (type.startsWith('reward')) return '/rewards'
  if (type === 'member_joined' || type === 'member_returned') return '/family'
  const taskId = data && typeof data.task_id === 'string' ? data.task_id : null
  if (taskId && ['task_new', 'task_reminder', 'task_rejected', 'task_approved'].includes(type)) return `/?task=${taskId}`
  return '/'
}

type Db = ReturnType<typeof createClient>
interface Row { id: string; user_id: string; type: string; title: string; body: string | null; data: Record<string, unknown> | null }

// Текст на языке получателя. В базе уведомления написаны по-русски; здесь собираем фразу заново
// по данным задания/награды. Если чего-то не нашли — отправляем текст из базы, как раньше.
async function localize(db: Db, n: Row): Promise<{ title: string; body: string }> {
  const fallback = { title: n.title, body: n.body ?? '' }
  try {
    const { data: prof } = await db.from('profiles').select('language').eq('id', n.user_id).maybeSingle()
    const lang = prof?.language
    if (!isLang(lang)) return fallback
    const T = TEXTS[lang]
    const d = n.data ?? {}
    const sid = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : null)
    const reason = (r: string | null | undefined) => (r && r.trim() ? `: ${r.trim()}` : '')
    const name = async (id: string) => (await db.from('profiles').select('display_name').eq('id', id).maybeSingle()).data?.display_name as string | undefined
    const out = (key: string, vars: Record<string, string | number>) => ({ title: fill(T[`${key}.t`], vars), body: fill(T[`${key}.b`], vars) })

    if (['task_new', 'task_submitted', 'task_approved', 'task_rejected'].includes(n.type) && sid('task_id')) {
      const { data: t } = await db.from('tasks').select('title, points, assigned_to, reject_reason').eq('id', sid('task_id')!).maybeSingle()
      if (!t) return fallback
      const vars: Record<string, string | number> = { title: t.title, points: t.points, reason: reason(t.reject_reason) }
      if (n.type === 'task_submitted') {
        const nm = await name(t.assigned_to)
        if (!nm) return fallback
        vars.name = nm
      }
      return out(n.type, vars)
    }
    if (['reward_requested', 'reward_approved', 'reward_rejected'].includes(n.type) && sid('redemption_id')) {
      const { data: r } = await db.from('reward_redemptions').select('title, cost, child_id, reject_reason').eq('id', sid('redemption_id')!).maybeSingle()
      if (!r) return fallback
      const vars: Record<string, string | number> = { title: r.title, cost: r.cost, reason: reason(r.reject_reason) }
      if (n.type === 'reward_requested') {
        const nm = await name(r.child_id)
        if (!nm) return fallback
        vars.name = nm
      }
      return out(n.type, vars)
    }
    if (n.type === 'member_joined' && sid('user_id')) {
      const nm = await name(sid('user_id')!)
      const { data: m } = await db.from('family_members').select('role').eq('user_id', sid('user_id')!).maybeSingle()
      if (!nm || !m) return fallback
      return { title: fill(T['member_joined.t'], { name: nm }), body: T[m.role === 'child' ? 'member_joined.child' : 'member_joined.parent'] }
    }
    if (n.type === 'member_returned' && sid('user_id')) {
      const nm = await name(sid('user_id')!)
      if (!nm) return fallback
      return { title: fill(T['member_returned.t'], { name: nm }), body: T['member_returned.b'] }
    }
  } catch (e) {
    console.error('localize failed', (e as Error).message)
  }
  return fallback
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  const secret = Deno.env.get('PUSH_WEBHOOK_SECRET')
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return json({ error: 'forbidden' }, 403)

  const pub = Deno.env.get('VAPID_PUBLIC_KEY')
  const priv = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!pub || !priv) return json({ error: 'vapid_not_configured' }, 500)
  try {
    webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com', pub, priv)
  } catch (e) {
    // Неверный VAPID_SUBJECT (нужен mailto:... или https://...) или испорченные ключи: понятная причина в ответе
    console.error('vapid invalid', (e as Error).message)
    return json({ error: 'vapid_invalid', message: (e as Error).message }, 500)
  }

  let id: string | undefined
  try {
    id = (await req.json())?.id
  } catch { /* ниже вернём ошибку */ }
  if (!id) return json({ error: 'no_id' }, 400)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const { data: n } = await db
    .from('notifications')
    .select('id, user_id, type, title, body, data, created_at')
    .eq('id', id)
    .maybeSingle()
  if (!n) return json({ error: 'not_found' }, 404)
  // защита от повторной отправки старых уведомлений
  if (Date.now() - new Date(n.created_at).getTime() > 10 * 60 * 1000) return json({ skipped: 'old' })

  const { data: subs } = await db
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', n.user_id)
  if (!subs?.length) return json({ sent: 0 })

  const text = await localize(db, n as Row)
  const payload = JSON.stringify({
    title: text.title,
    body: text.body,
    url: linkFor(n.type, n.data),
    tag: `${n.type}:${(n.data as { task_id?: string } | null)?.task_id ?? n.id}`,
    nid: n.id,
  })

  const dead: string[] = []
  const failed: { status: number | null; message: string }[] = []
  let sent = 0
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60 * 24,
          urgency: 'high',
        })
        sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) dead.push(s.id) // устройство отписалось
        else {
          // 401/403 обычно значит «ключ VAPID в приложении и в функции разные»; остальное — сбой сети или сервиса push
          console.error('push failed', code, (e as Error).message)
          failed.push({ status: code ?? null, message: (e as Error).message.slice(0, 120) })
        }
      }
    }),
  )
  if (dead.length) await db.from('push_subscriptions').delete().in('id', dead)
  return json({ sent, removed: dead.length, failed: failed.length, failures: failed.slice(0, 3) })
})
