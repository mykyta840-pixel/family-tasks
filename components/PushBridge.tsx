import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { markPushTestDone, syncPush } from '../lib/push'
import { PUSH_TEST_DONE_EVENT, isPushTestTag, pathFromUrl } from '../lib/pushUtil'

// Невидимый помощник: ведёт по нажатию на push и тихо поддерживает подписку устройства.
export default function PushBridge({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const { refresh, profile } = useAuth()
  const done = Boolean(profile?.push_test_done_at)

  useEffect(() => {
    const sync = () => void syncPush(userId).catch(() => undefined)
    sync()
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }
    document.addEventListener('visibilitychange', onVisible)

    const sw = 'serviceWorker' in navigator ? navigator.serviceWorker : null
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; url?: string; tag?: string } | null
      // Тестовое уведомление реально показано на устройстве: фиксируем успех в базе
      if (d?.type === 'push-received' && isPushTestTag(d.tag) && !done) {
        void markPushTestDone()
          .then(() => refresh())
          .then(() => window.dispatchEvent(new Event(PUSH_TEST_DONE_EVENT)))
          .catch(() => undefined)
      }
      if (d?.type === 'push-resubscribe') sync()
      if (d?.type === 'push-open' && d.url) {
        const path = pathFromUrl(d.url, window.location.origin)
        if (path) navigate(path)
      }
    }
    sw?.addEventListener('message', onMessage)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      sw?.removeEventListener('message', onMessage)
    }
  }, [userId, navigate, refresh, done])

  return null
}
