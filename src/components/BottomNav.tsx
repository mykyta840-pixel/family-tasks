import { NavLink } from 'react-router-dom'
import { Gift, Home, ListChecks, Users } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n'

export default function BottomNav() {
  const { role } = useAuth()
  const { t } = useI18n()
  const items = [
    { to: '/', label: t('nav.home'), icon: Home, end: true },
    ...(role === 'parent' ? [{ to: '/tasks', label: t('nav.tasks'), icon: ListChecks, end: false }] : []),
    { to: '/rewards', label: t('nav.rewards'), icon: Gift, end: false },
    { to: '/family', label: t('nav.family'), icon: Users, end: false },
  ]
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 border-t border-ink/10 bg-surface/80 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
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
