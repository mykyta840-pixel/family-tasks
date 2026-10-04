import { NavLink } from 'react-router-dom'
import { Gift, Home, ListChecks, Users } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'

export default function BottomNav() {
  const { role } = useAuth()
  const items = [
    { to: '/', label: 'Главная', icon: Home, end: true },
    ...(role === 'parent' ? [{ to: '/tasks', label: 'Задания', icon: ListChecks, end: false }] : []),
    { to: '/rewards', label: 'Награды', icon: Gift, end: false },
    { to: '/family', label: 'Семья', icon: Users, end: false },
  ]
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 border-t border-ink/10 bg-white/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold ${
                isActive ? 'text-brand' : 'text-ink/50'
              }`
            }
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
