import {
  Banknote, Bike, BookOpen, Camera, CakeSlice, Candy, Clapperboard, Coffee, Gamepad2, Gift, Headphones, IceCreamCone,
  Moon, Music, Palette, PartyPopper, Pizza, Plane, Popcorn, Shirt, Smartphone, Ticket, Trophy, Tv, Waves, Blocks, Dribbble,
  type LucideIcon,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { REWARD_GROUP_OF, REWARD_GROUP_RGB, resolveRewardIcon, type RewardIconKey } from '../lib/rewardIconKeys'

// Record по всем ключам: TypeScript не даст забыть иконку для нового ключа
export const REWARD_ICON_COMPONENT: Record<RewardIconKey, LucideIcon> = {
  gamepad: Gamepad2, movie: Clapperboard, popcorn: Popcorn, tv: Tv, music: Music, art: Palette, toy: Blocks,
  candy: Candy, pizza: Pizza, icecream: IceCreamCone, cake: CakeSlice, cafe: Coffee,
  trip: Plane, park: PartyPopper, bike: Bike, ball: Dribbble, swim: Waves, ticket: Ticket, camera: Camera,
  phone: Smartphone, headphones: Headphones, book: BookOpen, clothes: Shirt, money: Banknote, gift: Gift,
  sleep: Moon, trophy: Trophy,
}

// Простая иконка без плитки (в списках). Принимает ключ или старое emoji.
export default function RewardIcon({ icon, size = 24, className = '' }: { icon: string; size?: number; className?: string }) {
  const Icon = REWARD_ICON_COMPONENT[resolveRewardIcon(icon)]
  return <Icon size={size} className={className} aria-hidden />
}

// Неоновая стеклянная плитка (тот же стиль, что у заданий)
export function RewardIconTile({ icon, className = '', iconSize = 24, selected = false }: { icon?: string | null; className?: string; iconSize?: number; selected?: boolean }) {
  const key = resolveRewardIcon(icon)
  const rgb = REWARD_GROUP_RGB[REWARD_GROUP_OF[key]]
  const Icon = REWARD_ICON_COMPONENT[key]
  const style: CSSProperties = {
    background: `linear-gradient(145deg, rgb(${rgb} / .30), rgb(${rgb} / .08))`,
    boxShadow: `inset 0 0 0 1px rgb(${rgb} / ${selected ? '.9' : '.38'}), 0 0 ${selected ? 26 : 18}px -5px rgb(${rgb} / ${selected ? '.9' : '.6'})`,
    color: `rgb(${rgb})`,
  }
  return (
    <div className={`grid shrink-0 place-items-center ${className}`} style={style} aria-hidden>
      <Icon size={iconSize} strokeWidth={2} style={{ filter: `drop-shadow(0 0 6px rgb(${rgb} / .7))` }} />
    </div>
  )
}
