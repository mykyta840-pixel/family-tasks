import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import Avatar from './Avatar'
import BottomNav from './BottomNav'
import NotificationBell from './NotificationBell'
import { useOnline } from '../hooks/useOnline'

export default function Shell({ children }: { children: ReactNode }) {
  const online = useOnline()
  const { profile } = useAuth()
  const { pathname } = useLocation()
  return (
    <div className="mx-auto min-h-full max-w-md px-5 pb-28 pt-6">
      {!online && (
        <div className="mb-4 rounded-2xl bg-warn-soft p-3 text-center text-sm text-warn">
          Нет связи. Данные обновятся, когда интернет вернётся.
        </div>
      )}
      <div className="mb-2 flex items-center justify-end gap-3">
        <NotificationBell />
        {pathname !== '/profile' && (
          <Link to="/profile" aria-label="Мой профиль" className="rounded-full shadow-card ring-2 ring-white active:scale-95">
            <Avatar name={profile?.display_name ?? '?'} url={profile?.avatar_url} size={40} />
          </Link>
        )}
      </div>
      {children}
      <BottomNav />
    </div>
  )
}
