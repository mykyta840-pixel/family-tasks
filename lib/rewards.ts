export interface Reward {
  id: string
  family_id: string
  title: string
  description: string | null
  icon: string
  cost: number
  active: boolean
  created_by?: string | null // кто добавил награду (профиль родителя)
}

export type RedemptionStatus = 'pending' | 'approved' | 'rejected'

export interface Redemption {
  id: string
  family_id: string
  reward_id: string | null
  child_id: string
  title: string
  icon: string
  cost: number
  status: RedemptionStatus
  reject_reason: string | null
  created_at: string
}

export interface Txn {
  id: string
  child_id: string
  amount: number
  kind: 'task' | 'reward' | 'adjust'
  title: string
  created_at: string
}

// Цвета статусов запросов; подписи берутся из переводов (red.*)
export const REDEMPTION_UI: Record<RedemptionStatus, { cls: string }> = {
  pending: { cls: 'bg-review-soft text-review' },
  approved: { cls: 'bg-ok-soft text-ok' },
  rejected: { cls: 'bg-warn-soft text-warn' },
}

const LOC: Record<string, string> = { en: 'en-GB', de: 'de-DE', ru: 'ru-RU', uk: 'uk-UA' }
export function formatWhenI18n(iso: string, lang: string): string {
  return new Date(iso).toLocaleString(LOC[lang] ?? 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
