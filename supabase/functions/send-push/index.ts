// Edge Function «send-push»: получает id нового уведомления от базы и рассылает его
// на все устройства получателя (Web Push). Секреты задаются в Supabase -> Edge Functions -> Secrets.
// Выключите «Verify JWT» для этой функции: доступ защищён секретом x-webhook-secret.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

// Куда ведёт нажатие на push (как noticeLink в приложении)
function linkFor(type: string, data: Record<string, unknown> | null): string {
  if (type.startsWith('reward')) return '/rewards'
  if (type === 'member_joined') return '/family'
  const taskId = data && typeof data.task_id === 'string' ? data.task_id : null
  if (taskId && ['task_new', 'task_reminder', 'task_rejected', 'task_approved'].includes(type)) return `/?task=${taskId}`
  return '/'
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  const secret = Deno.env.get('PUSH_WEBHOOK_SECRET')
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return json({ error: 'forbidden' }, 403)

  const pub = Deno.env.get('VAPID_PUBLIC_KEY')
  const priv = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!pub || !priv) return json({ error: 'vapid_not_configured' }, 500)
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com', pub, priv)

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

  const payload = JSON.stringify({
    title: n.title,
    body: n.body ?? '',
    url: linkFor(n.type, n.data),
    tag: `${n.type}:${(n.data as { task_id?: string } | null)?.task_id ?? n.id}`,
    nid: n.id,
  })

  const dead: string[] = []
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
        else console.error('push failed', code, (e as Error).message)
      }
    }),
  )
  if (dead.length) await db.from('push_subscriptions').delete().in('id', dead)
  return json({ sent, removed: dead.length })
})
