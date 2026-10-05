import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { syncPush } from '../lib/push'
import { pathFromUrl } from '../lib/pushUtil'

// Невидимый помощник: ведёт по нажатию на push и тихо поддерживает подписку устройства.
export default function PushBridge({ userId }: { userId: string }) {
  const navigate = useNavigate()

  useEffect(() => {
    const sync = () => void syncPush(userId).catch(() => undefined)
    sync()
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }
    document.addEventListener('visibilitychange', onVisible)

    const sw = 'serviceWorker' in navigator ? navigator.serviceWorker : null
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; url?: string } | null
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
  }, [userId, navigate])

  return null
}
