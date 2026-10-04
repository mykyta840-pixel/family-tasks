import type { Notice } from '../data/Notifications'

// Куда ведёт нажатие на уведомление
export function noticeLink(n: Notice): string {
  if (n.type.startsWith('reward')) return '/rewards'
  if (n.type === 'member_joined') return '/family'
  return '/'
}

// «только что», «5 мин назад», «вчера», «12.10»
export function ago(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime()
  const min = Math.max(0, Math.round((now - t) / 60000))
  if (min < 1) return 'только что'
  if (min < 60) return `${min} мин назад`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'вчера'
  if (days < 7) return `${days} дн. назад`
  const d = new Date(t)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}
