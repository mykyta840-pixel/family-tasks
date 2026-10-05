import type { Notice } from '../data/Notifications'
import { ruT, type TFn } from '../i18n/ruT'

// Куда ведёт нажатие на уведомление
export function noticeLink(n: Notice): string {
  if (n.type.startsWith('reward')) return '/rewards'
  if (n.type === 'member_joined') return '/family'
  return '/'
}

// «только что», «5 мин назад», «вчера», «12.10». Без t отвечает по-русски (так работают тесты).
export function ago(iso: string, now = Date.now(), t: TFn = ruT): string {
  const ms = new Date(iso).getTime()
  const min = Math.max(0, Math.round((now - ms) / 60000))
  if (min < 1) return t('ago.now')
  if (min < 60) return t('ago.min', { n: min })
  const hours = Math.floor(min / 60)
  if (hours < 24) return t('ago.hours', { n: hours })
  const days = Math.floor(hours / 24)
  if (days === 1) return t('ago.yesterday')
  if (days < 7) return t('ago.days', { n: days })
  const d = new Date(ms)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}
