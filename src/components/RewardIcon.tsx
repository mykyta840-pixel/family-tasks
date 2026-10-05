import { Bike, Blocks, Candy, Clapperboard, Gamepad2, Gift, IceCreamCone, PartyPopper, Palette, Pizza, Smartphone, Trophy, type LucideIcon } from 'lucide-react'

// В базе иконка награды хранится как emoji (так выбрал родитель). Показываем её единым набором Lucide.
const MAP: Record<string, LucideIcon> = {
  '🎮': Gamepad2, '🍫': Candy, '🎬': Clapperboard, '🍕': Pizza, '🍦': IceCreamCone, '🧸': Blocks,
  '🎢': PartyPopper, '📱': Smartphone, '🚲': Bike, '⚽': Trophy, '🎨': Palette, '🎁': Gift,
}

export default function RewardIcon({ icon, size = 24, className = '' }: { icon: string; size?: number; className?: string }) {
  const Icon = MAP[icon] ?? Gift
  return <Icon size={size} className={className} aria-hidden />
}
