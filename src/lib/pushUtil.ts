// Публичный VAPID-ключ (base64url) -> байты для pushManager.subscribe
export function urlBase64ToUint8Array(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

// Путь + параметры из полной ссылки (для перехода по нажатию на push)
export function pathFromUrl(url: string, origin: string): string | null {
  try {
    const u = new URL(url, origin)
    return u.origin === origin ? `${u.pathname}${u.search}` : null
  } catch {
    return null
  }
}

// Тестовое уведомление: тег у push вида "push_test:<id>"; после его показа устройство подтверждает тест
export const PUSH_TEST_TAG = 'push_test'
export const PUSH_TEST_DONE_EVENT = 'ft:push-test-done'
export const isPushTestTag = (tag: unknown) => typeof tag === 'string' && tag.startsWith(`${PUSH_TEST_TAG}:`)
