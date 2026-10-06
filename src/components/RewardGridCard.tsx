import { memo } from 'react'
import { motion } from 'framer-motion'
import { EyeOff, Hourglass } from 'lucide-react'
import Coin from './Coin'
import { RewardIconTile } from './RewardIcon'
import { REWARD_GROUP_OF, REWARD_GROUP_RGB, resolveRewardIcon } from '../lib/rewardIconKeys'
import type { Reward } from '../lib/rewards'
import { useI18n } from '../i18n'

// Квадратная неоновая карточка награды (родитель и ребёнок). Для ребёнка можно передать прогресс накопления.
function RewardGridCard({ reward, index, onOpen, available, requested }: { reward: Reward; index: number; onOpen: () => void; available?: number; requested?: boolean }) {
  const { t } = useI18n()
  const rgb = REWARD_GROUP_RGB[REWARD_GROUP_OF[resolveRewardIcon(reward.icon)]]
  const child = available !== undefined
  const missing = child ? reward.cost - available : 0
  const pct = child ? Math.min(100, Math.round((Math.max(available, 0) / reward.cost) * 100)) : 0
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      aria-label={reward.title}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: reward.active ? 1 : 0.6, y: 0 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.22, delay: Math.min(index, 8) * 0.03 }}
      className="glass relative flex aspect-square min-h-[168px] min-w-0 flex-col gap-2 overflow-hidden rounded-card p-3 text-left"
      style={{ boxShadow: `0 0 0 1px rgb(${rgb} / .4), 0 0 22px -6px rgb(${rgb} / .6)` }}
    >
      <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl" style={{ background: `rgb(${rgb} / .22)` }} />
      <div className="relative flex items-start justify-between gap-2">
        <RewardIconTile icon={reward.icon} className="h-10 w-10 rounded-xl" iconSize={22} />
        {!reward.active && (
          <span title={t('rew.hidden')} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink/10 text-ink/60">
            <EyeOff size={15} aria-hidden /><span className="sr-only">{t('rew.hidden')}</span>
          </span>
        )}
        {requested && (
          <span title={t('shop.requested')} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-review-soft text-review">
            <Hourglass size={15} aria-hidden /><span className="sr-only">{t('shop.requested')}</span>
          </span>
        )}
      </div>
      <h3 className="relative line-clamp-2 break-words text-[15px] font-semibold leading-tight">{reward.title}</h3>
      <div className="relative mt-auto flex min-w-0 flex-col gap-1.5 text-xs">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-star-soft px-2.5 py-0.5 font-display text-sm font-semibold text-star">
          <Coin size={12} /> {reward.cost}
        </span>
        {child && !requested && (
          <>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `rgb(${rgb})` }} />
            </div>
            <span className={missing > 0 ? 'truncate text-ink/60' : 'truncate font-medium text-ok'}>
              {missing > 0 ? t('shop.need', { n: missing }) : t('shop.get')}
            </span>
          </>
        )}
      </div>
    </motion.button>
  )
}

export default memo(RewardGridCard)
