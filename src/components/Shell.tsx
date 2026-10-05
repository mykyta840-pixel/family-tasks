import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import Avatar from './Avatar'
import BottomNav from './BottomNav'
import NotificationBell from './NotificationBell'
import PushPrompt from './PushPrompt'
import { useOnline } from '../hooks/useOnline'
import { useI18n } from '../i18n'

export default function Shell({ children }: { children: ReactNode }) {
  const online = useOnline()
  const { t } = useI18n()
  const { profile } = useAuth()
  const { pathname } = useLocation()
  return (
    <div className="mx-auto min-h-full max-w-md px-5 pb-28 pt-6">
      {!online && (
        <div className="mb-4 rounded-2xl bg-warn-soft p-3 text-center text-sm text-warn">
          {t('common.offline')}
        </div>
      )}
      <div className="mb-2 flex items-center justify-end gap-3">
        <NotificationBell />
        {pathname !== '/profile' && (
          <Link to="/profile" aria-label={t('shell.profile')} className="rounded-full shadow-card ring-2 ring-surface active:scale-95">
            <Avatar name={profile?.display_name ?? '?'} url={profile?.avatar_url} size={40} />
          </Link>
        )}
      </div>
      <PushPrompt />
      {children}
      <BottomNav />
    </div>
  )
}
