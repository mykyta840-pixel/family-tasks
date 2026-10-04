export interface Reward {
  id: string
  family_id: string
  title: string
  description: string | null
  icon: string
  cost: number
  active: boolean
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

export const ICONS = ['🎮', '🍫', '🎬', '🍕', '🍦', '🧸', '🎢', '📱', '🚲', '⚽', '🎨', '🎁']

export const REDEMPTION_UI: Record<RedemptionStatus, { label: string; cls: string }> = {
  pending: { label: 'Ждёт родителя', cls: 'bg-review-soft text-review' },
  approved: { label: 'Выдано', cls: 'bg-ok-soft text-ok' },
  rejected: { label: 'Отказано', cls: 'bg-warn-soft text-warn' },
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
