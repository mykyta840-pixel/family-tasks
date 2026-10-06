import { Gem } from 'lucide-react'

// Единый значок валюты приложения (кристалл). Чтобы сменить валюту, достаточно заменить иконку здесь
// и слова в переводах (common.points, *.points и т.д.).
export default function Coin({ size = 14, className }: { size?: number; className?: string }) {
  return <Gem size={size} fill="currentColor" fillOpacity={0.3} strokeWidth={2} className={className} aria-hidden />
}
